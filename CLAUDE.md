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
- Secrets remplis à ce jour : `MAPBOX_PUBLIC_TOKEN`, `TELEGRAM_BOT_TOKEN` (@Twinpizza_bot), `TELEGRAM_ADMIN_CHAT_ID_1/2`. Vides : `TELEGRAM_ADMIN_CHAT_IDS`, Twilio, myPOS, Stripe, WhatsApp, VAPID.
- L'ancien projet Supabase cloud (`hsylnr…supabase.co`) est encore en ligne mais ne reçoit plus de commandes : le site (`src/integrations/supabase/client.ts`) et le print-server remplacent toute URL `*.supabase.co` par le VPS. Le `.env` commité contient encore l'URL cloud (neutralisée).

## 🖨️ Impression (PC du restaurant)
- **Lancement** : `LANCER_TWINPIZZA.bat` → Hub Electron (`twinpizzahub/main.js`) qui lance `print-server/server.js`.
- **Mise à jour** : `METTRE_A_JOUR.bat` (git pull + build + relance). Le Hub compare `codeVersion` (sha1 de `server.js`, visible sur `http://localhost:3001/status`) au fichier local, et tue/relance un print-server périmé sur le port 3001.
- **Vérifier la version au resto** : `http://localhost:3001/status` → `codeVersion` doit être égal à `node -e "console.log(require('crypto').createHash('sha1').update(require('fs').readFileSync('print-server/server.js')).digest('hex').slice(0,12))"`, et `supabaseUrl` doit être `https://supabase.twinpizza.fr`.
- **Imprimante Ethernet 192.168.1.200 (PARTNER)** :
  - parle **ESC/POS** (GS !, GS V, ESC t 16) : ne JAMAIS lui envoyer de commandes Star Line (`ESC i` = coupe, `ESC d n`, QR Star) ;
  - est **fixée au mur à l'envers** : le layout dynamique envoie `ESC { 1` et imprime les lignes physiques de la dernière à la première (`PRINTER_UPSIDE_DOWN=false` dans `print-server/.env` pour désactiver) ;
  - matricielle : pas de QR, le lien d'avis est imprimé en texte.
- **Layouts** : tout passe par `formatDynamicTicket` (texte coupé par nos soins via `wrapLine` / `padLineFit` / `charsFor` : 42 car. en taille normale, 21 en double taille, pour que l'imprimante ne coupe jamais elle-même les lignes). Les layouts « classiques » ne servent plus que pour l'USB Star TSP100 (`isStar`).
- **File d'impression** : séquentielle, 20 s max par job, 10 s max pour l'impression USB et pour `Get-Printer`.
- **Images du menu** : `src/utils/resolveImg.ts` sert les images du storage via `/storage/v1/render/image/public/…?width=800&quality=75` (imgproxy du VPS).
