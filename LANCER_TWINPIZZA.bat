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
:: ETAPE 0 - Creer les fichiers .env si absents
:: (fait a chaque lancement pour etre sur)
:: ===================================================
echo  Verification des fichiers de configuration...

if not exist "%~dp0.env" goto :write_root_env
for %%A in ("%~dp0.env") do if %%~zA LSS 20 goto :write_root_env
goto :check_printenv

:write_root_env
echo  Creation du fichier .env principal...
(
echo VITE_SUPABASE_PROJECT_ID=hsylnrzxeyqxczdalurj
echo VITE_SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1Ijoic2FwaG91dSIsImEiOiJjbWxkeGx3ZnExZGd6M2dwa29jbWQxY280In0.58_v8unUiqxjtjr-QhalMw
echo PRINTER_IP=192.168.1.100
echo PRINTER_PORT=9100
) > "%~dp0.env"
echo  OK  .env cree.

:check_printenv
if not exist "%~dp0print-server\.env" goto :write_printenv
for %%A in ("%~dp0print-server\.env") do if %%~zA LSS 20 goto :write_printenv
goto :check_node

:write_printenv
echo  Creation de print-server/.env...
(
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo PRINTER_IPS=192.168.1.1,192.168.1.200
echo PRINTER_PORT=9100
echo USB_PRINTER_NAME=
) > "%~dp0print-server\.env"
echo  OK  print-server/.env cree.

:: ===================================================
:: ETAPE 1 - Verifier Node.js
:: ===================================================
:check_node
node --version >nul 2>&1
if errorlevel 1 goto :no_node

:: ===================================================
:: ETAPE 2 - Installer packages si manquants
:: ===================================================
if not exist "%~dp0twinpizzahub\node_modules\electron" goto :install_hub
if not exist "%~dp0print-server\node_modules\express" goto :install_print
goto :check_build

:install_hub
echo  Installation des packages Hub (premiere fois)...
cd /d "%~dp0twinpizzahub"
call npm install
cd /d "%~dp0"

:install_print
if exist "%~dp0print-server\package.json" (
    echo  Installation packages impression (premiere fois)...
    cd /d "%~dp0print-server"
    call npm install
    cd /d "%~dp0"
)

:: ===================================================
:: ETAPE 3 - Build si absent
:: ===================================================
:check_build
if exist "%~dp0dist\index.html" goto :launch
echo  Premiere utilisation - Construction de l'application (2-4 min)...
call npm install
call npm run build
if errorlevel 1 goto :build_error
echo  OK  Application construite.

:: ===================================================
:: LANCEMENT
:: ===================================================
:launch
echo  OK  Tout est pret. Lancement de TwinPizza Hub...
echo.
echo  (La fenetre Hub s'ouvre dans quelques secondes)
echo  (Ne fermez pas cette fenetre noire)
echo.
cd /d "%~dp0twinpizzahub"
"%~dp0twinpizzahub\node_modules\electron\dist\electron.exe" .
set EXIT_CODE=%ERRORLEVEL%
cd /d "%~dp0"
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
