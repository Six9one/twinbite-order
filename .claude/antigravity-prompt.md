# Twin Pizza — Handoff : finir l'intégration paiement en ligne

Projet : `C:\Users\bguir\Desktop\twinbite-order`
Stack : Vite + React + TypeScript + Tailwind + Supabase (Postgres + Edge Functions) + myPOS IPC + serveur d'impression Node local.
Déploiement : push sur `main` → Vercel reconstruit twinpizza.fr automatiquement.
Supabase project ref : `hsylnrzxeyqxczdalurj`

---

## Contexte : ce qui vient d'être réparé (NE PAS CASSER)

Le paiement en ligne myPOS fonctionne maintenant de bout en bout. Trois règles à ne jamais violer :

1. **`supabase/functions/mypos-webhook/index.ts` doit TOUJOURS répondre `HTTP 200` avec le corps exact `"OK"`, sur tous les chemins de code, y compris les rejets et le `catch` final.** Si l'endpoint répond autre chose, myPOS annule le paiement et rembourse le client. Ça a coûté 4 transactions réelles. La validation de signature ne conditionne QUE l'écriture en base, jamais la réponse HTTP.

2. **Le webhook lit `Status` (pas `IPCStatus`)** dans les notifications `IPCPurchaseNotify`. Les deux sont acceptés dans le code actuel, garder ça.

3. **La commande est créée en base AVANT la redirection vers myPOS** (`src/components/NewCheckout.tsx`). Sinon la notification myPOS arrive et ne trouve aucune ligne à mettre à jour.

Secrets Supabase déjà configurés et vérifiés : `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_KEY` (certificat myPOS `C=BG, O=myPOS`), `MYPOS_KEY_INDEX=2`, `MYPOS_STORE_ID=1443168`, `MYPOS_WALLET_NUMBER=40364525077`, `MYPOS_ENV=production`. La vérification de signature fonctionne (`variant: base64(concat)`).

---

## Tâches à faire

### 1. Ticket imprimé — mention « PAYÉ EN LIGNE »

Fichier : `print-server/server.js` (serveur Node local, port 3001, lancé par l'app Electron `twinpizzahub`).

- Sur le ticket **cuisine** : un grand cadre noir avec `PAYÉ EN LIGNE` en gros, uniquement si `payment_method === 'en_ligne'` ET `payment_status === 'Paid'`. Pas d'IDs de transaction sur ce ticket.
- Sur le ticket **client** : le même cadre + le détail du paiement — montant encaissé (`payment_amount`), `transaction_id`, `payment_reference`, type de carte, date/heure (`paid_at`).
- Imprimante thermique 80 mm, ESC/POS. Regarder `printDualTickets()` et `logo-escpos.js` pour les conventions existantes.

### 2. Imprimer au bon moment pour les commandes en ligne

⚠️ Problème actuel : un trigger Postgres (`on_order_created_print`, migration `20251218001500_add_print_order_trigger.sql`) déclenche l'impression à la **création** de la commande. Pour une commande en ligne, ça imprime **avant** que le client ait payé — la cuisine prépare des commandes non payées.

À faire :
- Commandes `especes` / `cb` : imprimer à la création (comportement actuel, à garder).
- Commandes `en_ligne` : ne PAS imprimer à la création. Imprimer quand `payment_status` passe à `'Paid'` (souscription realtime sur UPDATE dans `print-server/server.js`, fonction `handleNewOrder`).

Ne pas casser le garde existant : `isTestOrder()` ignore les commandes dont `customer_name` commence par `[TEST]` (page `/test-paiement`). Le même garde existe dans `src/pages/TVDashboard.tsx`.

### 3. Écran de confirmation client

Fichier : `src/pages/PaymentSuccess.tsx` (actuellement quasi vide, affiche juste le numéro).

Route : `/payment/success?order=<order_number>`

À afficher en allant chercher la commande dans Supabase :
- Récapitulatif des articles avec quantités et prix
- Sous-total HT, TVA, total TTC
- Type de commande (emporter / livraison / sur place) et heure estimée
- Bloc paiement : montant payé, badge **PAYÉ EN LIGNE**, `transaction_id`, date/heure
- **Cas important** : le client peut arriver sur cette page avant que le webhook n'ait mis à jour la commande. Si `payment_status !== 'Paid'`, afficher « Confirmation du paiement en cours… » et re-interroger toutes les 2 s pendant ~30 s au lieu d'afficher une erreur.

### 4. Corriger la commande 1592

Elle est marquée `payment_status: 'Failed'` à tort — 0,10 € ont réellement été encaissés chez myPOS (visible dans le portail marchand). La passer à `'Paid'`. C'était le bug `Status`/`IPCStatus`, corrigé depuis.

---

## Où en est le reste

- `src/components/admin/OrdersManager.tsx` : nouveau module unique du dashboard admin (stats CA/jour/mois, filtres, détail commande avec IDs myPOS, réimpression, export CSV, annulation avec motif). Il remplace `OrdersHistoryManager` et l'ancien bloc « Commandes du Jour », tous deux supprimés.
- **Les commandes ne doivent JAMAIS être supprimées** (obligation comptable française). Annulation uniquement : `status: 'cancelled'` + motif obligatoire ajouté dans `customer_notes`. Les commandes annulées sont exclues du CA.
- `src/pages/TestPaiement.tsx` sur `/test-paiement` : page de test qui débite une vraie carte, sert à valider la chaîne complète.

---

## Deux actions manuelles pour le propriétaire (pas du code)

1. **Régénérer la clé privée myPOS** — l'actuelle a transité par une conversation de chat. Portail myPOS → Boutiques → Twin Pizza → Intégration → nouvelle configuration. Puis mettre à jour `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_KEY` et `MYPOS_KEY_INDEX` dans les secrets Supabase.
2. **Supprimer la clé index 1** dans le portail myPOS une fois l'index 2 confirmé en production.

---

## Vérification

Après chaque changement du webhook, tester que le protocole est respecté :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://hsylnrzxeyqxczdalurj.supabase.co/functions/v1/mypos-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "IPCmethod=IPCPurchaseNotify&OrderID=1584&Status=0&Amount=18.00&Currency=EUR"
```

Doit renvoyer `200` **et** ne rien modifier en base (pas de signature valide). Les logs sont dans le dashboard Supabase → Edge Functions → mypos-webhook → Logs.
