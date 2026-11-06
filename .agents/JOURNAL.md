# Journal des agents

Les entrǸes les plus rǸcentes en haut.

## 2026-11-06 — Claude Code — NF525 étapes 1 et 2 : paiements justes + commandes encaissées verrouillées (branche `nf525-etape-1-2`, PAS encore déployé)
**Fait :**
- Migration `supabase/migrations/20261106000000_nf525_etape1_2_verrouillage.sql` (à appliquer AVANT le code) : enum `payment_method` + `divise` ; colonnes `orders.payment_cash`, `payment_card`, `discount_amount`, `promo_discount` ; `REVOKE INSERT/UPDATE/DELETE` sur `global_order_counter` pour anon/authenticated (le RPC SECURITY DEFINER marche toujours) ; trigger `orders_fiscal_guard` : suppression et TRUNCATE interdits, commande « encaissée » (`paid_at` rempli, ou saisie caisse `[POS]`/`pos`, historique compris) = montants, articles, paiement, numéro, date figés ; notes seulement complétables ; statut libre. Journal `fiscal_events` en ajout seul, chaîné SHA-256 (`fiscal_log_event`), vérifiable avec `SELECT * FROM fiscal_verify_events();` (0 ligne = intact).
- Caisse : chaque vente envoie `payment_cash/card`, remise, économie offre pizzas, `paid_at`. Nouveau bouton « À encaisser » (`src/components/pos/EncaisserModal.tsx`) : encaisser une commande borne/site en Espèces, Carte ou Divisé. Z : les commandes borne/site non encaissées ne sont plus comptées en espèces (ligne « Non encaissées ») ; remises affichées.
- `src/lib/fiscal.ts` : `isFiscallyLocked` (même règle que la base), `splitPayment`, `getOrderPayment` (colonnes, sinon note `[Divisé: …]`, sinon moyen de paiement). Utilisé par `calculateBusinessStats`.
- Envoi caisse : `insertPOSOrder` (doublon = déjà envoyé ; base pas migrée = renvoi sans les colonnes NF525) ; la synchro ne fait plus jamais d'UPDATE d'une commande existante et ne tourne plus en double ; le retry s'arrête après 10 essais (la synchro 4 s prend le relais).
- Admin `TicketManager` : total et articles non modifiables pour une commande encaissée.
**Vérifié :** migration appliquée 2 fois sur un Postgres 16 local (schéma minimal) : refus modif total / paiement / notes / suppression / TRUNCATE / journal / compteur anon ; annulation et encaissement borne OK ; falsification du journal détectée par `fiscal_verify_events`. Tests de `fiscal.ts` OK. `vite build` OK (dans un dossier temporaire). Les erreurs `tsc` restantes existaient avant.
**Fichiers touchés :** migration ci-dessus, `src/lib/fiscal.ts`, `src/lib/orderSync.ts`, `src/lib/orderUtils.ts`, `src/pages/POSPage.tsx`, `src/components/pos/EncaisserModal.tsx`, `src/components/admin/TicketManager.tsx`.
**Infrastructure & Serveur :** rien appliqué. La migration n'a PAS été lancée sur le VPS.
**À savoir / Pièges :**
- Après la migration, toute tentative de modifier le total/les articles d'une commande caisse renvoie une erreur : c'est voulu (NF525). Corriger = annuler avec motif + refaire.
- Les commandes borne/site doivent passer par « À encaisser », sinon elles apparaissent « Non encaissées » au Z.
- TVA toujours à 10 % partout (`calculateTVA`) : taux boissons à emporter à confirmer par le comptable.
- Ce n'est PAS la certification : il manque tickets signés, Z stockés, archives, mode hors ligne (plan : doc « Caisse TwinBite et loi anti-fraude (NF525) »).
**Reste à faire :** go du patron → appliquer la migration sur le VPS → merger → METTRE_A_JOUR.bat → test : vente divisée, encaissement borne, tentative de modification refusée.

## 2026-10-31 — Claude Code — Caisse POS : thème clair, textes plus gros, plus rapide (branche `pos-clair-rapide`, PAS encore déployé)
**Fait :**
- `/pos` (POSPage.tsx) passe d'un thème bleu nuit/orange à un thème **clair** : fond blanc/gris très clair, texte foncé, accent jaune Twin Pizza `#f6b800`, bouton « Valider » vert (`PAY_GREEN`). Le thème « glassy » (bulles floues 120px, backdrop-filter, lueurs, dégradés) est supprimé ; `applyThemePreset` ne fait plus que charger les couleurs perso, stockées sous la nouvelle clé `pos-theme-v2` (les anciennes couleurs sombres sauvegardées sont ignorées).
- Toutes les animations/transitions/flous sont coupés pour `.pos-root` (bloc « POS — LIGHT & FAST » à la fin de `src/index.css`, en `!important`). Police : Segoe UI au lieu de Comfortaa.
- Lisibilité : textes des tuiles ≥15px, catégories 14px (grille régulière), tailles pizza 16px / 52px de haut, Espèces/Carte/Divisé 56px, TOTAL 32px, Valider 60px, champs de saisie 16px. Les petites polices (8–13px) des panneaux produits et de la caisse sont remontées (13–16px). Les modales secondaires (Historique, Réglages, Factures, Clôture, WhatsApp, MAJ) ont juste les couleurs claires, pas de nouvelles tailles. La modale « Éditer Menu » (POSEditModal) et la modale de personnalisation pizza restent sombres (composants admin/assistant au style sombre).
- Vitesse : panneaux produits mémoïsés (`MemoPizzaPanel`, etc.), `handleAdd` et `onCustomize` stables (useCallback + ref). `handleTileClick` de PizzaPanel lit ses valeurs dans une ref : corrige aussi un bug existant (en mode « 1-Clic Direct », les tuiles mémoïsées gardaient l'ancien onClick → suppléments/note périmés). Images des tuiles en 240px au lieu de 800px (`resolveImg(url, width)`, défaut 800 inchangé pour le site).
- Mesure (build de prod, ce PC, saisie dans « Téléphone ») : ~2,4–2,75 ms → ~1,8–2,1 ms par frappe (≈ -25 %). Le gros gain attendu sur le PC du resto vient surtout de la suppression des flous/animations et des images 800px.
- Hub (`twinpizzahub/main.js`) : les `/assets/*.js|css` hashés par Vite sont servis en `max-age=31536000, immutable` (index.html reste no-store). Effet seulement après redémarrage du Hub.
**Fichiers touchés :** `src/pages/POSPage.tsx`, `src/index.css`, `src/utils/resolveImg.ts`, `twinpizzahub/main.js`.
**Infrastructure & Serveur :** aucun. Rien n'a été construit dans `dist/` (le Hub sert `dist/` en direct : un `npm run build` = déploiement immédiat). Les builds de test ont été faits dans un dossier temporaire avec `npx vite build --outDir <tmp>`.
**À savoir / Pièges :**
- Ne PAS faire `npm run build` dans le dossier du resto pour « tester » : ça déploie la caisse.
- Logique prix/panier/promo/envoi de commande non modifiée.
- Le thème ne repeint plus les panneaux mémoïsés quand on change une couleur dans Réglages (il faut changer de catégorie).
- `src/index.css` est stocké en CRLF, `POSPage.tsx` en LF : committer avec `git -c core.autocrlf=false add` pour index.css sinon tout le fichier apparaît modifié.
**Reste à faire / Prochaines étapes :** attendre le « go » du patron. Ensuite : merger `pos-clair-rapide` dans `main`, pousser, puis METTRE_A_JOUR.bat au resto (ou bouton MAJ du Hub). Retour arrière : `git checkout main` (avant merge) ou `git revert <commit>` (après merge), puis rebuild/MAJ.

## 2026-10-18 — Claude Code — Audit + correctifs borne, site, assistants Makloub/Soufflet, paiement en ligne coupé
**Fait :**
- **Extras pizza jamais facturés** (ligne 19 €, total 18 €) sur la borne, le site et probablement la caisse : `applyPizzaPromotions` ne comptait que l'ancien champ `supplements`. Désormais extras = `calculatedPrice - prix de base` ; ils ne sont jamais remisés par l'offre 1+1. Le ticket cuisine imprime aussi `addedExtras`, et le total de chaque ligne = prix unitaire × quantité.
- **Doublons dans les assistants** : `useCustomizationOptions` chargeait aussi les lignes inactives ; la base contient des doublons (crudités Salade/Tomate/Oignon actives en double, plus des copies inactives de viandes, sauces, garnitures et suppléments). Ajout de `dedupeOptionsByName` (la ligne active l'emporte). Les sauces, garnitures et suppléments inactifs sont masqués (viandes inactives = « Rupture »). Une garniture n'est plus jamais enregistrée deux fois.
- `UnifiedProductWizard` : « Sans sauce » bloquait « Continuer » → autorisé, et envoyé en cuisine comme « Sans sauce ». Les garnitures retirées sont envoyées comme `removedIngredients` → « Sans X » sur le ticket. Les prix des options menu viennent de `menuOptionPrices`.
- Borne : catégorie Salade ajoutée (elle ne faisait rien). Appel `print-order` supprimé (le VPS ne peut pas joindre l'imprimante du resto). Erreurs gérées : succès si la commande est enregistrée, sinon écran d'erreur + Réessayer, panier conservé. Protection contre le double appui sur « Confirmer ». Note réduite à `[BORNE]`. Le ticket indique « À CHOISIR EN CAISSE » pour le règlement. Noms et disponibilités des catégories mis en cache (plus de noms bruts ni de catégorie désactivée cliquable). Description « Eau minérale » et catégorie « boissons » attribuées par erreur : corrigé. Bandeau cookies masqué sur /kiosk.
- Site : **paiement en ligne désactivé** (`ONLINE_PAYMENT_ENABLED = false` dans `NewCheckout.tsx`). Champ code promo factice masqué (`PROMO_CODES_ENABLED = false`, aucun moteur de promo). Le panier affiche extras et « Sans X ». Pluriels « article(s) » corrigés.
- Vérifié dans le navigateur (borne + site, sans passer de vraie commande) ; build Vite OK ; rendu du ticket cuisine vérifié. Commit 8345504, codeVersion print-server `3ae565662177`.
**Fichiers touchés :** `src/utils/promotions.ts`, `print-server/server.js`, `src/hooks/useCustomizationOptions.ts`, `src/hooks/useCategoryImages.ts`, `src/hooks/useDisabledCategories.ts`, `src/components/wizards/UnifiedProductWizard.tsx`, `src/components/wizards/StreamlinedPizzaWizard.tsx`, `src/pages/KioskPage.tsx`, `src/components/kiosk/KioskCategories.tsx`, `src/components/kiosk/KioskCart.tsx`, `src/components/CookieConsent.tsx`, `src/components/NewCheckout.tsx`, `src/components/NewCart.tsx`.
**À savoir / Pièges :**
- Les doublons sont toujours DANS la base (tables `crudites_options`, `meat_options`, `sauce_options`, `garniture_options`, `supplement_options`) : le code les masque, mais il faudrait les nettoyer dans l'admin.
- Bug « 2 pizzas sur la borne → une seule reçue » NON reproduit : le panier contient bien les 2 pizzas. Aucune commande borne en base n'a 2 pizzas. Il faut un numéro de commande réel pour enquêter.
- Le bouton panier flottant et l'en-tête des pizzas utilisent `getTotal()` (sans l'offre 1+1) : ils affichent 36 € pour 2 pizzas alors que le total réel est 18 €.
- Le site public est déployé sur Vercel (`vercel.json`) : vérifier que le déploiement depuis `main` est passé.
**Reste à faire :** METTRE_A_JOUR.bat au resto (codeVersion `3ae565662177`) ; nettoyer les doublons d'options dans l'admin ; obtenir un n° de commande pour le bug des 2 pizzas.

## 2026-10-18 — Claude Code — Mise à jour de la documentation
**Fait :** `CLAUDE.md` : nouvelle section « Impression » (lancement et mise à jour au resto, vérification de `codeVersion`, imprimante ESC/POS montée à l'envers, layouts, file d'attente, images) + état des secrets VPS et neutralisation de l'ancien Supabase cloud. `AGENTS.md` rédigé (il était vide) : protocole de coordination et règles critiques. `.agents/EN-COURS.md` : points en attente de validation.
**Fichiers touchés :** `CLAUDE.md`, `AGENTS.md`, `.agents/EN-COURS.md`, `.agents/JOURNAL.md`.
**Reste à faire :** voir `.agents/EN-COURS.md`.

## 2026-10-18 — Claude Code — Imprimante cuisine murale à l'envers : ESC { 1 + lignes inversées
**Fait :** L'imprimante Ethernet (PARTNER, 192.168.1.200) est fixée au mur à l'envers. Les tickets #3049/#3052 sortaient en ordre inversé (CUISINE en bas) : le layout classique inversait ses blocs, mais l'agent précédent avait supprimé l'impression à l'envers (`ESC {`). Le layout dynamique construit maintenant un chunk par ligne physique, déjà coupée à la bonne largeur. Pour l'imprimante non-Star, il envoie `ESC { 1` puis les lignes de la dernière à la première, et le ticket suspendu se lit de haut en bas. Désactivable avec `PRINTER_UPSIDE_DOWN=false` dans `print-server/.env`. Commit 4a06b44, codeVersion `4388205ad77b`.
**Fichiers touchés :** `print-server/server.js`.
**À savoir / Pièges :** Ne plus retirer l'impression à l'envers : l'imprimante est montée à l'envers. Inverser par LIGNE PHYSIQUE (après le retour à la ligne), jamais par bloc de texte, sinon les lignes coupées se retrouvent inversées. Les tickets #3049/#3052 ont été imprimés AVANT la mise à jour (ancien code).
**Reste à faire :** METTRE_A_JOUR.bat au resto → `/status` doit afficher codeVersion `4388205ad77b` → ticket test.

## 2026-10-18 — Claude Code — Tickets découpés : plus de commandes Star vers l'imprimante Ethernet
**Fait :** Le ticket test #3047 sortait coupé en morceaux. Il venait de `formatCounterTicketClassic` (counterLayoutMode = classic), écrit en Star Line Mode pour la TSP100 USB, mais envoyé à l'imprimante Ethernet 192.168.1.200, qui est en **ESC/POS**. Sur ESC/POS, `ESC i` (taille Star) = COUPE PARTIELLE ; il n'y a pas de `ESC t 16`, donc `É`→`╔` et `•`→`ò` ; le QR Star s'imprime en texte. Corrigé : le classique caisse n'est utilisé que si isStar, sinon c'est le layout dynamique ESC/POS. Le classique cuisine (blocs inversés pour une impression à l'envers désactivée) renvoie toujours vers le dynamique ; l'ancien code est gardé sous `formatKitchenTicketClassicUpsideDown`, qui n'est plus appelé. Rendu vérifié : 0 `ESC i`, 1 seule coupe, codepage OK. Commit 4d19c30, codeVersion attendu au resto : `f58fc5d3549b`.
**Fichiers touchés :** `print-server/server.js`.
**À savoir / Pièges :** L'imprimante Ethernet 192.168.1.200 est ESC/POS (GS !, GS V, ESC t 16). Ne JAMAIS lui envoyer de commandes Star Line (`ESC i`, `ESC d n` = coupe chez Star, QR Star).
**Reste à faire :** Au resto : METTRE_A_JOUR.bat → vérifier que `/status` affiche codeVersion `f58fc5d3549b`, puis imprimer un ticket test.

## 2026-10-18 — Claude Code — Hub : relance du print-server périmé + plus jamais l'ancien Supabase cloud
**Fait :** « Rien n'a changé » au resto parce que (1) le Hub ne relance pas le print-server si le port 3001 répond, et `app.exit(0)` au relaunch laisse un process node orphelin qui tourne l'ancien code indéfiniment ; (2) la mise à jour fait `git checkout -- .env`, et le `.env` commité pointe encore vers l'ancien projet cloud `hsylnr…supabase.co` (toujours en ligne mais sans nouvelles commandes) → le print-server écoutait la mauvaise base. Corrigé : `/status` renvoie `codeVersion` (sha1 de server.js) + `supabaseUrl` ; le Hub compare au fichier, tue le process sur 3001 (netstat + taskkill) s'il est périmé et relance ; « Mettre à jour » relance toujours le print-server ; server.js remplace toute URL `*.supabase.co` par le VPS. Commit 48a93e0.
**Fichiers touchés :** `print-server/server.js`, `twinpizzahub/main.js`.
**À savoir / Pièges :** Le `.env` commité contient toujours l'URL cloud (commit refusé par les permissions) ; c'est neutralisé côté site (`client.ts`) et print-server. Pour vérifier au resto : `http://localhost:3001/status` doit montrer `codeVersion` et `supabaseUrl: https://supabase.twinpizza.fr`.
**Reste à faire :** Au resto : Mettre à jour dans le Hub (ou fermer le Hub + `taskkill /IM node.exe /F` + relancer), puis commande test POS + borne.

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

