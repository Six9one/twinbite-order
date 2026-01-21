@echo off
title Twin Pizza Desktop App
color 0B
cd /d %~dp0

echo.
echo ================================================================
echo       TWIN PIZZA - INTEGRATED DESKTOP APP
echo ================================================================
echo.

REM Ensure dev server is running (frontend)
echo [*] Checking if Ordering UI is ready...
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo [!] UI Server (localhost:5173) is not running.
    echo [*] Starting npm run dev automatically...
    start "Ordering UI Server" cmd /c "npm run dev"
    echo [*] Waiting for server to warm up (10s)...
    timeout /t 10 /nobreak >nul
)

REM Launch the app using the python venv
echo [*] Launching Desktop Dashboard...
whatsapp-bot-python\venv\Scripts\python.exe desktop_app.py

if %errorlevel% neq 0 (
    echo.
    echo [!] Error: Could not launch the app.
    echo [!] Make sure you are running this from the project folder.
    pause
)
