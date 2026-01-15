# Twin Pizza WhatsApp Bot 🍕

Bot WhatsApp local pour envoyer des notifications automatiques aux clients.

## 📋 Prérequis

- Node.js 18+ installé
- WhatsApp sur votre téléphone

## 🚀 Installation

```bash
cd whatsapp-bot
npm install
```

## ▶️ Démarrage

```bash
npm start
```

## 📱 Première utilisation

1. Lancez le bot avec `npm start`
2. Un QR code apparaît dans le terminal
3. Ouvrez WhatsApp sur votre téléphone
4. Allez dans Paramètres > Appareils liés > Lier un appareil
5. Scannez le QR code
6. Le bot est connecté ! ✅

## 🔄 Fonctionnement

Le bot écoute automatiquement les nouvelles commandes depuis Supabase :

- **Nouvelle commande** → Message de confirmation au client
- **Commande prête** → Message "Votre commande est prête !"

## ⚠️ Important

- Votre PC doit rester allumé pour que le bot fonctionne
- Ne fermez pas la fenêtre du terminal
- La session WhatsApp est sauvegardée (pas besoin de re-scanner)

## 🛑 Arrêter le bot

Appuyez sur `Ctrl + C` dans le terminal.
