@echo off
title Twin Pizza WhatsApp Bot
color 0A
cd /d C:\twinbite-order\whatsapp-bot-python

echo.
echo  ========================================
echo       TWIN PIZZA - WhatsApp Bot
echo  ========================================
echo.

:: Check if venv exists
if not exist "venv\Scripts\python.exe" (
    echo [!] Installation du bot...
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
)

:: Auto-update from git (silent)
echo [*] Mise a jour...
git stash -q 2>nul
git pull -q 2>nul

echo [*] Demarrage du bot...
echo.
echo ----------------------------------------
echo   Scannez le QR code avec WhatsApp
echo   (Menu > Appareils connectes > Lier)
echo ----------------------------------------
echo.

venv\Scripts\python bot.py

:: If bot crashes, wait before closing
echo.
echo [!] Le bot s'est arrete. Appuyez sur une touche pour fermer.
pause >nul
