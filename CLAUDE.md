# TwinBite Order • Plateforme de Commande

Application web de commande en ligne, menu digital interactif et gestion de commandes pour Twin Pizza.

## 🛠️ Stack Technique
- **Frontend** : React 18 + TypeScript + Vite (SWC)
- **Styling** : Tailwind CSS + Radix UI + Lucide React + Motion
- **Backend / Données** : Supabase (`@supabase/supabase-js`)
- **State & Data Fetching** : TanStack React Query + React Hook Form + Zod
- **Composants avancés** : Embla Carousel, Recharts, Sonner

## 📦 Commandes Principales
```bash
npm run dev        # Lance le serveur Vite en développement (http://localhost:5173)
npm run build      # Compile le projet et exécute le script postbuild
npm run lint       # Analyse le code avec ESLint
npm run preview    # Prévisualise le build de production
```

## 🏗️ Structure du Projet
- `src/` :
  - `components/` : Composants de commande, panier, menu et tunnel d'achat
  - `pages/` : Pages du restaurant (Menu, Panier, Suivi de commande)
  - `services/` : Intégrations Supabase et gestion des commandes
  - `types/` : Types TypeScript
- `scripts/` : Scripts utilitaires de build (`postbuild.cjs`)

## 🖥️ Infrastructure (VPS OVH)
- Supabase self-hosted : `https://supabase.twinpizza.fr` — VPS `ubuntu@15.235.126.106`, dossier `/home/ubuntu/supabase/docker/supabase-project`
- Edge functions : copier les dossiers de `supabase/functions/` dans `volumes/functions/` (pas de restart nécessaire pour le code). Utiliser `npm:` plutôt que `esm.sh` pour supabase-js.
- Secrets des fonctions : `.env.twinpizza-functions` (env_file du service `functions`), puis `sudo docker compose up -d --no-deps functions`
- Le conteneur de fonctions est partagé avec d'autres apps (coach-*, star-ai…) : ne pas toucher `main`, `_shared` ni leurs dossiers.
- Serveur d'impression : `print-server/` (Node, port 3001) tourne sur le PC du restaurant ; imprimante Ethernet `192.168.1.200:9100`.
