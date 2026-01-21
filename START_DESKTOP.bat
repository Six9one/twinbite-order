@echo off
title Twin Pizza Desktop App
color 0B
cd /d %~dp0

echo.
echo ================================================================
echo       TWIN PIZZA - INTEGRATED DESKTOP APP
echo ================================================================
echo.

REM Check if Python is available
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python is not installed or not in PATH.
    echo [!] Please install Python from python.org
    pause
    exit /b 1
)

REM Ensure dev server is running (frontend)
echo [*] Checking if Ordering UI is ready...
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo [!] UI Server (localhost:5173) is not running.
    echo [*] Starting npm run dev automatically...
    start "Ordering UI Server" cmd /k "npm run dev"
    echo [*] Waiting for server to warm up (15s)...
    timeout /t 15 /nobreak >nul
)

REM Install PyQt6 if not installed
echo [*] Checking Python dependencies...
python -c "import PyQt6" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Installing PyQt6 (first time only, may take 2 min)...
    pip install PyQt6 PyQt6-WebEngine --quiet
)

REM Launch the app
echo [*] Launching Desktop Dashboard...
echo.
python desktop_app.py

echo.
echo [*] App closed.
if %errorlevel% neq 0 (
    echo.
    echo [!] Error code: %errorlevel%
    echo [!] There was an error running the app.
)
echo.
pause
