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
pause

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
git pull
if errorlevel 1 (
    echo  ATTENTION : git pull a echoue. On continue avec la version locale.
) else (
    echo  OK  Code mis a jour.
)

:: npm install
echo.
echo  [2/3] Verification des packages...
call npm install --silent
cd /d "%~dp0twinpizzahub"
call npm install --silent
cd /d "%~dp0"
if exist "%~dp0print-server\package.json" (
    cd /d "%~dp0print-server"
    call npm install --silent
    cd /d "%~dp0"
)
echo  OK  Packages a jour.

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
set /p LAUNCH="  Lancer TwinPizza Hub maintenant ? (O/N) : "
if /i "!LAUNCH!"=="O" start "" "%~dp0LANCER_TWINPIZZA.bat"
exit /b 0
