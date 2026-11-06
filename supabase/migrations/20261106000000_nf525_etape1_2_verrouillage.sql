-- ============================================================================
-- NF525 / loi anti-fraude TVA : étapes 1 et 2
--   1. Données de paiement justes (espèces / CB séparés, remises enregistrées)
--   2. Verrouillage : une commande encaissée ne peut plus être modifiée dans ses
--      montants, et aucune commande ne peut être supprimée. Tout changement est
--      tracé dans un journal en ajout seul, chaîné par empreinte SHA-256.
--
-- À appliquer AVANT de déployer le code de la branche nf525-etape-1-2.
-- Ce script ne modifie aucune commande existante.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── 1. Moyen de paiement « divisé » ────────────────────────────────────────
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'divise';

-- ── 2. Nouvelles colonnes de paiement ──────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_cash    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_card    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_discount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.payment_cash    IS 'Part encaissée en espèces (monnaie rendue déduite)';
COMMENT ON COLUMN public.orders.payment_card    IS 'Part encaissée par carte bancaire';
COMMENT ON COLUMN public.orders.discount_amount IS 'Remise manuelle accordée en caisse (€ TTC)';
COMMENT ON COLUMN public.orders.promo_discount  IS 'Économie de l''offre pizzas (€ TTC)';

-- ── 3. Compteur de numéros : plus modifiable depuis le navigateur ───────────
-- get_next_order_number() est SECURITY DEFINER : il continue de fonctionner.
REVOKE INSERT, UPDATE, DELETE ON public.global_order_counter FROM anon, authenticated;

-- ── 4. Journal des événements (ajout seul, chaîné) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_events (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type   TEXT NOT NULL,
  order_id     UUID,
  order_number TEXT,
  actor        TEXT,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash    TEXT NOT NULL,
  hash         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fiscal_events_order ON public.fiscal_events(order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_created ON public.fiscal_events(created_at);

ALTER TABLE public.fiscal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_events FROM anon, authenticated;
GRANT SELECT ON public.fiscal_events TO authenticated;
DROP POLICY IF EXISTS "Admins can read fiscal events" ON public.fiscal_events;
CREATE POLICY "Admins can read fiscal events" ON public.fiscal_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Écrit un événement et le chaîne au précédent.
CREATE OR REPLACE FUNCTION public.fiscal_log_event(
  p_event_type TEXT, p_order_id UUID, p_order_number TEXT, p_details JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev TEXT;
  v_now  TIMESTAMPTZ := clock_timestamp();
  v_actor TEXT := coalesce(auth.uid()::text, current_user);
BEGIN
  -- Un seul écrivain à la fois pour garder la chaîne linéaire.
  PERFORM pg_advisory_xact_lock(hashtext('fiscal_events_chain'));
  SELECT hash INTO v_prev FROM public.fiscal_events ORDER BY id DESC LIMIT 1;
  v_prev := coalesce(v_prev, repeat('0', 64));

  INSERT INTO public.fiscal_events (created_at, event_type, order_id, order_number, actor, details, prev_hash, hash)
  VALUES (
    v_now, p_event_type, p_order_id, p_order_number, v_actor, coalesce(p_details, '{}'::jsonb), v_prev,
    encode(extensions.digest(
      v_prev || '|' || to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || p_event_type || '|' || coalesce(p_order_id::text, '') || '|' ||
      coalesce(p_order_number, '') || '|' || v_actor || '|' || coalesce(p_details, '{}'::jsonb)::text,
      'sha256'), 'hex')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fiscal_log_event(TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- Le journal ne se modifie ni ne s'efface, quel que soit le rôle.
CREATE OR REPLACE FUNCTION public.fiscal_events_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Données fiscales : modification et suppression interdites (NF525)';
END;
$$;

DROP TRIGGER IF EXISTS trg_fiscal_events_append_only ON public.fiscal_events;
CREATE TRIGGER trg_fiscal_events_append_only
  BEFORE UPDATE OR DELETE ON public.fiscal_events
  FOR EACH ROW EXECUTE FUNCTION public.fiscal_events_append_only();

DROP TRIGGER IF EXISTS trg_fiscal_events_no_truncate ON public.fiscal_events;
CREATE TRIGGER trg_fiscal_events_no_truncate
  BEFORE TRUNCATE ON public.fiscal_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiscal_events_append_only();

-- ── 5. Protection des commandes ─────────────────────────────────────────────
-- Une commande est « encaissée » si paid_at est rempli, ou si elle a été saisie
-- en caisse (les commandes caisse sont payées au moment de la saisie, y compris
-- l'historique d'avant cette migration).
CREATE OR REPLACE FUNCTION public.order_is_fiscally_locked(o public.orders)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT o.paid_at IS NOT NULL
      OR coalesce(o.customer_notes, '') LIKE '[POS]%'
      OR o.customer_phone = 'pos';
$$;

CREATE OR REPLACE FUNCTION public.orders_fiscal_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_changed TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Commande #% : suppression interdite (NF525). Utilisez l''annulation.', OLD.order_number;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.fiscal_log_event(
      CASE WHEN public.order_is_fiscally_locked(NEW) THEN 'VENTE' ELSE 'COMMANDE' END,
      NEW.id, NEW.order_number,
      jsonb_build_object(
        'total', NEW.total, 'tva', NEW.tva, 'subtotal', NEW.subtotal,
        'payment_method', NEW.payment_method, 'payment_cash', NEW.payment_cash,
        'payment_card', NEW.payment_card, 'discount_amount', NEW.discount_amount,
        'promo_discount', NEW.promo_discount, 'order_type', NEW.order_type,
        'items_hash', encode(extensions.digest(coalesce(NEW.items::text, ''), 'sha256'), 'hex')
      ));
    RETURN NEW;
  END IF;

  -- UPDATE
  IF public.order_is_fiscally_locked(OLD) THEN
    IF NEW.order_number    IS DISTINCT FROM OLD.order_number    THEN v_changed := array_append(v_changed, 'order_number'); END IF;
    IF NEW.created_at      IS DISTINCT FROM OLD.created_at      THEN v_changed := array_append(v_changed, 'created_at'); END IF;
    IF NEW.items::text     IS DISTINCT FROM OLD.items::text     THEN v_changed := array_append(v_changed, 'items'); END IF;
    IF NEW.subtotal        IS DISTINCT FROM OLD.subtotal        THEN v_changed := array_append(v_changed, 'subtotal'); END IF;
    IF NEW.tva             IS DISTINCT FROM OLD.tva             THEN v_changed := array_append(v_changed, 'tva'); END IF;
    IF NEW.total           IS DISTINCT FROM OLD.total           THEN v_changed := array_append(v_changed, 'total'); END IF;
    IF NEW.delivery_fee    IS DISTINCT FROM OLD.delivery_fee    THEN v_changed := array_append(v_changed, 'delivery_fee'); END IF;
    IF NEW.order_type      IS DISTINCT FROM OLD.order_type      THEN v_changed := array_append(v_changed, 'order_type'); END IF;
    IF NEW.payment_method  IS DISTINCT FROM OLD.payment_method  THEN v_changed := array_append(v_changed, 'payment_method'); END IF;
    IF NEW.payment_cash    IS DISTINCT FROM OLD.payment_cash    THEN v_changed := array_append(v_changed, 'payment_cash'); END IF;
    IF NEW.payment_card    IS DISTINCT FROM OLD.payment_card    THEN v_changed := array_append(v_changed, 'payment_card'); END IF;
    IF NEW.discount_amount IS DISTINCT FROM OLD.discount_amount THEN v_changed := array_append(v_changed, 'discount_amount'); END IF;
    IF NEW.promo_discount  IS DISTINCT FROM OLD.promo_discount  THEN v_changed := array_append(v_changed, 'promo_discount'); END IF;
    IF NEW.paid_at         IS DISTINCT FROM OLD.paid_at         THEN v_changed := array_append(v_changed, 'paid_at'); END IF;

    IF array_length(v_changed, 1) > 0 THEN
      RAISE EXCEPTION 'Commande #% encaissée : modification interdite (%) (NF525)',
        OLD.order_number, array_to_string(v_changed, ', ');
    END IF;

    -- Les notes ne peuvent qu'être complétées (le motif d'annulation s'ajoute à la fin).
    IF coalesce(NEW.customer_notes, '') NOT LIKE (replace(replace(replace(coalesce(OLD.customer_notes, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%') THEN
      RAISE EXCEPTION 'Commande #% encaissée : les notes peuvent être complétées, pas réécrites (NF525)', OLD.order_number;
    END IF;
  END IF;

  -- Traces dans le journal
  IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL THEN
    PERFORM public.fiscal_log_event('ENCAISSEMENT', NEW.id, NEW.order_number,
      jsonb_build_object('total', NEW.total, 'payment_method', NEW.payment_method,
                         'payment_cash', NEW.payment_cash, 'payment_card', NEW.payment_card));
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'cancelled' THEN
    PERFORM public.fiscal_log_event('ANNULATION', NEW.id, NEW.order_number,
      jsonb_build_object('total', OLD.total, 'encaissee', public.order_is_fiscally_locked(OLD),
                         'notes', NEW.customer_notes));
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND OLD.status = 'cancelled' THEN
    PERFORM public.fiscal_log_event('ANNULATION_ANNULEE', NEW.id, NEW.order_number,
      jsonb_build_object('total', NEW.total, 'nouveau_statut', NEW.status));
  END IF;

  IF NOT public.order_is_fiscally_locked(OLD) AND (
       NEW.total IS DISTINCT FROM OLD.total OR NEW.items::text IS DISTINCT FROM OLD.items::text) THEN
    PERFORM public.fiscal_log_event('MODIFICATION_AVANT_ENCAISSEMENT', NEW.id, NEW.order_number,
      jsonb_build_object('ancien_total', OLD.total, 'nouveau_total', NEW.total));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_fiscal_guard ON public.orders;
CREATE TRIGGER trg_orders_fiscal_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_fiscal_guard();

CREATE OR REPLACE FUNCTION public.orders_no_truncate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table orders : vidage interdit (NF525)';
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_no_truncate ON public.orders;
CREATE TRIGGER trg_orders_no_truncate
  BEFORE TRUNCATE ON public.orders
  FOR EACH STATEMENT EXECUTE FUNCTION public.orders_no_truncate();

-- ── 6. Vérification de la chaîne du journal ────────────────────────────────
-- SELECT * FROM public.fiscal_verify_events();  → aucune ligne = chaîne intacte.
CREATE OR REPLACE FUNCTION public.fiscal_verify_events()
RETURNS TABLE (id BIGINT, probleme TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r RECORD;
  v_prev TEXT := repeat('0', 64);
  v_expected TEXT;
BEGIN
  FOR r IN SELECT * FROM public.fiscal_events ORDER BY fiscal_events.id LOOP
    IF r.prev_hash <> v_prev THEN
      id := r.id; probleme := 'maillon manquant ou réordonné'; RETURN NEXT;
    END IF;
    v_expected := encode(extensions.digest(
      r.prev_hash || '|' || to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || r.event_type || '|' || coalesce(r.order_id::text, '') || '|' ||
      coalesce(r.order_number, '') || '|' || r.actor || '|' || r.details::text, 'sha256'), 'hex');
    IF r.hash <> v_expected THEN
      id := r.id; probleme := 'contenu modifié'; RETURN NEXT;
    END IF;
    v_prev := r.hash;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fiscal_verify_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fiscal_verify_events() TO authenticated;
