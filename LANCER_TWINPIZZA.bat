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
:: ETAPE 1 - Ecrire les fichiers .env
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
:: ETAPE 2 - Verifier Node.js
:: ===================================================
echo.
echo  [2/4] Verification Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ============================================================
    echo   ERREUR : Node.js introuvable !
    echo   Lancez INSTALLER.bat d'abord.
    echo  ============================================================
    pause
    exit /b 1
)
for /f %%v in ('node --version') do echo  OK  Node.js %%v

:: Verifier que electron.exe existe
set ELECTRON_EXE=%~dp0twinpizzahub\node_modules\electron\dist\electron.exe
if not exist "!ELECTRON_EXE!" (
    echo.
    echo  Electron manquant - installation en cours...
    cd /d "%~dp0twinpizzahub"
    call npm install
    cd /d "%~dp0"
)
if not exist "!ELECTRON_EXE!" (
    echo.
    echo  ============================================================
    echo   ERREUR : electron.exe introuvable meme apres npm install !
    echo   Chemin : !ELECTRON_EXE!
    echo   Lancez INSTALLER.bat
    echo  ============================================================
    pause
    exit /b 1
)
echo  OK  Electron trouve.

:: Verifier print-server
if not exist "%~dp0print-server\node_modules\express" (
    echo  Installation packages impression...
    cd /d "%~dp0print-server"
    call npm install
    cd /d "%~dp0"
)

:: ===================================================
:: ETAPE 3 - Build si absent
:: ===================================================
echo.
echo  [3/4] Verification du build...
if not exist "%~dp0dist\index.html" (
    echo  Construction de l'application (2-4 min)...
    call npm install
    call npm run build
    if errorlevel 1 (
        echo.
        echo  ============================================================
        echo   ERREUR : La construction a echoue !
        echo   Verifiez les messages ci-dessus.
        echo  ============================================================
        pause
        exit /b 1
    )
    echo  OK  Application construite.
)
echo  OK  Build present.

:: ===================================================
:: ETAPE 4 - Demarrer serveur impression + Electron
:: ===================================================
echo.
echo  [4/4] Demarrage...

:: Tuer un ancien serveur d'impression si present
taskkill /FI "WINDOWTITLE eq TwinPizza-PrintServer" /F >nul 2>&1

:: Serveur d'impression en arriere-plan
echo  Demarrage serveur d'impression (port 3001)...
start "TwinPizza-PrintServer" /min cmd /c "cd /d "%~dp0print-server" && node server.js"
timeout /t 2 /nobreak >nul

:: Fichier log pour capturer les erreurs electron
set LOG_FILE=%~dp0twinpizzahub\electron-crash.log

echo  Lancement TwinPizza Hub...
echo  (La fenetre Hub s'ouvre maintenant)
echo  (Cette fenetre peut etre minimisee)
echo.

:: Lancer Electron et capturer sa sortie dans un log
cd /d "%~dp0twinpizzahub"
set START_TIME=%TIME%
"!ELECTRON_EXE!" . --enable-logging 2>"!LOG_FILE!"
set EXIT_CODE=!ERRORLEVEL!
cd /d "%~dp0"

:: Arreter le serveur d'impression
taskkill /FI "WINDOWTITLE eq TwinPizza-PrintServer" /F >nul 2>&1

:: Calculer duree (si exit trop rapide = crash)
if !EXIT_CODE! NEQ 0 (
    echo.
    echo  ============================================================
    echo   ERREUR : TwinPizza Hub a quitte avec le code !EXIT_CODE!
    echo.
    echo   DERNIERS LOGS D'ERREUR :
    echo  ============================================================
    if exist "!LOG_FILE!" (
        type "!LOG_FILE!"
    ) else (
        echo   (aucun log disponible)
    )
    echo  ============================================================
    echo.
    echo  Solutions :
    echo    1. Relancer ce fichier
    echo    2. Executer METTRE_A_JOUR.bat
    echo    3. Executer INSTALLER.bat si le probleme persiste
    echo.
    pause
    exit /b !EXIT_CODE!
)

exit /b 0
