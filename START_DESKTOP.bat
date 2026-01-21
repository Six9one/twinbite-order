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
python --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python is not installed or not in PATH.
    echo [!] Please install Python from python.org
    pause
    exit /b 1
)

REM Install PyQt6 if not installed
echo [*] Checking Python dependencies...
python -c "import PyQt6" >nul 2>&1
if errorlevel 1 (
    echo [*] Installing PyQt6 (first time only, may take 2 min)...
    pip install PyQt6 PyQt6-WebEngine
)

REM Launch the app
echo [*] Launching Desktop Dashboard...
echo.
python desktop_app.py

echo.
echo [*] App closed.
pause
