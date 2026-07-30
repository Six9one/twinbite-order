# Documentation d'intégration myPOS Checkout - Twin Pizza

Ce document explique le fonctionnement, la configuration des variables d'environnement et le déploiement du module de paiement **myPOS Online Payments** pour Twin Pizza.

---

## 1. Architecture & Sécurité

L'intégration repose sur le protocole officiel **myPOS IPC (Integrated Payment Checkout)**.

- **Sécurité des clés** : Aucun identifiant (Store ID, Wallet Number, Clé privée RSA) n'est exposé côté navigateur (Frontend).
- **Règles d'interaction** :
  1. Le client valide son panier et choisit **Payer en ligne (myPOS)**.
  2. Le frontend appelle l'Edge Function Supabase `create-mypos-checkout`.
  3. L'Edge Function génère la signature **RSA-SHA256** officielle de la demande d'achat `IPCPurchase` et retourne le formulaire sécurisé de redirection.
  4. Le client est redirigé automatiquement vers l'interface sécurisée hébergée par myPOS (prenant en charge Apple Pay, Google Pay, Visa, Mastercard).
  5. En cas de paiement réussi, myPOS notifie le serveur Supabase via le Webhook `mypos-webhook` (`IPCPurchaseNotify`), qui vérifie la signature avec la clé publique myPOS et enregistre la commande validée (`payment_status = 'Paid'`).
  6. Le client est redirigé vers `/payment/success` ou `/payment/cancel`.

---

## 2. Configuration des Variables d'Environnement (Supabase Secrets)

Dans votre tableau de bord **Supabase** (Projet > Settings > Edge Functions > Secrets) ou via la CLI Supabase :

```bash
supabase secrets set MYPOS_STORE_ID="000000000000000"
supabase secrets set MYPOS_WALLET_NUMBER="0000000000"
supabase secrets set MYPOS_KEY_INDEX="1"
supabase secrets set MYPOS_ENV="sandbox" # Utiliser "production" en production
supabase secrets set MYPOS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
supabase secrets set MYPOS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

### Explication des secrets :

| Variable | Description | Emplacement dans le portail myPOS |
|---|---|---|
| `MYPOS_STORE_ID` | Identifiant du magasin (Store ID / SID) à 15 chiffres | Compte myPOS > Bannières d'achats / Mon magasin > Store ID |
| `MYPOS_WALLET_NUMBER` | Numéro de compte / client myPOS à 10 chiffres | Compte myPOS > Informations de compte > Numéro de client |
| `MYPOS_KEY_INDEX` | Index de la clé RSA configurée (généralement `1`) | Compte myPOS > Clés d'API / Key Index |
| `MYPOS_ENV` | Environnement (`sandbox` pour tests, `production` pour les vrais paiements) | Détermine l'URL de paiement myPOS |
| `MYPOS_PRIVATE_KEY` | Clé privée RSA 2048-bit générée pour Twin Pizza (Format PEM) | Générée par vos soins ou le portail |
| `MYPOS_PUBLIC_KEY` | Clé publique RSA transmise par myPOS pour vérifier le Webhook | Téléchargeable depuis le portail marchand myPOS |

---

## 3. Configuration du Webhook server-to-server dans myPOS

Pour que myPOS valide automatiquement les commandes payées dans votre base de données Supabase, configurez l'URL de notification suivante dans votre portail marchand myPOS :

```
https://<VOTRE-PROJET-SUPABASE>.supabase.co/functions/v1/mypos-webhook
```

- **Méthode d'appel** : HTTP `POST` (`application/x-www-form-urlencoded`)
- **Réponse attendue par myPOS** : Statut HTTP `200 OK` avec corps texte exact `"OK"`.

---

## 4. Migration Base de Données

Exécutez le script SQL `supabase/migrations/20260730000000_add_mypos_payment_columns.sql` dans votre console Supabase SQL Editor :

```sql
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'EUR';
```

---

## 5. Test et Validation

1. **Test en Bac à Sable (Sandbox)** :
   - Réglez `MYPOS_ENV="sandbox"`.
   - Utilisez les cartes de test fournies par myPOS.
   - Vérifiez la redirection vers `/payment/success?order=...` et la mise à jour du statut `Paid` dans le Dashboard Admin Twin Pizza.

2. **Passage en Production** :
   - Réglez `MYPOS_ENV="production"`.
   - Remplacez le `MYPOS_STORE_ID`, `MYPOS_WALLET_NUMBER` et la paire de clés RSA par vos clés de production.
