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

:: Verifier Node.js
node --version >nul 2>&1
if errorlevel 1 goto :no_node

:: Verifier packages Electron
if not exist "%~dp0twinpizzahub\node_modules\electron" goto :install_hub

:: Verifier build
if not exist "%~dp0dist\index.html" goto :do_build

:: Verifier packages print-server
if not exist "%~dp0print-server\node_modules\express" goto :install_print

goto :launch

:no_node
echo  ERREUR : Node.js introuvable. Lancez d'abord INSTALLER.bat
pause
exit /b 1

:install_hub
echo  Installation des packages Hub...
cd /d "%~dp0twinpizzahub"
call npm install --silent
cd /d "%~dp0"

:install_print
if exist "%~dp0print-server\package.json" (
    echo  Installation packages impression...
    cd /d "%~dp0print-server"
    call npm install --silent
    cd /d "%~dp0"
)
if not exist "%~dp0dist\index.html" goto :do_build
goto :launch

:do_build
echo  Premiere utilisation - Construction de l'application (2-4 min)...
call npm install --silent
call npm run build
if errorlevel 1 (
    echo  ERREUR lors du build. Lancez INSTALLER.bat
    pause
    exit /b 1
)
echo  OK  Application construite.

:launch
echo  OK  Tout est pret. Lancement de TwinPizza Hub...
echo.
echo  (La fenetre Hub s'ouvre dans quelques secondes)
echo  (Ne fermez pas cette fenetre)
echo.

cd /d "%~dp0twinpizzahub"
"%~dp0twinpizzahub\node_modules\electron\dist\electron.exe" .
set EXIT_CODE=%ERRORLEVEL%
cd /d "%~dp0"

if !EXIT_CODE! NEQ 0 (
    echo.
    echo  L'application a quitte avec une erreur (code: !EXIT_CODE!)
    echo.
    echo  Solutions :
    echo    1. Relancer ce script
    echo    2. Si probleme de build : lancez METTRE_A_JOUR.bat
    echo    3. Si premiere fois    : lancez INSTALLER.bat
    echo.
    pause
)
exit /b !EXIT_CODE!
