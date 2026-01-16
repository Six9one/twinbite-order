@echo off
title Twin Pizza - Setup Complet
color 0A
cd /d C:\twinbite-order

echo.
echo ================================================================
echo       TWIN PIZZA - INSTALLATION COMPLETE
echo       Un seul script, tout automatique!
echo ================================================================
echo.

REM ========== 1. Update from git ==========
echo [1/4] Mise a jour du code...
git stash -q 2>nul
git pull -q 2>nul
echo       OK!
echo.

REM ========== 2. Setup WhatsApp Bot ==========
echo [2/4] Configuration WhatsApp Bot...
cd /d C:\twinbite-order\whatsapp-bot-python
if not exist "venv\Scripts\python.exe" (
    echo       Creation environnement Python...
    python -m venv venv
    echo       Installation packages...
    venv\Scripts\pip install -r requirements.txt -q
)
echo       OK!
echo.

REM ========== 3. Setup Print Server ==========
echo [3/4] Configuration Print Server...
cd /d C:\twinbite-order\print-server
if not exist "node_modules" (
    echo       Installation packages npm...
    call npm install -q
)
echo       OK!
echo.

REM ========== 4. Start Everything ==========
echo [4/4] Demarrage des services...
echo.

REM Start WhatsApp Bot
start "WhatsApp Bot" cmd /k "cd /d C:\twinbite-order\whatsapp-bot-python && venv\Scripts\python bot.py"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start Print Server
start "Print Server" cmd /k "cd /d C:\twinbite-order\print-server && node server.js"

echo.
echo ================================================================
echo       TOUT EST PRET!
echo ================================================================
echo.
echo   - WhatsApp Bot: Fenetre ouverte (scannez QR code si besoin)
echo   - Print Server: Fenetre ouverte
echo.
echo   Cette fenetre peut etre fermee.
echo.
pause
