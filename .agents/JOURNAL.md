# Journal des agents

Les entrǸes les plus rǸcentes en haut.

## 2026-10-18 — Claude Code — Telegram rétabli sur le VPS
**Fait :** L'utilisateur a rempli `.env.twinpizza-functions` (TELEGRAM_BOT_TOKEN + CHAT_ID_1 et _2) et recréé le conteneur. Vérifié : token valide (@Twinpizza_bot), `send-telegram-notification` renvoie `{"success":true}` sur une commande « TEST ».
**Fichiers touchés :** aucun (config VPS uniquement).
**Infrastructure & Serveur :** conteneur `supabase-edge-functions` healthy.
**À savoir / Pièges :** `TELEGRAM_ADMIN_CHAT_IDS` (roue de la chance) est vide. Twilio, myPOS, Stripe, WhatsApp et VAPID sont toujours vides.
**Reste à faire / Prochaines étapes :** Remplir les autres secrets si ces services sont utilisés ; redémarrer le print-server au resto et tester une vraie commande POS + borne.

## 2026-10-18 — Claude Code — Déploiement des edge functions sur le VPS
**Fait :**
- Copié les 14 fonctions de `supabase/functions/` dans `/home/ubuntu/supabase/docker/supabase-project/volumes/functions/` (le routeur `main` existait déjà ; il manquait seulement les dossiers Twin Pizza). Sauvegarde préalable : `functions-backup-20261018-121043.tgz` dans `volumes/`.
- `print-order`, `stripe-webhook`, `ubereats-webhook` : import `https://esm.sh/@supabase/supabase-js@2.57.2` → `npm:@supabase/supabase-js@2.57.2` (esm.sh ne se résolvait pas dans edge-runtime v1.76.2).
- Secrets : nouveau fichier `/home/ubuntu/supabase/docker/supabase-project/.env.twinpizza-functions` (chmod 600), branché via `env_file` (required: false) sur le service `functions` du `docker-compose.yml` (backup `docker-compose.yml.bak-20261018-*`). Seul `MAPBOX_PUBLIC_TOKEN` est rempli ; les autres clés sont vides.
- Conteneur `supabase-edge-functions` recréé (`docker compose up -d --no-deps functions`), healthy.
- Vérifié : les 14 fonctions répondent 200 à OPTIONS ; `get-mapbox-token` renvoie bien le token.
**Fichiers touchés :** `supabase/functions/print-order/index.ts`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/ubereats-webhook/index.ts` ; sur le VPS : `volumes/functions/*`, `docker-compose.yml`, `.env.twinpizza-functions`.
**Infrastructure & Serveur :** VPS OVH `ubuntu@15.235.126.106` (hostname vps-2684cbf3), Supabase self-hosted dans `/home/ubuntu/supabase/docker/supabase-project`. Le VPS héberge aussi d'autres apps (coach-*, star-ai, n8n, waha) qui partagent le même conteneur de fonctions : ne pas écraser `_shared`, `main`, ni leurs dossiers.
**À savoir / Pièges :** Les valeurs des secrets n'existent pas en local (elles étaient dans le dashboard Supabase cloud). Tant qu'elles sont vides : pas de Telegram, SMS Twilio, myPOS, Stripe, WhatsApp, push.
**Reste à faire / Prochaines étapes :** Remplir `.env.twinpizza-functions` (au minimum TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID_1..5) puis `sudo docker compose up -d --no-deps functions` ; tester une commande réelle.

## 2026-10-18 — Claude Code — Réparation impression (ticket, file d'attente), borne, images après migration VPS
**Fait :**
- Ticket dynamique (`formatDynamicTicket`) : nouveaux helpers `wrapLine` / `padLineFit` / `wrapText`. Chaque ligne est coupée par nous selon la taille de police (`charsFor` : 42 car. normal, 21 en double taille), donc l'imprimante n'auto-wrap plus → fini les prix au-dessus des noms, le « E » orphelin du TOTAL, le « [ ! ] » dupliqué et l'URL d'avis en morceaux inversés.
- « Invalid Date » : la caisse envoie la commande à `/print` sans `created_at` → fallback sur l'heure actuelle (dynamique + classiques).
- Bloc paiement : « À PAYER / EN CAISSE » sur 2 lignes double taille, séparateurs à la largeur du papier ; bandeau PAYÉ raccourci.
- QR sur l'imprimante Ethernet (matricielle, pas de QR) → lien court en texte sans paramètres utm.
- File d'impression : timeout 20 s par job, timeout 10 s sur `print-raw.exe` (USB) et 10 s sur `Get-Printer` → une imprimante bloquée ne retarde plus les commandes suivantes (cause probable des 10 min de retard borne).
- Commandes POS imprimées via `/print` (sans id) : l'id DB est mémorisé au passage du polling → plus de « POLL CATCH » en boucle.
- Borne : l'appel Telegram n'est plus `await` (ne bloque plus l'écran).
- Images : `resolveImg` sert les images du storage via `/storage/v1/render/image/public/...?width=800&quality=75` (780 Ko → ~130 Ko). Vérifié dans le navigateur : 15/15 images OK.
- Ces changements s'ajoutent aux modifs non commitées déjà présentes dans `print-server/server.js` (suppression du mode upside-down, logique isStar, polling 1,5 s).
**Fichiers touchés :** `print-server/server.js`, `src/pages/KioskPage.tsx`, `src/utils/resolveImg.ts`.
**Infrastructure & Serveur :** Diagnostic VPS : TOUTES les edge functions renvoient 500 `worker boot error: could not find an appropriate entrypoint` → `volumes/functions/` (et le routeur `main/index.ts`) n'ont pas été copiés sur le VPS. Casse : Telegram, print-order, SMS, Mapbox, myPOS, Stripe, Uber. Realtime OK (SUBSCRIBED), REST OK, horodatage DB OK. NON corrigé : accès SSH refusé par les permissions de la session.
**À savoir / Pièges :**
- Le serveur d'impression doit être redémarré sur le PC du resto pour prendre les changements.
- `hasUsbPrinter` exclut volontairement le nom par défaut « Star TSP100 Cutter (TSP143) » (config actuelle = 1 seule imprimante Ethernet 192.168.1.200).
- Le ticket « CUISINE » contient paiement + avis car c'est le modèle cuisine configuré dans l'admin (sections activées) — à désactiver dans Admin > Tickets si non voulu.
- `npx tsc` : erreur préexistante `customer_address` dans KioskPage (non liée).
**Reste à faire / Prochaines étapes :**
1. Déployer `supabase/functions/*` + un `main/index.ts` (routeur edge-runtime) dans `<supabase-docker>/volumes/functions/` sur le VPS, ajouter les secrets (TELEGRAM_*, TWILIO_*, MAPBOX_PUBLIC_TOKEN, MYPOS_*, STRIPE_*, WHATSAPP_*, VAPID_*) dans l'env du service `functions`, puis `docker compose restart functions`.
2. Test d'impression réel (POS + borne) après redémarrage du print-server.

