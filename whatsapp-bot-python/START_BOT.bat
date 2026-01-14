@echo off
title Twin Pizza - WhatsApp Bot
echo ========================================
echo   Twin Pizza - WhatsApp Bot (Python)
echo ========================================
echo.

cd /d "%~dp0"

echo [*] Demarrage du bot WhatsApp...
echo.

call venv\Scripts\python.exe bot.py

echo.
echo [*] Bot arrete.
pause
