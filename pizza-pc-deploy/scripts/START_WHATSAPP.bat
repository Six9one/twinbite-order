@echo off
REM ============================================================
REM  Twin Pizza - Start WhatsApp Bot
REM ============================================================
title Twin Pizza - WhatsApp Bot

set "INSTALL_DIR=C:\TwinPizza"
cd /d "%INSTALL_DIR%\whatsapp-bot"

echo ========================================
echo   Twin Pizza - WhatsApp Bot
echo ========================================
echo.
echo [*] Demarrage...
echo.

REM Activate virtual environment and run bot
call venv\Scripts\python.exe bot.py

echo.
echo [*] Bot arrete.
pause
