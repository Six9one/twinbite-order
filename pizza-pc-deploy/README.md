# Twin Pizza - Installation PC Restaurant

## Installation Simple (3 étapes)

### Étape 1: Cloner le projet
Ouvrez **PowerShell** ou **Invite de commandes** et tapez:
```
git clone https://github.com/Six9one/twinbite-order.git C:\twinbite-order
```

### Étape 2: Lancer l'installation
1. Ouvrez le dossier `C:\twinbite-order\pizza-pc-deploy`
2. **Clic droit** sur `INSTALL.bat`
3. Choisissez **"Exécuter en tant qu'administrateur"**
4. Attendez que l'installation se termine
5. Tapez `O` quand on vous demande de démarrer

### Étape 3: Scanner le QR Code WhatsApp
1. Une fenêtre Chrome s'ouvre avec WhatsApp Web
2. Sur votre téléphone: **WhatsApp → ⋮ Menu → Appareils connectés → Lier un appareil**
3. Scannez le QR code

**C'est tout!** Les services démarreront automatiquement à chaque démarrage du PC.

---

## Commandes utiles

| Action | Comment |
|--------|---------|
| Démarrer les services | Double-cliquez `C:\TwinPizza\scripts\START_ALL.bat` |
| Arrêter les services | Double-cliquez `C:\TwinPizza\scripts\STOP_ALL.bat` |
| Mettre à jour | Double-cliquez `C:\TwinPizza\UPDATE.bat` |

---

## En cas de problème

1. Vérifiez que **Python** est installé: `python --version`
2. Vérifiez que **Node.js** est installé: `node --version`
3. Vérifiez que **Git** est installé: `git --version`
4. Regardez les logs dans `C:\TwinPizza\logs\`
