# 🍕 TwinPizza Hub — Guide de démarrage

## Sur un nouveau PC de restaurant (première fois)

### Étape 1 — Ouvrir PowerShell et cloner le projet

```
git clone https://github.com/VOTRE-COMPTE/twinbite-order.git
cd twinbite-order
```

> Si Git n'est pas installé : `INSTALLER.bat` le fait automatiquement.

### Étape 2 — Lancer l'installation (une seule fois)

Double-cliquez sur **`INSTALLER.bat`**

Ce script fait **tout automatiquement** :
- ✅ Installe Git (si absent)
- ✅ Installe Node.js (si absent)
- ✅ `git clone` si pas encore fait
- ✅ Installe tous les packages (`npm install` × 3)
- ✅ Compile l'application (`npm run build`)
- ✅ Crée un raccourci **"TwinPizza Hub"** sur le bureau

---

## Chaque jour — Démarrer

Double-clic sur **`TwinPizza Hub`** (bureau) ou **`LANCER_TWINPIZZA.bat`**

---

## Après avoir poussé du nouveau code

Sur le PC restaurant, double-clic sur **`METTRE_A_JOUR.bat`**

Il fait :
1. `git pull` — récupère les nouveaux changements
2. `npm install` — installe les nouveaux packages si besoin
3. `npm run build` — recompile
4. Propose de relancer l'app

---

## Résumé des scripts

| Fichier | Quand l'utiliser |
|---------|-----------------|
| `INSTALLER.bat` | **Une seule fois** sur un nouveau PC |
| `LANCER_TWINPIZZA.bat` | **Chaque jour** pour démarrer |
| `METTRE_A_JOUR.bat` | **Après un `git push`** depuis votre PC dev |
