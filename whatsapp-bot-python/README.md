# 🍕 Twin Pizza WhatsApp Bot (Python)

Bot WhatsApp local pour envoyer des notifications de commandes automatiquement.

## 📋 Prérequis

- **Python 3.9+** installé
- **Google Chrome** installé
- Connexion internet stable

## 🚀 Installation

### 1. Ouvrir un terminal dans ce dossier

```powershell
cd c:\Users\Slicydicy\Documents\GitHub\twinbite-order\whatsapp-bot-python
```

### 2. Créer un environnement virtuel (recommandé)

```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 3. Installer les dépendances

```powershell
pip install -r requirements.txt
```

## ▶️ Lancer le bot

```powershell
python bot.py
```

## 📱 Première utilisation

1. Au démarrage, une fenêtre Chrome s'ouvre sur WhatsApp Web
2. **Scannez le QR code** avec votre téléphone (WhatsApp > Menu > Appareils connectés > Lier un appareil)
3. Une fois connecté, le bot écoute automatiquement les nouvelles commandes
4. Les notifications sont envoyées aux clients :
   - ✅ Quand une nouvelle commande est passée
   - 🎉 Quand une commande est prête

## ⚙️ Configuration

Modifiez le fichier `config.py` si nécessaire :

```python
SUPABASE_URL = 'votre-url-supabase'
SUPABASE_ANON_KEY = 'votre-clé-anon'
```

## 📁 Fichiers

- `bot.py` - Script principal du bot
- `config.py` - Configuration Supabase
- `requirements.txt` - Dépendances Python
- `whatsapp_session/` - Dossier de session (créé automatiquement)

## ⚠️ Notes importantes

- **Gardez la fenêtre Chrome ouverte** - Le bot utilise WhatsApp Web
- **Votre PC doit rester allumé** - C'est un bot local
- **Session persistante** - Pas besoin de rescanner le QR code à chaque fois
- **Mode Polling** - Vérifie les nouvelles commandes toutes les 10 secondes

## 🛑 Arrêter le bot

Appuyez sur `Ctrl+C` dans le terminal.

## 🔧 Dépannage

### Le navigateur ne s'ouvre pas
- Vérifiez que Chrome est installé
- Le ChromeDriver sera téléchargé automatiquement

### QR Code expiré
- Relancez le bot avec `python bot.py`

### Messages non envoyés
- Vérifiez que WhatsApp Web est connecté
- Vérifiez le format des numéros de téléphone

## 📞 Support

En cas de problème, vérifiez :
1. La console pour les messages d'erreur
2. Que Chrome est à jour
3. Que votre connexion internet fonctionne
