@echo off
REM ============================================================
REM  TWIN PIZZA - COMPLETE INSTALLER
REM  Works on all Windows versions - Robust file copying
REM ============================================================
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo.
echo ============================================================
echo    TWIN PIZZA - Installation Complete
echo    WhatsApp Bot + Print Server
echo ============================================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'Administrateur!
    echo.
    echo Clic droit sur INSTALL.bat puis "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

REM Set paths
set "INSTALL_DIR=C:\TwinPizza"
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash and go up one level to repo root
set "REPO_DIR=%SCRIPT_DIR:~0,-1%"
for %%i in ("%REPO_DIR%") do set "REPO_DIR=%%~dpi"
set "REPO_DIR=%REPO_DIR:~0,-1%"

echo [INFO] Dossier d'installation: %INSTALL_DIR%
echo [INFO] Dossier source (repo): %REPO_DIR%
echo.

REM ============================================================
REM STEP 1: Clean previous installation
REM ============================================================
echo [1/8] Nettoyage de l'ancienne installation...
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM ============================================================
REM STEP 2: Create folder structure
REM ============================================================
echo [2/8] Creation des dossiers...
mkdir "%INSTALL_DIR%" >nul 2>&1
mkdir "%INSTALL_DIR%\whatsapp-bot" >nul 2>&1
mkdir "%INSTALL_DIR%\print-server" >nul 2>&1
mkdir "%INSTALL_DIR%\scripts" >nul 2>&1
mkdir "%INSTALL_DIR%\auto-updater" >nul 2>&1
mkdir "%INSTALL_DIR%\logs" >nul 2>&1

REM ============================================================
REM STEP 3: Copy WhatsApp Bot files
REM ============================================================
echo [3/8] Copie du WhatsApp Bot...

set "WA_SRC=%REPO_DIR%\whatsapp-bot-python"
set "WA_DST=%INSTALL_DIR%\whatsapp-bot"

if not exist "%WA_SRC%\bot.py" (
    echo     [ERREUR] bot.py introuvable dans %WA_SRC%
    echo     Verifiez que vous avez clone le repo correctement.
    pause
    exit /b 1
)

copy "%WA_SRC%\bot.py" "%WA_DST%\" >nul
copy "%WA_SRC%\config.py" "%WA_DST%\" >nul
copy "%WA_SRC%\requirements.txt" "%WA_DST%\" >nul

echo     [OK] bot.py copie
echo     [OK] config.py copie
echo     [OK] requirements.txt copie

REM Copy venv if exists (saves time)
if exist "%WA_SRC%\venv" (
    echo     [*] Copie de l'environnement Python (peut prendre du temps)...
    xcopy "%WA_SRC%\venv" "%WA_DST%\venv\" /E /I /Q /Y >nul 2>&1
    echo     [OK] venv copie
)

REM Copy WhatsApp session if exists
if exist "%WA_SRC%\whatsapp_session" (
    echo     [*] Copie de la session WhatsApp...
    xcopy "%WA_SRC%\whatsapp_session" "%WA_DST%\whatsapp_session\" /E /I /Q /Y >nul 2>&1
    echo     [OK] session WhatsApp copiee
)

REM ============================================================
REM STEP 4: Copy Print Server files
REM ============================================================
echo [4/8] Copie du Print Server...

set "PS_SRC=%REPO_DIR%\print-server"
set "PS_DST=%INSTALL_DIR%\print-server"

copy "%PS_SRC%\server.js" "%PS_DST%\" >nul
copy "%PS_SRC%\package.json" "%PS_DST%\" >nul
copy "%PS_SRC%\package-lock.json" "%PS_DST%\" >nul 2>&1

echo     [OK] server.js copie
echo     [OK] package.json copie

REM Create .env file with actual credentials
echo     [*] Creation du fichier .env...
(
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo PRINTER_IP=192.168.1.200
echo PRINTER_PORT=9100
) > "%PS_DST%\.env"
echo     [OK] .env cree

REM Copy node_modules if exists
if exist "%PS_SRC%\node_modules" (
    echo     [*] Copie des modules Node.js (peut prendre du temps)...
    xcopy "%PS_SRC%\node_modules" "%PS_DST%\node_modules\" /E /I /Q /Y >nul 2>&1
    echo     [OK] node_modules copie
)

REM ============================================================
REM STEP 5: Copy scripts
REM ============================================================
echo [5/8] Copie des scripts...

set "DEPLOY_DIR=%REPO_DIR%\pizza-pc-deploy"

copy "%DEPLOY_DIR%\scripts\*.bat" "%INSTALL_DIR%\scripts\" >nul
copy "%DEPLOY_DIR%\START_ALL.vbs" "%INSTALL_DIR%\" >nul
copy "%DEPLOY_DIR%\UPDATE.bat" "%INSTALL_DIR%\" >nul
copy "%DEPLOY_DIR%\auto-updater\*.py" "%INSTALL_DIR%\auto-updater\" >nul

echo     [OK] Scripts copies

REM Save repo path for auto-updater
echo %REPO_DIR%>"%INSTALL_DIR%\github_repo_path.txt"

REM ============================================================
REM STEP 6: Install Python dependencies
REM ============================================================
echo [6/8] Installation des dependances Python...

cd /d "%WA_DST%"

if not exist "%WA_DST%\venv" (
    echo     [*] Creation de l'environnement virtuel...
    python -m venv venv
)

echo     [*] Installation des packages Python...
call "%WA_DST%\venv\Scripts\pip.exe" install -r requirements.txt -q

echo     [OK] Dependances Python installees

REM ============================================================
REM STEP 7: Install Node dependencies
REM ============================================================
echo [7/8] Installation des dependances Node.js...

cd /d "%PS_DST%"

if not exist "%PS_DST%\node_modules" (
    echo     [*] Installation des packages Node.js...
    call npm install --silent
)

echo     [OK] Dependances Node.js installees

REM ============================================================
REM STEP 8: Configure auto-start
REM ============================================================
echo [8/8] Configuration du demarrage automatique...

REM Delete old tasks if exist
schtasks /delete /tn "TwinPizza_Services" /f >nul 2>&1
schtasks /delete /tn "TwinPizza_AutoUpdate" /f >nul 2>&1

REM Create new tasks
schtasks /create /tn "TwinPizza_Services" /tr "wscript.exe \"%INSTALL_DIR%\START_ALL.vbs\"" /sc onlogon /rl highest /f >nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Demarrage automatique configure
) else (
    echo     [WARN] Erreur configuration demarrage automatique
)

schtasks /create /tn "TwinPizza_AutoUpdate" /tr "python \"%INSTALL_DIR%\auto-updater\updater.py\"" /sc hourly /mo 1 /f >nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Mise a jour automatique configuree (toutes les heures)
) else (
    echo     [WARN] Erreur configuration auto-update
)

REM ============================================================
REM DONE!
REM ============================================================
echo.
echo ============================================================
echo    INSTALLATION TERMINEE AVEC SUCCES!
echo ============================================================
echo.
echo Fichiers installes dans: %INSTALL_DIR%
echo.
echo PROCHAINES ETAPES:
echo.
echo 1. Double-cliquez sur: %INSTALL_DIR%\scripts\START_ALL.bat
echo 2. Scannez le QR code WhatsApp avec votre telephone
echo 3. C'est tout! Les services demarreront automatiquement.
echo.
echo ============================================================
echo.

REM Ask if user wants to start now
set /p START_NOW="Voulez-vous demarrer les services maintenant? (O/N): "
if /i "%START_NOW%"=="O" (
    start "" "%INSTALL_DIR%\scripts\START_ALL.bat"
)

pause
