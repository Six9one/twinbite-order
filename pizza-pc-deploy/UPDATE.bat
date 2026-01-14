@echo off
REM ============================================================
REM  Twin Pizza - Manual Update
REM  Pulls latest code from GitHub and updates installation
REM ============================================================
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Twin Pizza - Mise a jour
echo ========================================
echo.

set "INSTALL_DIR=C:\TwinPizza"
set "REPO_PATH="

REM Try to read from saved path first
if exist "%INSTALL_DIR%\github_repo_path.txt" (
    set /p REPO_PATH=<"%INSTALL_DIR%\github_repo_path.txt"
)

REM Check if saved path is valid
if defined REPO_PATH (
    if exist "!REPO_PATH!\whatsapp-bot-python\bot.py" (
        echo [OK] Repo trouve: !REPO_PATH!
        goto :found_repo
    ) else (
        echo [WARN] Chemin sauvegarde invalide: !REPO_PATH!
        set "REPO_PATH="
    )
)

REM Search for repo in common locations
echo [*] Recherche du repo GitHub...

for %%D in (
    "%USERPROFILE%\Documents\GitHub\twinbite-order"
    "%USERPROFILE%\Desktop\twinbite-order"
    "C:\twinbite-order"
    "C:\GitHub\twinbite-order"
    "C:\Users\%USERNAME%\twinbite-order"
    "D:\twinbite-order"
    "D:\GitHub\twinbite-order"
) do (
    if exist "%%~D\whatsapp-bot-python\bot.py" (
        set "REPO_PATH=%%~D"
        echo [OK] Repo trouve: !REPO_PATH!
        REM Save for future
        echo !REPO_PATH!>"%INSTALL_DIR%\github_repo_path.txt"
        goto :found_repo
    )
)

REM Still not found - ask user
echo.
echo [ERROR] Repo twinbite-order introuvable!
echo.
echo Ou se trouve le dossier twinbite-order?
echo (Exemple: C:\Users\Admin\Desktop\twinbite-order)
echo.
set /p REPO_PATH="Chemin: "

if not exist "!REPO_PATH!\whatsapp-bot-python\bot.py" (
    echo [ERROR] bot.py introuvable dans !REPO_PATH!
    pause
    exit /b 1
)

REM Save for future
echo !REPO_PATH!>"%INSTALL_DIR%\github_repo_path.txt"

:found_repo

echo [*] Arret des services...
call "%INSTALL_DIR%\scripts\STOP_ALL.bat" >nul 2>&1

echo.
echo [*] Mise a jour depuis GitHub...
cd /d "%REPO_PATH%"
git pull

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Echec de git pull. Verifiez la connexion internet.
    pause
    exit /b 1
)

echo.
echo [*] Copie des fichiers mis a jour...

REM Update WhatsApp Bot
copy /Y "%REPO_PATH%\whatsapp-bot-python\bot.py" "%INSTALL_DIR%\whatsapp-bot\" >nul
copy /Y "%REPO_PATH%\whatsapp-bot-python\config.py" "%INSTALL_DIR%\whatsapp-bot\" >nul

REM Update Print Server
copy /Y "%REPO_PATH%\print-server\server.js" "%INSTALL_DIR%\print-server\" >nul

REM Update scripts
copy /Y "%REPO_PATH%\pizza-pc-deploy\scripts\*.*" "%INSTALL_DIR%\scripts\" >nul
copy /Y "%REPO_PATH%\pizza-pc-deploy\START_ALL.vbs" "%INSTALL_DIR%\" >nul
copy /Y "%REPO_PATH%\pizza-pc-deploy\auto-updater\*.*" "%INSTALL_DIR%\auto-updater\" >nul

echo.
echo [*] Redemarrage des services...
start "" wscript.exe "%INSTALL_DIR%\START_ALL.vbs"

echo.
echo ============================================
echo   [OK] Mise a jour terminee !
echo ============================================
echo.
echo Les services ont ete redemarres.
echo.

REM Log the update
echo [%date% %time%] Update completed >> "%INSTALL_DIR%\logs\updates.log"

pause
