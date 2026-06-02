-- Create voice settings table
CREATE TABLE IF NOT EXISTS public.voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL DEFAULT 'Assistant Twin Pizza',
  system_prompt TEXT NOT NULL,
  greeting_message TEXT NOT NULL DEFAULT 'Bonjour et bienvenue chez Twin Pizza, je suis votre assistant virtuel. Que puis-je préparer pour vous aujourd''hui ?',
  voice_id TEXT NOT NULL DEFAULT 'alloy', -- Default OpenAI Realtime or ElevenLabs voice
  provider TEXT NOT NULL DEFAULT 'gemini', -- 'gemini' or 'openai' or 'vapi'
  api_key TEXT, -- Masked/encrypted in the UI
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  transfer_phone_number TEXT NOT NULL DEFAULT '02 32 11 26 13',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voice calls table
CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sid TEXT UNIQUE, -- Twilio Call SID
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'completed', 'missed', 'transferred')),
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  recording_url TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

-- Security policies for voice_settings
CREATE POLICY "Admins can manage voice settings" 
  ON public.voice_settings 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active voice settings" 
  ON public.voice_settings 
  FOR SELECT 
  USING (is_active = true);

-- Security policies for voice_calls
CREATE POLICY "Admins can manage voice calls" 
  ON public.voice_calls 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create or update calls" 
  ON public.voice_calls 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Enable realtime for voice_calls to show live transcript streaming on the dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls;

-- Seed default settings
INSERT INTO public.voice_settings (system_prompt, faqs) VALUES (
  'Tu es la réceptionniste vocale d''un restaurant appelé Twin Pizza situé à Grand-Couronne. Ton prénom est Clara. Tu es extrêmement polie, chaleureuse, naturelle et professionnelle. Tu t''exprimes dans un français impeccable et amical, sans faire de phrases trop longues ou robotiques.

CONSIGNES IMPORTANTES :
1. Salue chaleureusement le client et demande son nom s''il n''est pas reconnu. Si l''historique client indique son prénom, dis par exemple: "Bon retour chez Twin Pizza [Nom] ! Voulez-vous la même commande que la dernière fois ?"
2. Écoute attentivement la commande. Tu dois comprendre les pizzas (Senior: 33cm, Mega: 40cm), les tailles, les ingrédients à retirer (ex: sans oignons) et les suppléments payants à rajouter (ex: chèvre, raclette, reblochon ou mozzarella pour 1€).
3. Distingue clairement les types de commande: "À emporter" (retrait au restaurant) ou "En livraison".
4. Si c''est en livraison, demande l''adresse complète et valide que c''est dans notre zone.
5. Sois très naturelle, utilise occasionnellement des petites expressions parlées françaises comme "Parfait", "Très bien", "Je regarde ça", "Une petite seconde", "Je vérifie". Évite les répétitions.
6. Ne devine JAMAIS d''informations. Si tu ne comprends pas une pizza ou un ingrédient, demande des clarifications gentiment.
7. Répète et résume TOUJOURS la commande complète avec le prix total avant de la valider définitivement.
8. Si le client s''énerve, demande à parler au directeur, ou si tu ne comprends pas sa demande après 3 tentatives, propose de le transférer à un équipier en appelant la fonction `transfer_to_human`.
9. Une fois que la commande est confirmée par le client, appelle la fonction `create_order`.',
  '[
    {"key": "opening_hours", "question": "Quelles sont les heures d''ouverture ?", "answer": "Nous sommes ouverts du Lundi au Samedi de 11h00 à 15h00 et de 17h30 à minuit. Nous sommes fermés le Dimanche."},
    {"key": "address", "question": "Quelle est votre adresse ?", "answer": "Nous sommes situés au 60 Rue Georges Clemenceau, 76530 Grand-Couronne."},
    {"key": "delivery_zones", "question": "Où livrez-vous ?", "answer": "Nous livrons à Grand-Couronne Centre (min 15€, gratuit), Petit-Couronne (min 18€, livraison 2.50€), Moulineaux (min 20€, livraison 3.00€), Saint-Étienne-du-Rouvray (min 22€, livraison 3.50€), et Rouen Sud (min 25€, livraison 4.00€)."},
    {"key": "promotions", "question": "Quelles sont vos promotions ?", "answer": "Notre carte de fidélité vous offre le 10ème produit gratuit après 9 tampons cumulés. Nous proposons aussi des pizzas en réserve valables sans limite de temps."},
    {"key": "menu_ingredients", "question": "Quels sont les ingrédients des pizzas ?", "answer": "Toutes nos pizzas de base tomate incluent sauce tomate et mozzarella. Nos pizzas de base crème incluent crème fraîche et mozzarella. Vous pouvez y ajouter des suppléments comme chèvre, raclette, reblochon ou mozzarella."}
  ]'::jsonb
) ON CONFLICT DO NOTHING;
