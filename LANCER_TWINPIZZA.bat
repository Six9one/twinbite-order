@echo off
setlocal EnableDelayedExpansion
title TwinPizza Hub - Demarrage
color 0A
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              🍕  TWINPIZZA HUB  -  DEMARRAGE               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: ── Verifier que Node.js est present ─────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ Node.js introuvable ! Lancez d'abord INSTALLER.bat
    pause
    exit /b 1
)

:: ── Verifier que les packages sont installes ─────────────────────────────────
if not exist "%~dp0twinpizzahub\node_modules\electron" (
    echo  ⚠️  Packages manquants - Installation automatique...
    cd /d "%~dp0twinpizzahub"
    call npm install --silent
    cd /d "%~dp0"
)

:: ── Verifier ou construire le build de l'application ─────────────────────────
if not exist "%~dp0dist\index.html" (
    echo  ⚙️  Premiere utilisation - Construction de l'application...
    echo      (2-4 minutes, une seule fois)
    call npm install --silent
    call npm run build
    if errorlevel 1 (
        echo  ❌ Erreur lors du build. Lancez INSTALLER.bat
        pause
        exit /b 1
    )
    echo  ✅ Application construite.
)

if not exist "%~dp0print-server\node_modules\express" (
    echo  ⚙️  Installation serveur impression...
    cd /d "%~dp0print-server"
    call npm install --silent
    cd /d "%~dp0"
)

:: ── Lancer TwinPizza Hub (Electron gere tout: fichiers, impression) ───────────
echo  ✅ Tout est pret !
echo  🚀 Lancement de TwinPizza Hub...
echo.
echo  (La fenetre Hub va s'ouvrir dans quelques secondes)
echo  (Ne fermez pas cette fenetre noire)
echo.

cd /d "%~dp0twinpizzahub"
"%~dp0twinpizzahub\node_modules\electron\dist\electron.exe" .
set EXIT_CODE=%ERRORLEVEL%
cd /d "%~dp0"

:: ── Quand l'app se ferme ──────────────────────────────────────────────────────
if !EXIT_CODE! NEQ 0 (
    echo.
    echo  ❌ L'application a quitte avec une erreur (code: !EXIT_CODE!)
    echo.
    echo  Solutions possibles :
    echo    1. Relancer ce script
    echo    2. Si probleme de build : lancez METTRE_A_JOUR.bat
    echo    3. Si premiere fois : lancez INSTALLER.bat
    echo.
    pause
) else (
    echo.
    echo  👋 TwinPizza Hub ferme normalement.
)
exit /b !EXIT_CODE!
