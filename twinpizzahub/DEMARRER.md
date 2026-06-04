# TwinPizza Hub — Guide de démarrage

## Première fois

```bash
# 1. Aller dans le dossier electron
cd twinpizzahub

# 2. Installer les dépendances Electron
npm install

# 3. Lancer en mode développement
#    (le site Vite doit tourner en parallèle sur localhost:8080)
npm run dev
```

## Lancer en développement (2 terminaux)

**Terminal 1 — Site Vite:**
```bash
cd twinbite-order   # dossier parent
npm run dev
```

**Terminal 2 — Electron Hub:**
```bash
cd twinbite-order/twinpizzahub
npm run dev
```

## Créer l'installateur Windows (.exe)

```bash
# 1. D'abord builder le site web
npm run build:web

# 2. Packager en .exe
npm run dist:win
```
Le fichier `.exe` sera dans `twinpizzahub/dist-electron/`.

## Copier sur un autre PC

Copier le dossier `twinbite-order/` entier sur l'autre PC.
Sur l'autre PC, refaire `npm install` dans les deux dossiers,
puis `npm run dev` dans les deux terminaux.

Ou utiliser le `.exe` généré — il s'installe sans Node.js.

## Écrans disponibles

| Bouton | Route | Description |
|---|---|---|
| POS / Admin | /admin/dashboard | Gestion complète |
| Écran TV | /tv | S'ouvre sur l'écran 2 automatiquement |
| Borne Kiosque | /kiosk | Self-service client |
| HACCP / Kitchen | /kitchen | Cuisine & traçabilité |
| Crew | /crew | Équipe & stock |
| Site Client | / | Site de commande |
