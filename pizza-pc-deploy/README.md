# Twin Pizza - Déploiement PC Restaurant

Ce dossier contient tout le nécessaire pour installer le système de notifications automatiques sur le PC de la pizzeria.

## 📦 Contenu

- **WhatsApp Bot** - Envoie les confirmations de commande par WhatsApp
- **Print Server** - Imprime les tickets automatiquement
- **Auto-Updater** - Mise à jour automatique depuis GitHub

---

## 🚀 Installation (une seule fois)

1. **Cloner le repo sur le PC Pizza** (si pas déjà fait):
   ```
   git clone https://github.com/Six9one/twinbite-order.git
   ```

2. **Exécuter l'installation** :
   - Ouvrir le dossier `pizza-pc-deploy`
   - Clic droit sur `INSTALL.bat` → **"Exécuter en tant qu'administrateur"**
   - Suivre les instructions

3. **Scanner le QR Code WhatsApp** :
   - La première fois, une fenêtre Chrome s'ouvre
   - Scanner le QR code avec WhatsApp sur votre téléphone
   - (Menu WhatsApp → Appareils connectés → Lier un appareil)

4. **C'est tout !** Les services démarreront automatiquement.

---

## 📁 Emplacement d'installation

Tout est installé dans : `C:\TwinPizza`

```
C:\TwinPizza\
├── whatsapp-bot\       ← Bot WhatsApp
├── print-server\       ← Serveur d'impression
├── scripts\            ← Scripts de gestion
├── auto-updater\       ← Mise à jour auto
└── logs\               ← Journaux
```

---

## 🔧 Commandes utiles

| Action | Fichier à exécuter |
|--------|-------------------|
| Démarrer tous les services | `C:\TwinPizza\START_ALL.vbs` |
| Démarrer (avec fenêtres visibles) | `C:\TwinPizza\scripts\START_ALL.bat` |
| Arrêter tous les services | `C:\TwinPizza\scripts\STOP_ALL.bat` |
| Mettre à jour manuellement | `C:\TwinPizza\UPDATE.bat` |

---

## 🔄 Mises à jour automatiques

Le système vérifie GitHub **toutes les 6 heures** :
1. Détecte les nouveaux commits
2. Arrête les services
3. Télécharge les mises à jour
4. Redémarre les services

Les logs sont dans : `C:\TwinPizza\logs\auto-updater.log`

---

## ❌ Désinstallation

Pour désinstaller complètement :

1. Exécuter `UNINSTALL.bat` en tant qu'administrateur
2. Cela supprimera :
   - Les tâches planifiées Windows
   - Le dossier `C:\TwinPizza`

---

## 🛠️ Dépannage

### Le bot WhatsApp ne démarre pas
1. Vérifier que Chrome est installé
2. Vérifier que Python est installé
3. Regarder les logs : `C:\TwinPizza\logs\`

### L'imprimante ne fonctionne pas
1. Vérifier que l'imprimante est allumée et connectée
2. Vérifier le fichier `.env` dans `print-server` (IP correcte ?)
3. Regarder les logs : `C:\TwinPizza\logs\`

### WhatsApp demande de re-scanner le QR code
Normal si le PC a été éteint longtemps. Exécuter `START_ALL.bat` (avec fenêtres) et rescanner.

---

## 📞 Support

En cas de problème, contacter l'équipe de développement ou consulter les logs dans `C:\TwinPizza\logs\`.
