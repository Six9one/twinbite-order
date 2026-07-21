@echo off
setlocal EnableDelayedExpansion
title TwinPizza Hub - Mise a jour
color 0E
cd /d "%~dp0"

echo.
echo  +--------------------------------------------------------------+
echo  ^|           TWINPIZZA HUB  -  MISE A JOUR                     ^|
echo  ^|  Telecharge les derniers changements et reconstruit          ^|
echo  +--------------------------------------------------------------+
echo.
:: Lancer le nettoyage
:: Fermer l'app si elle tourne
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /I "electron.exe" >nul
if not errorlevel 1 (
    echo  Fermeture de TwinPizza Hub...
    taskkill /IM electron.exe /F >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: git pull
echo.
echo  [1/3] Telechargement des derniers changements (git pull)...
git checkout -- twinpizzahub/package-lock.json >nul 2>&1
git checkout -- package-lock.json >nul 2>&1
git checkout -- .env >nul 2>&1
git checkout -- print-server/printed_orders.json >nul 2>&1
git stash >nul 2>&1
git pull
if errorlevel 1 (
    echo  ATTENTION : git pull a echoue. On continue avec la version locale.
) else (
    echo  OK  Code mis a jour.
)

:: npm install
echo.
echo  [2/3] Verification des packages...
git rev-parse HEAD@{1} >nul 2>&1
if not errorlevel 1 (
    git diff --name-only HEAD@{1} HEAD | findstr /i "package.json package-lock.json" >nul
    if errorlevel 1 (
        echo  OK  Packages deja a jour. Saut de l'installation npm install.
    ) else (
        echo  Packages modifies. Execution de npm install...
        call npm install --silent
        cd /d "%~dp0twinpizzahub"
        call npm install --silent
        cd /d "%~dp0"
        if exist "%~dp0print-server\package.json" (
            cd /d "%~dp0print-server"
            call npm install --silent
            cd /d "%~dp0"
        )
    )
) else (
    call npm install --silent
    cd /d "%~dp0twinpizzahub"
    call npm install --silent
    cd /d "%~dp0"
    if exist "%~dp0print-server\package.json" (
        cd /d "%~dp0print-server"
        call npm install --silent
        cd /d "%~dp0"
    )
)

:: Rebuild
echo.
echo  [3/3] Reconstruction de l'application...
if exist "%~dp0dist" rmdir /s /q "%~dp0dist"
call npm run build
if errorlevel 1 (
    echo  ERREUR lors du build.
    pause
    exit /b 1
)
echo  OK  Nouvelle version construite.

echo.
echo  +--------------------------------------------------------------+
echo  ^|  MISE A JOUR TERMINEE !                                     ^|
echo  +--------------------------------------------------------------+
echo.
echo  Lancement automatique dans 3 secondes...
timeout /t 3 /nobreak >nul
start "" "%~dp0LANCER_TWINPIZZA.bat"
exit /b 0
