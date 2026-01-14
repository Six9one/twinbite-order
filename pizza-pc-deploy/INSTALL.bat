@echo off
REM ============================================================
REM  TWIN PIZZA - INSTALLATION SCRIPT
REM  Run this once on the Pizza PC to install everything
REM ============================================================
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo    TWIN PIZZA - Installation
echo    WhatsApp Bot + Print Server
echo ============================================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ce script doit etre execute en tant qu'Administrateur!
    echo.
    echo Clic droit sur INSTALL.bat -^> "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

set "INSTALL_DIR=C:\TwinPizza"
set "SOURCE_DIR=%~dp0"

echo [*] Dossier d'installation: %INSTALL_DIR%
echo [*] Source: %SOURCE_DIR%
echo.

REM Create installation directory
echo [1/7] Creation du dossier %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs"
if not exist "%INSTALL_DIR%\scripts" mkdir "%INSTALL_DIR%\scripts"

REM Copy WhatsApp Bot
echo [2/7] Copie du WhatsApp Bot...
if not exist "%INSTALL_DIR%\whatsapp-bot" mkdir "%INSTALL_DIR%\whatsapp-bot"
copy /Y "%SOURCE_DIR%..\whatsapp-bot-python\bot.py" "%INSTALL_DIR%\whatsapp-bot\" >nul 2>&1
copy /Y "%SOURCE_DIR%..\whatsapp-bot-python\config.py" "%INSTALL_DIR%\whatsapp-bot\" >nul 2>&1
copy /Y "%SOURCE_DIR%..\whatsapp-bot-python\requirements.txt" "%INSTALL_DIR%\whatsapp-bot\" >nul 2>&1
if exist "%SOURCE_DIR%..\whatsapp-bot-python\venv" (
    echo     [*] Copie du venv Python...
    xcopy /E /I /Y /Q "%SOURCE_DIR%..\whatsapp-bot-python\venv" "%INSTALL_DIR%\whatsapp-bot\venv\" >nul
)
if exist "%SOURCE_DIR%..\whatsapp-bot-python\whatsapp_session" (
    echo     [*] Copie de la session WhatsApp...
    xcopy /E /I /Y /Q "%SOURCE_DIR%..\whatsapp-bot-python\whatsapp_session" "%INSTALL_DIR%\whatsapp-bot\whatsapp_session\" >nul
)

REM Copy Print Server
echo [3/7] Copie du Print Server...
if not exist "%INSTALL_DIR%\print-server" mkdir "%INSTALL_DIR%\print-server"
copy /Y "%SOURCE_DIR%..\print-server\server.js" "%INSTALL_DIR%\print-server\" >nul 2>&1
copy /Y "%SOURCE_DIR%..\print-server\package.json" "%INSTALL_DIR%\print-server\" >nul 2>&1
copy /Y "%SOURCE_DIR%..\print-server\package-lock.json" "%INSTALL_DIR%\print-server\" >nul 2>&1
copy /Y "%SOURCE_DIR%..\print-server\.env" "%INSTALL_DIR%\print-server\" >nul 2>&1
if exist "%SOURCE_DIR%..\print-server\node_modules" (
    echo     [*] Copie des node_modules...
    xcopy /E /I /Y /Q "%SOURCE_DIR%..\print-server\node_modules" "%INSTALL_DIR%\print-server\node_modules\" >nul
)

REM Copy scripts
echo [4/7] Copie des scripts...
copy /Y "%SOURCE_DIR%scripts\*.*" "%INSTALL_DIR%\scripts\" >nul
copy /Y "%SOURCE_DIR%START_ALL.vbs" "%INSTALL_DIR%\" >nul
copy /Y "%SOURCE_DIR%UPDATE.bat" "%INSTALL_DIR%\" >nul

REM Copy auto-updater
echo [5/7] Installation de l'auto-updater...
if not exist "%INSTALL_DIR%\auto-updater" mkdir "%INSTALL_DIR%\auto-updater"
copy /Y "%SOURCE_DIR%auto-updater\*.*" "%INSTALL_DIR%\auto-updater\" >nul

REM Store GitHub repo path for updates
echo %SOURCE_DIR%..>"%INSTALL_DIR%\github_repo_path.txt"

REM Create Task Scheduler entries
echo [6/7] Configuration du demarrage automatique...

REM WhatsApp + Print Server on login
schtasks /create /tn "TwinPizza_Services" /tr "wscript.exe \"%INSTALL_DIR%\START_ALL.vbs\"" /sc onlogon /rl highest /f >nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Demarrage automatique configure
) else (
    echo     [WARN] Erreur configuration demarrage automatique
)

REM Auto-updater every hour
schtasks /create /tn "TwinPizza_AutoUpdate" /tr "python \"%INSTALL_DIR%\auto-updater\updater.py\"" /sc hourly /mo 1 /f >nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Mise a jour automatique configuree (toutes les heures)
) else (
    echo     [WARN] Erreur configuration auto-update
)

REM Install Python dependencies if venv doesn't exist
echo [7/7] Verification des dependances...
if not exist "%INSTALL_DIR%\whatsapp-bot\venv" (
    echo     [*] Installation des dependances Python...
    cd /d "%INSTALL_DIR%\whatsapp-bot"
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    call deactivate
)

REM Install Node dependencies if node_modules doesn't exist
if not exist "%INSTALL_DIR%\print-server\node_modules" (
    echo     [*] Installation des dependances Node.js...
    cd /d "%INSTALL_DIR%\print-server"
    call npm install
)

echo.
echo ============================================================
echo    INSTALLATION TERMINEE !
echo ============================================================
echo.
echo [OK] WhatsApp Bot installe dans: %INSTALL_DIR%\whatsapp-bot
echo [OK] Print Server installe dans: %INSTALL_DIR%\print-server
echo [OK] Demarrage automatique configure
echo [OK] Mise a jour automatique configuree
echo.
echo PROCHAINES ETAPES:
echo 1. Redemarrez l'ordinateur OU executez START_ALL.vbs
echo 2. Scannez le QR code WhatsApp la premiere fois
echo 3. C'est tout ! Les services tourneront automatiquement.
echo.
echo Pour mettre a jour manuellement: %INSTALL_DIR%\UPDATE.bat
echo Pour arreter les services: %INSTALL_DIR%\scripts\STOP_ALL.bat
echo.
pause
