@echo off
setlocal EnableDelayedExpansion
title TwinPizza Hub - Installation
color 0A
cd /d "%~dp0"

echo.
echo  +--------------------------------------------------------------+
echo  ^|          TWINPIZZA HUB  -  INSTALLATION                     ^|
echo  ^|        Premier demarrage sur ce PC de restaurant            ^|
echo  +--------------------------------------------------------------+
echo.
echo  Ce script installe et configure tout automatiquement.
echo  Duree estimee : 5 a 10 minutes selon la connexion internet.
echo.
pause

:: ===================================================
:: ETAPE 1 - Verifier / Installer Git
:: ===================================================
echo.
echo  [1/7] Verification de Git...
git --version >nul 2>&1
if errorlevel 1 goto :no_git
for /f "tokens=*" %%v in ('git --version 2^>nul') do set GIT_VER=%%v
echo  OK  !GIT_VER! detecte.
goto :check_node

:no_git
echo  ATTENTION : Git n'est pas installe. Installation automatique...
winget install --id Git.Git --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :git_manual
set "PATH=%PATH%;C:\Program Files\Git\cmd"
git --version >nul 2>&1
if errorlevel 1 goto :git_restart
for /f "tokens=*" %%v in ('git --version 2^>nul') do set GIT_VER=%%v
echo  OK  !GIT_VER! detecte.
goto :check_node

:git_manual
echo.
echo  ERREUR : Impossible d'installer Git automatiquement.
echo  Telechargez-le sur : https://git-scm.com/download/win
echo  Puis relancez ce script.
pause
exit /b 1

:git_restart
echo  Git installe. Fermez ce script et relancez-le.
pause
exit /b 0

:: ===================================================
:: ETAPE 2 - Verifier / Installer Node.js
:: ===================================================
:check_node
echo.
echo  [2/7] Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 goto :no_node
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  OK  Node.js !NODE_VER! detecte.
goto :git_sync

:no_node
echo  ATTENTION : Node.js n'est pas installe. Installation automatique...
winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :node_manual
set "PATH=%PATH%;C:\Program Files\nodejs"
node --version >nul 2>&1
if errorlevel 1 goto :node_restart
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  OK  Node.js !NODE_VER! detecte.
goto :git_sync

:node_manual
echo.
echo  ERREUR : Impossible d'installer Node.js automatiquement.
echo  Telechargez-le sur : https://nodejs.org  (version LTS)
echo  Puis relancez ce script.
pause
exit /b 1

:node_restart
echo  Node.js installe. Fermez ce script et relancez-le.
pause
exit /b 0

:: ===================================================
:: ETAPE 3 - Git pull (deja dans le repo)
:: ===================================================
:git_sync
echo.
echo  [3/7] Mise a jour du code source (git pull)...
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 goto :not_a_repo
git pull
echo  OK  Code source a jour.
goto :check_env

:not_a_repo
echo  Ce dossier n'est pas un depot Git.
echo  Lancez d'abord : git clone https://github.com/Six9one/twinbite-order.git
pause
exit /b 1

:: ===================================================
:: ETAPE 4 - Fichiers .env (crees avec les vraies cles)
:: ===================================================
:check_env
echo.
echo  [4/7] Creation des fichiers de configuration...

:: Root .env
echo  Ecriture de .env...
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

:: print-server/.env
echo  Ecriture de print-server/.env...
(
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo PRINTER_IPS=192.168.1.1,192.168.1.200
echo PRINTER_PORT=9100
echo USB_PRINTER_NAME=
) > "%~dp0print-server\.env"
echo  OK  print-server/.env cree.

:: ===================================================
:: ETAPE 5 - npm install
:: ===================================================
echo.
echo  [5/7] Installation des packages npm...
echo    Application web...
call npm install
if errorlevel 1 goto :npm_error

echo    TwinPizza Hub (Electron)...
cd /d "%~dp0twinpizzahub"
call npm install
if errorlevel 1 goto :npm_error
cd /d "%~dp0"

if exist "%~dp0print-server\package.json" (
    echo    Serveur d'impression...
    cd /d "%~dp0print-server"
    call npm install
    cd /d "%~dp0"
)
echo  OK  Tous les packages installes.
goto :build

:npm_error
echo  ERREUR lors de npm install. Verifiez la connexion internet.
pause
exit /b 1

:: ===================================================
:: ETAPE 6 - Build
:: ===================================================
:build
echo.
echo  [6/7] Construction de l'application (2-4 min)...
call npm run build
if errorlevel 1 goto :build_error
if not exist "%~dp0dist\index.html" goto :build_error
echo  OK  Application construite.
goto :shortcut

:build_error
echo  ERREUR lors du build. Verifiez les logs ci-dessus.
pause
exit /b 1

:: ===================================================
:: ETAPE 7 - Raccourci bureau
:: ===================================================
:shortcut
echo.
echo  [7/7] Creation du raccourci sur le bureau...
set "DESK=%USERPROFILE%\Desktop"
set "LAUNCH=%~dp0LANCER_TWINPIZZA.bat"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%DESK%\TwinPizza Hub.lnk'); $s.TargetPath='%LAUNCH%'; $s.WorkingDirectory='%~dp0'; $s.Description='Lancer TwinPizza Hub'; $s.Save()"
if exist "%DESK%\TwinPizza Hub.lnk" (
    echo  OK  Raccourci cree sur le bureau.
) else (
    echo  Raccourci non cree - utilisez LANCER_TWINPIZZA.bat directement.
)

:: ===================================================
:: TERMINE
:: ===================================================
echo.
echo  +--------------------------------------------------------------+
echo  ^|  INSTALLATION TERMINEE AVEC SUCCES !                       ^|
echo  ^|                                                              ^|
echo  ^|  Chaque jour : double-clic "TwinPizza Hub" sur le bureau    ^|
echo  ^|  Apres une MAJ : lancez METTRE_A_JOUR.bat                   ^|
echo  +--------------------------------------------------------------+
echo.
set /p LAUNCH_NOW="  Lancer TwinPizza Hub maintenant ? (O/N) : "
if /i "!LAUNCH_NOW!"=="O" start "" "%~dp0LANCER_TWINPIZZA.bat"
exit /b 0
