@echo off
REM ============================================================
REM  Twin Pizza - Manual Update
REM  Pulls latest code from GitHub and updates installation
REM ============================================================

echo.
echo ========================================
echo   Twin Pizza - Mise a jour
echo ========================================
echo.

set "INSTALL_DIR=C:\TwinPizza"

REM Read GitHub repo path
if not exist "%INSTALL_DIR%\github_repo_path.txt" (
    echo [ERROR] Fichier github_repo_path.txt non trouve!
    echo         Reinstallez avec INSTALL.bat
    pause
    exit /b 1
)

set /p REPO_PATH=<"%INSTALL_DIR%\github_repo_path.txt"

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
