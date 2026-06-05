@echo off
setlocal EnableDelayedExpansion
title TwinPizza Hub - Demarrage
color 0A
cd /d "%~dp0"

echo.
echo  +--------------------------------------------------------------+
echo  ^|             TWINPIZZA HUB  -  DEMARRAGE                     ^|
echo  +--------------------------------------------------------------+
echo.

:: ===================================================
:: ETAPE 1 - Toujours ecrire les fichiers .env
:: (fait a chaque lancement - ne jamais sauter cette etape)
:: ===================================================
echo  [1/4] Ecriture des fichiers de configuration...

(
echo VITE_SUPABASE_PROJECT_ID=hsylnrzxeyqxczdalurj
echo VITE_SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1Ijoic2FwaG91dSIsImEiOiJjbWxkeGx3ZnExZGd6M2dwa29jbWQxY280In0.58_v8unUiqxjtjr-QhalMw
echo PRINTER_IP=192.168.1.100
echo PRINTER_PORT=9100
) > "%~dp0.env"

(
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo PRINTER_IPS=192.168.1.200
echo PRINTER_PORT=9100
echo USB_PRINTER_NAME=
) > "%~dp0print-server\.env"

echo  OK  Fichiers .env ecrits.

:: ===================================================
:: ETAPE 2 - Verifier Node.js et packages
:: ===================================================
echo.
echo  [2/4] Verification Node.js et packages...
node --version >nul 2>&1
if errorlevel 1 goto :no_node

if not exist "%~dp0twinpizzahub\node_modules\electron" (
    echo  Installation packages Hub...
    cd /d "%~dp0twinpizzahub"
    call npm install
    cd /d "%~dp0"
)
if not exist "%~dp0print-server\node_modules\express" (
    echo  Installation packages impression...
    cd /d "%~dp0print-server"
    call npm install
    cd /d "%~dp0"
)
echo  OK  Packages presents.

:: ===================================================
:: ETAPE 3 - Build si absent
:: ===================================================
echo.
echo  [3/4] Verification du build...
if not exist "%~dp0dist\index.html" (
    echo  Construction de l'application (2-4 min, premiere fois)...
    call npm install
    call npm run build
    if errorlevel 1 goto :build_error
    echo  OK  Application construite.
)
echo  OK  Build present.

:: ===================================================
:: ETAPE 4 - Demarrer le serveur d'impression
:: puis lancer Electron
:: ===================================================
echo.
echo  [4/4] Demarrage des serveurs...

:: Tuer un eventuel ancien serveur d'impression
taskkill /FI "WINDOWTITLE eq TwinPizza-PrintServer" /F >nul 2>&1

:: Demarrer le serveur d'impression en arriere-plan (fenetre minimisee)
echo  Demarrage serveur d'impression (port 3001)...
start "TwinPizza-PrintServer" /min cmd /c "cd /d "%~dp0print-server" && node server.js"

:: Attendre 3 secondes que le serveur demarre
timeout /t 3 /nobreak >nul

:: Lancer TwinPizza Hub
echo  Lancement TwinPizza Hub...
echo.
echo  (La fenetre Hub s'ouvre maintenant)
echo  (Cette fenetre peut etre minimisee)
echo.
cd /d "%~dp0twinpizzahub"
"%~dp0twinpizzahub\node_modules\electron\dist\electron.exe" .
set EXIT_CODE=%ERRORLEVEL%
cd /d "%~dp0"

:: Quand Electron se ferme, arreter le serveur d'impression aussi
echo  Fermeture du serveur d'impression...
taskkill /FI "WINDOWTITLE eq TwinPizza-PrintServer" /F >nul 2>&1

if !EXIT_CODE! NEQ 0 (
    echo.
    echo  ERREUR : L'application a quitte avec le code !EXIT_CODE!
    echo  Solutions : relancer ce script ou executer METTRE_A_JOUR.bat
    pause
)
exit /b !EXIT_CODE!

:no_node
echo  ERREUR : Node.js introuvable. Lancez d'abord INSTALLER.bat
pause
exit /b 1

:build_error
echo  ERREUR lors du build. Lancez INSTALLER.bat
pause
exit /b 1
