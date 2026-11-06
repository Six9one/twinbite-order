-- ============================================================================
-- NF525 / loi anti-fraude TVA : étapes 3 à 5
--   3. Tickets fiscaux : chaque vente encaissée crée un ticket numéroté sans trou,
--      chaîné au précédent par SHA-256 (montant TTC, TVA par taux, paiement).
--   4. Avoirs : annuler une vente encaissée ne modifie pas le ticket d'origine,
--      cela crée un ticket AVOIR négatif, chaîné lui aussi.
--   5. Clôtures : Z journalier figé (+ mensuel, annuel) avec Grand Total perpétuel
--      qui ne revient jamais à zéro, chaîné et non modifiable.
--   + fiscal_verify_all() : recalcule toutes les empreintes et tous les totaux.
--
-- Prérequis : 20261106000000_nf525_etape1_2_verrouillage.sql
-- Ce script ne crée aucun ticket pour les commandes passées : la chaîne démarre
-- à la première vente encaissée après son application.
-- ============================================================================

-- ── Taux de TVA ─────────────────────────────────────────────────────────────
-- Aujourd'hui tout est à 10 % (comme calculateTVA côté caisse). Si une ligne de
-- panier porte un champ "vat_rate", il est utilisé. Taux à confirmer par le comptable.
CREATE OR REPLACE FUNCTION public.fiscal_default_vat_rate()
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$ SELECT 10.0::numeric $$;

-- Ventilation TVA d'un montant TTC : {"10.0": {"ttc": .., "ht": .., "tva": ..}}
-- Si les lignes portent un vat_rate, le TTC est réparti au prorata des lignes.
CREATE OR REPLACE FUNCTION public.fiscal_vat_breakdown(p_items JSONB, p_total_ttc NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_lines   JSONB := '{}'::jsonb;
  v_sum     NUMERIC := 0;
  v_rate    TEXT;
  v_line    NUMERIC;
  v_out     JSONB := '{}'::jsonb;
  v_ttc     NUMERIC;
  v_ht      NUMERIC;
  v_left    NUMERIC := round(p_total_ttc, 2);
  v_keys    TEXT[];
  i         INT;
  it        JSONB;
BEGIN
  IF jsonb_typeof(p_items) = 'array' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      v_rate := to_char(coalesce(NULLIF(it->>'vat_rate', '')::numeric, public.fiscal_default_vat_rate()), 'FM990.0');
      v_line := coalesce(NULLIF(it->>'calculatedPrice', '')::numeric, NULLIF(it#>>'{item,price}', '')::numeric, NULLIF(it->>'price', '')::numeric, 0)
              * coalesce(NULLIF(it->>'quantity', '')::numeric, 1);
      v_lines := jsonb_set(v_lines, ARRAY[v_rate], to_jsonb(coalesce((v_lines->>v_rate)::numeric, 0) + v_line));
      v_sum := v_sum + v_line;
    END LOOP;
  END IF;

  IF v_lines = '{}'::jsonb OR v_sum = 0 THEN
    v_lines := jsonb_build_object(to_char(public.fiscal_default_vat_rate(), 'FM990.0'), 1);
    v_sum := 1;
  END IF;

  SELECT array_agg(k ORDER BY k) INTO v_keys FROM jsonb_object_keys(v_lines) k;
  FOR i IN 1 .. array_length(v_keys, 1) LOOP
    IF i = array_length(v_keys, 1) THEN
      v_ttc := v_left;                       -- le dernier taux prend l'arrondi
    ELSE
      v_ttc := round(p_total_ttc * (v_lines->>v_keys[i])::numeric / v_sum, 2);
      v_left := v_left - v_ttc;
    END IF;
    v_ht := round(v_ttc / (1 + v_keys[i]::numeric / 100), 2);
    v_out := v_out || jsonb_build_object(v_keys[i], jsonb_build_object('ttc', v_ttc, 'ht', v_ht, 'tva', v_ttc - v_ht));
  END LOOP;
  RETURN v_out;
END;
$$;

-- Additionne deux ventilations TVA
CREATE OR REPLACE FUNCTION public.fiscal_vat_add(a JSONB, b JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_object_agg(k, jsonb_build_object(
           'ttc', coalesce((a#>>ARRAY[k,'ttc'])::numeric, 0) + coalesce((b#>>ARRAY[k,'ttc'])::numeric, 0),
           'ht',  coalesce((a#>>ARRAY[k,'ht'])::numeric, 0)  + coalesce((b#>>ARRAY[k,'ht'])::numeric, 0),
           'tva', coalesce((a#>>ARRAY[k,'tva'])::numeric, 0) + coalesce((b#>>ARRAY[k,'tva'])::numeric, 0))), '{}'::jsonb)
  FROM (SELECT jsonb_object_keys(coalesce(a, '{}'::jsonb)) k
        UNION SELECT jsonb_object_keys(coalesce(b, '{}'::jsonb))) keys;
$$;

-- Ventilation inversée (pour un avoir)
CREATE OR REPLACE FUNCTION public.fiscal_vat_negate(a JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_object_agg(k, jsonb_build_object(
           'ttc', -(a#>>ARRAY[k,'ttc'])::numeric,
           'ht',  -(a#>>ARRAY[k,'ht'])::numeric,
           'tva', -(a#>>ARRAY[k,'tva'])::numeric)), '{}'::jsonb)
  FROM jsonb_object_keys(coalesce(a, '{}'::jsonb)) k;
$$;

CREATE OR REPLACE FUNCTION public.fiscal_ts(t TIMESTAMPTZ)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(t AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

-- ── 3. Tickets fiscaux ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_tickets (
  ticket_number     BIGINT PRIMARY KEY,
  ticket_type       TEXT NOT NULL CHECK (ticket_type IN ('VENTE', 'AVOIR')),
  created_at        TIMESTAMPTZ NOT NULL,
  order_id          UUID NOT NULL,
  order_number      TEXT NOT NULL,
  ref_ticket_number BIGINT REFERENCES public.fiscal_tickets(ticket_number),
  order_type        TEXT,
  total_ttc         NUMERIC(12, 2) NOT NULL,
  total_ht          NUMERIC(12, 2) NOT NULL,
  total_tva         NUMERIC(12, 2) NOT NULL,
  vat_breakdown     JSONB NOT NULL,
  payment_cash      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_card      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_online    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  items_hash        TEXT NOT NULL,
  reason            TEXT,
  actor             TEXT NOT NULL,
  grand_total_ttc   NUMERIC(14, 2) NOT NULL,  -- cumul perpétuel de tous les tickets
  prev_hash         TEXT NOT NULL,
  hash              TEXT NOT NULL UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_tickets_vente ON public.fiscal_tickets(order_id) WHERE ticket_type = 'VENTE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_tickets_avoir ON public.fiscal_tickets(ref_ticket_number) WHERE ticket_type = 'AVOIR';
CREATE INDEX IF NOT EXISTS idx_fiscal_tickets_created ON public.fiscal_tickets(created_at);

-- Texte canonique d'un ticket : la même fonction sert à l'écriture et à la vérification.
CREATE OR REPLACE FUNCTION public.fiscal_ticket_payload(t public.fiscal_tickets)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT concat_ws('|',
    t.prev_hash, t.ticket_number::text, t.ticket_type, public.fiscal_ts(t.created_at),
    t.order_id::text, t.order_number, coalesce(t.ref_ticket_number::text, ''), coalesce(t.order_type, ''),
    to_char(t.total_ttc, 'FM9999999999990.00'), to_char(t.total_ht, 'FM9999999999990.00'),
    to_char(t.total_tva, 'FM9999999999990.00'), t.vat_breakdown::text,
    to_char(t.payment_cash, 'FM9999999999990.00'), to_char(t.payment_card, 'FM9999999999990.00'),
    to_char(t.payment_online, 'FM9999999999990.00'), to_char(t.discount_amount, 'FM9999999999990.00'),
    t.items_hash, coalesce(t.reason, ''), t.actor, to_char(t.grand_total_ttc, 'FM999999999999990.00'));
$$;

-- Crée un ticket (VENTE ou AVOIR), numéroté et chaîné. Appelé uniquement par les triggers.
CREATE OR REPLACE FUNCTION public.fiscal_create_ticket(
  p_type TEXT, o public.orders, p_ref BIGINT, p_reason TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev   public.fiscal_tickets;
  t        public.fiscal_tickets;
  v_orig   public.fiscal_tickets;
  v_pay    RECORD;
BEGIN
  -- Un seul écrivain à la fois : numéros sans trou et chaîne linéaire.
  PERFORM pg_advisory_xact_lock(hashtext('fiscal_tickets_chain'));
  SELECT * INTO v_prev FROM public.fiscal_tickets ORDER BY ticket_number DESC LIMIT 1;

  t.ticket_number := coalesce(v_prev.ticket_number, 0) + 1;
  t.ticket_type   := p_type;
  t.created_at    := clock_timestamp();
  t.order_id      := o.id;
  t.order_number  := o.order_number;
  t.order_type    := o.order_type::text;
  t.actor         := coalesce(auth.uid()::text, current_user);
  t.reason        := p_reason;
  t.prev_hash     := coalesce(v_prev.hash, repeat('0', 64));

  IF p_type = 'AVOIR' THEN
    -- L'avoir reprend exactement les montants du ticket d'origine, en négatif.
    SELECT * INTO v_orig FROM public.fiscal_tickets WHERE ticket_number = p_ref;
    t.ref_ticket_number := p_ref;
    t.total_ttc       := -v_orig.total_ttc;
    t.total_ht        := -v_orig.total_ht;
    t.total_tva       := -v_orig.total_tva;
    t.vat_breakdown   := public.fiscal_vat_negate(v_orig.vat_breakdown);
    t.payment_cash    := -v_orig.payment_cash;
    t.payment_card    := -v_orig.payment_card;
    t.payment_online  := -v_orig.payment_online;
    t.discount_amount := -v_orig.discount_amount;
    t.items_hash      := v_orig.items_hash;
  ELSE
    t.total_ttc     := round(o.total, 2);
    t.vat_breakdown := public.fiscal_vat_breakdown(o.items, t.total_ttc);
    SELECT sum((v->>'ht')::numeric) AS ht, sum((v->>'tva')::numeric) AS tva
      INTO v_pay FROM jsonb_each(t.vat_breakdown) AS e(k, v);
    t.total_ht  := v_pay.ht;
    t.total_tva := v_pay.tva;
    IF o.payment_method::text = 'en_ligne' THEN
      t.payment_online := t.total_ttc; t.payment_cash := 0; t.payment_card := 0;
    ELSIF o.payment_cash IS NOT NULL OR o.payment_card IS NOT NULL THEN
      t.payment_cash := coalesce(o.payment_cash, 0); t.payment_card := coalesce(o.payment_card, 0); t.payment_online := 0;
    ELSIF o.payment_method::text = 'cb' THEN
      t.payment_card := t.total_ttc; t.payment_cash := 0; t.payment_online := 0;
    ELSE
      t.payment_cash := t.total_ttc; t.payment_card := 0; t.payment_online := 0;
    END IF;
    t.discount_amount := coalesce(o.discount_amount, 0);
    t.items_hash := encode(extensions.digest(coalesce(o.items::text, ''), 'sha256'), 'hex');
  END IF;

  t.grand_total_ttc := coalesce(v_prev.grand_total_ttc, 0) + t.total_ttc;
  t.hash := encode(extensions.digest(public.fiscal_ticket_payload(t), 'sha256'), 'hex');

  INSERT INTO public.fiscal_tickets VALUES (t.*);

  PERFORM public.fiscal_log_event('TICKET_' || p_type, o.id, o.order_number,
    jsonb_build_object('ticket_number', t.ticket_number, 'total_ttc', t.total_ttc, 'hash', t.hash, 'ref', p_ref));
  RETURN t.ticket_number;
END;
$$;

REVOKE ALL ON FUNCTION public.fiscal_create_ticket(TEXT, public.orders, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;

-- Ticket VENTE quand une commande devient encaissée ; AVOIR quand on l'annule.
CREATE OR REPLACE FUNCTION public.orders_fiscal_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_vente BIGINT;
  v_reason TEXT;
BEGIN
  -- Vente : à l'insertion d'une commande déjà encaissée (caisse), ou au moment
  -- où une commande borne / site est encaissée (paid_at rempli).
  IF public.order_is_fiscally_locked(NEW)
     AND (TG_OP = 'INSERT' OR NOT public.order_is_fiscally_locked(OLD))
     AND NOT EXISTS (SELECT 1 FROM public.fiscal_tickets WHERE order_id = NEW.id AND ticket_type = 'VENTE') THEN
    -- Une commande annulée avant encaissement ne crée pas de vente.
    IF NEW.status IS DISTINCT FROM 'cancelled' THEN
      PERFORM public.fiscal_create_ticket('VENTE', NEW, NULL, NULL);
    END IF;
  END IF;

  -- Avoir : annulation d'une vente qui a un ticket.
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    SELECT ticket_number INTO v_vente FROM public.fiscal_tickets
      WHERE order_id = NEW.id AND ticket_type = 'VENTE';
    IF v_vente IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.fiscal_tickets WHERE ref_ticket_number = v_vente AND ticket_type = 'AVOIR') THEN
      -- Motif = ce qui a été ajouté aux notes au moment de l'annulation
      v_reason := nullif(btrim(substr(coalesce(NEW.customer_notes, ''), length(coalesce(OLD.customer_notes, '')) + 1)), '');
      PERFORM public.fiscal_create_ticket('AVOIR', NEW, v_vente, coalesce(v_reason, 'Annulation sans motif'));
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_fiscal_tickets ON public.orders;
CREATE TRIGGER trg_orders_fiscal_tickets
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_fiscal_tickets();

-- Une vente annulée par avoir ne peut pas être « désannulée » : il faut la refaire.
CREATE OR REPLACE FUNCTION public.orders_no_uncancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled'
     AND EXISTS (SELECT 1 FROM public.fiscal_tickets WHERE order_id = OLD.id AND ticket_type = 'AVOIR') THEN
    RAISE EXCEPTION 'Commande #% : annulée par avoir, elle ne peut pas être réactivée. Refaites la vente en caisse (NF525).', OLD.order_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_no_uncancel ON public.orders;
CREATE TRIGGER trg_orders_no_uncancel
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_no_uncancel();

-- Annuler (ou « modifier ») une vente encaissée : jamais d'UPDATE des montants.
-- Passe la commande en annulée avec un motif → le trigger crée l'avoir chaîné.
-- Pour une modification : annuler ici, puis refaire la vente corrigée en caisse.
CREATE OR REPLACE FUNCTION public.fiscal_cancel_order(p_order_id UUID, p_reason TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  o public.orders;
  v_avoir BIGINT;
BEGIN
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Motif d''annulation obligatoire';
  END IF;
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.status = 'cancelled' THEN RAISE EXCEPTION 'Commande #% déjà annulée', o.order_number; END IF;

  UPDATE public.orders
     SET status = 'cancelled',
         customer_notes = coalesce(customer_notes, '') ||
           CASE WHEN coalesce(customer_notes, '') = '' THEN '' ELSE E'\n' END ||
           '[ANNULÉ ' || to_char(now() AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY HH24:MI') || '] ' || btrim(p_reason),
         updated_at = now()
   WHERE id = p_order_id;

  SELECT t.ticket_number INTO v_avoir FROM public.fiscal_tickets t
    JOIN public.fiscal_tickets v ON v.ticket_number = t.ref_ticket_number
   WHERE v.order_id = p_order_id AND t.ticket_type = 'AVOIR';
  RETURN v_avoir;  -- NULL si la commande n'était pas encore encaissée
END;
$$;

-- ── 5. Clôtures (Z) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_closures (
  id                BIGSERIAL PRIMARY KEY,
  closure_type      TEXT NOT NULL CHECK (closure_type IN ('J', 'M', 'A')),  -- jour, mois, année
  closure_number    BIGINT NOT NULL,       -- numéro sans trou par type
  created_at        TIMESTAMPTZ NOT NULL,
  business_date     DATE NOT NULL,         -- jour (J), 1er du mois (M), 1er janvier (A)
  first_ticket      BIGINT,                -- J : premier ticket inclus ; M/A : premier Z inclus
  last_ticket       BIGINT,                -- J : dernier ticket inclus  ; M/A : dernier Z inclus
  ticket_count      INTEGER NOT NULL,
  sales_ttc         NUMERIC(14, 2) NOT NULL,
  avoirs_ttc        NUMERIC(14, 2) NOT NULL,
  net_ttc           NUMERIC(14, 2) NOT NULL,
  net_ht            NUMERIC(14, 2) NOT NULL,
  net_tva           NUMERIC(14, 2) NOT NULL,
  vat_breakdown     JSONB NOT NULL,
  payment_cash      NUMERIC(14, 2) NOT NULL,
  payment_card      NUMERIC(14, 2) NOT NULL,
  payment_online    NUMERIC(14, 2) NOT NULL,
  discount_amount   NUMERIC(14, 2) NOT NULL,
  grand_total_ttc   NUMERIC(16, 2) NOT NULL, -- Grand Total perpétuel de ce type, jamais remis à zéro
  actor             TEXT NOT NULL,
  prev_hash         TEXT NOT NULL,
  hash              TEXT NOT NULL UNIQUE,
  UNIQUE (closure_type, closure_number)
);

CREATE OR REPLACE FUNCTION public.fiscal_closure_payload(c public.fiscal_closures)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT concat_ws('|',
    c.prev_hash, c.closure_type, c.closure_number::text, public.fiscal_ts(c.created_at), c.business_date::text,
    coalesce(c.first_ticket::text, ''), coalesce(c.last_ticket::text, ''), c.ticket_count::text,
    to_char(c.sales_ttc, 'FM99999999999990.00'), to_char(c.avoirs_ttc, 'FM99999999999990.00'),
    to_char(c.net_ttc, 'FM99999999999990.00'), to_char(c.net_ht, 'FM99999999999990.00'),
    to_char(c.net_tva, 'FM99999999999990.00'), c.vat_breakdown::text,
    to_char(c.payment_cash, 'FM99999999999990.00'), to_char(c.payment_card, 'FM99999999999990.00'),
    to_char(c.payment_online, 'FM99999999999990.00'), to_char(c.discount_amount, 'FM99999999999990.00'),
    to_char(c.grand_total_ttc, 'FM9999999999999990.00'), c.actor);
$$;

-- Totaux d'une plage de tickets (utilisé par la clôture ET par la vérification)
CREATE OR REPLACE FUNCTION public.fiscal_ticket_totals(p_from BIGINT, p_to BIGINT)
RETURNS TABLE (ticket_count INT, sales_ttc NUMERIC, avoirs_ttc NUMERIC, net_ttc NUMERIC, net_ht NUMERIC, net_tva NUMERIC,
               vat_breakdown JSONB, payment_cash NUMERIC, payment_card NUMERIC, payment_online NUMERIC, discount_amount NUMERIC)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r RECORD;
  v_vat JSONB := '{}'::jsonb;
BEGIN
  ticket_count := 0; sales_ttc := 0; avoirs_ttc := 0; net_ttc := 0; net_ht := 0; net_tva := 0;
  payment_cash := 0; payment_card := 0; payment_online := 0; discount_amount := 0;
  FOR r IN SELECT * FROM public.fiscal_tickets t WHERE t.ticket_number BETWEEN p_from AND p_to ORDER BY t.ticket_number LOOP
    ticket_count := ticket_count + 1;
    IF r.ticket_type = 'VENTE' THEN sales_ttc := sales_ttc + r.total_ttc; ELSE avoirs_ttc := avoirs_ttc + r.total_ttc; END IF;
    net_ttc := net_ttc + r.total_ttc; net_ht := net_ht + r.total_ht; net_tva := net_tva + r.total_tva;
    payment_cash := payment_cash + r.payment_cash; payment_card := payment_card + r.payment_card;
    payment_online := payment_online + r.payment_online; discount_amount := discount_amount + r.discount_amount;
    v_vat := public.fiscal_vat_add(v_vat, r.vat_breakdown);
  END LOOP;
  vat_breakdown := v_vat;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.fiscal_insert_closure(c public.fiscal_closures)
RETURNS public.fiscal_closures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev public.fiscal_closures;
BEGIN
  SELECT * INTO v_prev FROM public.fiscal_closures ORDER BY id DESC LIMIT 1;
  c.id := nextval(pg_get_serial_sequence('public.fiscal_closures', 'id'));
  c.created_at := clock_timestamp();
  c.actor := coalesce(auth.uid()::text, current_user);
  c.prev_hash := coalesce(v_prev.hash, repeat('0', 64));
  c.hash := encode(extensions.digest(public.fiscal_closure_payload(c), 'sha256'), 'hex');
  INSERT INTO public.fiscal_closures VALUES (c.*);
  PERFORM public.fiscal_log_event('CLOTURE_' || c.closure_type, NULL, NULL,
    jsonb_build_object('closure_number', c.closure_number, 'net_ttc', c.net_ttc,
                       'grand_total_ttc', c.grand_total_ttc, 'hash', c.hash));
  RETURN c;
END;
$$;

REVOKE ALL ON FUNCTION public.fiscal_insert_closure(public.fiscal_closures) FROM PUBLIC, anon, authenticated;

-- Z journalier : tous les tickets depuis le dernier Z. Rien ne se perd entre deux Z,
-- même si la clôture est faite après minuit.
CREATE OR REPLACE FUNCTION public.fiscal_close_day(p_business_date DATE DEFAULT NULL)
RETURNS public.fiscal_closures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  c        public.fiscal_closures;
  v_last   public.fiscal_closures;
  v_maxt   BIGINT;
  tot      RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('fiscal_tickets_chain'));  -- aucun ticket pendant la clôture
  PERFORM pg_advisory_xact_lock(hashtext('fiscal_closures_chain'));

  SELECT * INTO v_last FROM public.fiscal_closures WHERE closure_type = 'J' ORDER BY closure_number DESC LIMIT 1;
  SELECT max(ticket_number) INTO v_maxt FROM public.fiscal_tickets;

  c.closure_type   := 'J';
  c.closure_number := coalesce(v_last.closure_number, 0) + 1;
  c.business_date  := coalesce(p_business_date, (now() AT TIME ZONE 'Europe/Paris' - interval '4 hours')::date);
  c.first_ticket   := coalesce(v_last.last_ticket, 0) + 1;
  c.last_ticket    := greatest(coalesce(v_maxt, 0), coalesce(v_last.last_ticket, 0));

  SELECT * INTO tot FROM public.fiscal_ticket_totals(c.first_ticket, c.last_ticket);
  c.ticket_count := tot.ticket_count;     c.sales_ttc := tot.sales_ttc;     c.avoirs_ttc := tot.avoirs_ttc;
  c.net_ttc := tot.net_ttc;               c.net_ht := tot.net_ht;           c.net_tva := tot.net_tva;
  c.vat_breakdown := tot.vat_breakdown;   c.payment_cash := tot.payment_cash; c.payment_card := tot.payment_card;
  c.payment_online := tot.payment_online; c.discount_amount := tot.discount_amount;
  c.grand_total_ttc := coalesce(v_last.grand_total_ttc, 0) + c.net_ttc;

  RETURN public.fiscal_insert_closure(c);
END;
$$;

-- Clôture mensuelle ('M') ou annuelle ('A') : cumule les Z journaliers depuis la dernière.
CREATE OR REPLACE FUNCTION public.fiscal_close_period(p_type TEXT, p_period_start DATE DEFAULT NULL)
RETURNS public.fiscal_closures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  c      public.fiscal_closures;
  v_last public.fiscal_closures;
  v_from BIGINT;
  v_to   BIGINT;
  z      RECORD;
BEGIN
  IF p_type NOT IN ('M', 'A') THEN RAISE EXCEPTION 'Type de clôture : M ou A'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('fiscal_closures_chain'));

  SELECT * INTO v_last FROM public.fiscal_closures WHERE closure_type = p_type ORDER BY closure_number DESC LIMIT 1;
  v_from := coalesce(v_last.last_ticket, 0) + 1;   -- ici first/last = numéros de Z journaliers
  SELECT max(closure_number) INTO v_to FROM public.fiscal_closures WHERE closure_type = 'J';
  v_to := greatest(coalesce(v_to, 0), v_from - 1);

  c.closure_type   := p_type;
  c.closure_number := coalesce(v_last.closure_number, 0) + 1;
  c.business_date  := coalesce(p_period_start,
                        CASE p_type WHEN 'M' THEN date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date
                                    ELSE date_trunc('year', now() AT TIME ZONE 'Europe/Paris')::date END);
  c.first_ticket := v_from;
  c.last_ticket  := v_to;
  c.ticket_count := 0; c.sales_ttc := 0; c.avoirs_ttc := 0; c.net_ttc := 0; c.net_ht := 0; c.net_tva := 0;
  c.payment_cash := 0; c.payment_card := 0; c.payment_online := 0; c.discount_amount := 0;
  c.vat_breakdown := '{}'::jsonb;

  FOR z IN SELECT * FROM public.fiscal_closures
            WHERE closure_type = 'J' AND closure_number BETWEEN v_from AND v_to ORDER BY closure_number LOOP
    c.ticket_count := c.ticket_count + z.ticket_count;  c.sales_ttc := c.sales_ttc + z.sales_ttc;
    c.avoirs_ttc := c.avoirs_ttc + z.avoirs_ttc;        c.net_ttc := c.net_ttc + z.net_ttc;
    c.net_ht := c.net_ht + z.net_ht;                    c.net_tva := c.net_tva + z.net_tva;
    c.payment_cash := c.payment_cash + z.payment_cash;  c.payment_card := c.payment_card + z.payment_card;
    c.payment_online := c.payment_online + z.payment_online; c.discount_amount := c.discount_amount + z.discount_amount;
    c.vat_breakdown := public.fiscal_vat_add(c.vat_breakdown, z.vat_breakdown);
  END LOOP;
  c.grand_total_ttc := coalesce(v_last.grand_total_ttc, 0) + c.net_ttc;

  RETURN public.fiscal_insert_closure(c);
END;
$$;

-- ── Immuabilité des tables fiscales ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_fiscal_tickets_append_only ON public.fiscal_tickets;
CREATE TRIGGER trg_fiscal_tickets_append_only
  BEFORE UPDATE OR DELETE ON public.fiscal_tickets
  FOR EACH ROW EXECUTE FUNCTION public.fiscal_events_append_only();
DROP TRIGGER IF EXISTS trg_fiscal_tickets_no_truncate ON public.fiscal_tickets;
CREATE TRIGGER trg_fiscal_tickets_no_truncate
  BEFORE TRUNCATE ON public.fiscal_tickets
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiscal_events_append_only();

DROP TRIGGER IF EXISTS trg_fiscal_closures_append_only ON public.fiscal_closures;
CREATE TRIGGER trg_fiscal_closures_append_only
  BEFORE UPDATE OR DELETE ON public.fiscal_closures
  FOR EACH ROW EXECUTE FUNCTION public.fiscal_events_append_only();
DROP TRIGGER IF EXISTS trg_fiscal_closures_no_truncate ON public.fiscal_closures;
CREATE TRIGGER trg_fiscal_closures_no_truncate
  BEFORE TRUNCATE ON public.fiscal_closures
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiscal_events_append_only();

-- ── Droits ─────────────────────────────────────────────────────────────────
-- La caisse tourne aujourd'hui avec la clé publique (anon), comme pour la table orders.
-- À resserrer quand la caisse aura une connexion caissier.
ALTER TABLE public.fiscal_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_tickets, public.fiscal_closures FROM anon, authenticated;
GRANT SELECT ON public.fiscal_tickets, public.fiscal_closures TO anon, authenticated;
DROP POLICY IF EXISTS "Read fiscal tickets" ON public.fiscal_tickets;
CREATE POLICY "Read fiscal tickets" ON public.fiscal_tickets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read fiscal closures" ON public.fiscal_closures;
CREATE POLICY "Read fiscal closures" ON public.fiscal_closures FOR SELECT USING (true);

REVOKE ALL ON FUNCTION public.fiscal_cancel_order(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fiscal_close_day(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fiscal_close_period(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fiscal_cancel_order(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_close_day(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_close_period(TEXT, DATE) TO anon, authenticated;

-- ── Vérification complète ──────────────────────────────────────────────────
-- SELECT * FROM public.fiscal_verify_all();  → aucune ligne = tout est intact.
CREATE OR REPLACE FUNCTION public.fiscal_verify_all()
RETURNS TABLE (source TEXT, ref TEXT, probleme TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  t       public.fiscal_tickets;
  c       public.fiscal_closures;
  v_prev  TEXT := repeat('0', 64);
  v_num   BIGINT := 0;
  v_gt    NUMERIC := 0;
  v_gtz   JSONB := '{}'::jsonb;
  v_lastz JSONB := '{}'::jsonb;
  tot     RECORD;
  e       RECORD;
BEGIN
  -- 1. Journal des événements
  FOR e IN SELECT * FROM public.fiscal_verify_events() LOOP
    source := 'journal'; ref := e.id::text; probleme := e.probleme; RETURN NEXT;
  END LOOP;

  -- 2. Tickets : numéros sans trou, chaînage, empreinte, grand total
  FOR t IN SELECT * FROM public.fiscal_tickets ORDER BY ticket_number LOOP
    source := 'ticket'; ref := t.ticket_number::text;
    IF t.ticket_number <> v_num + 1 THEN probleme := 'numéro manquant avant ce ticket'; RETURN NEXT; END IF;
    IF t.prev_hash <> v_prev THEN probleme := 'chaînage rompu'; RETURN NEXT; END IF;
    IF t.hash <> encode(extensions.digest(public.fiscal_ticket_payload(t), 'sha256'), 'hex') THEN
      probleme := 'contenu modifié'; RETURN NEXT;
    END IF;
    v_gt := v_gt + t.total_ttc;
    IF t.grand_total_ttc <> v_gt THEN probleme := 'grand total incohérent'; RETURN NEXT; END IF;
    v_num := t.ticket_number; v_prev := t.hash;
  END LOOP;

  -- 3. Clôtures : chaînage, empreinte, totaux recalculés, grand total par type
  v_prev := repeat('0', 64);
  FOR c IN SELECT * FROM public.fiscal_closures ORDER BY id LOOP
    source := 'cloture ' || c.closure_type; ref := c.closure_number::text;
    IF c.prev_hash <> v_prev THEN probleme := 'chaînage rompu'; RETURN NEXT; END IF;
    IF c.hash <> encode(extensions.digest(public.fiscal_closure_payload(c), 'sha256'), 'hex') THEN
      probleme := 'contenu modifié'; RETURN NEXT;
    END IF;
    IF coalesce((v_lastz->>c.closure_type)::bigint, 0) + 1 <> c.closure_number THEN
      probleme := 'numéro de clôture manquant'; RETURN NEXT;
    END IF;
    IF c.closure_type = 'J' THEN
      SELECT * INTO tot FROM public.fiscal_ticket_totals(c.first_ticket, c.last_ticket);
      IF tot.net_ttc <> c.net_ttc OR tot.ticket_count <> c.ticket_count
         OR tot.payment_cash <> c.payment_cash OR tot.payment_card <> c.payment_card THEN
        probleme := 'totaux différents des tickets'; RETURN NEXT;
      END IF;
    END IF;
    IF coalesce((v_gtz->>c.closure_type)::numeric, 0) + c.net_ttc <> c.grand_total_ttc THEN
      probleme := 'grand total perpétuel incohérent'; RETURN NEXT;
    END IF;
    v_gtz := v_gtz || jsonb_build_object(c.closure_type, c.grand_total_ttc);
    v_lastz := v_lastz || jsonb_build_object(c.closure_type, c.closure_number);
    v_prev := c.hash;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fiscal_verify_all() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fiscal_verify_all() TO anon, authenticated;
