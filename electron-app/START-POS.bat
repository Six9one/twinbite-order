@echo off
REM Twin Pizza Hub - POS Electron App Starter
REM This script starts the Electron POS application

cd /d "%~dp0"

echo.
echo ================================
echo 🍕 Twin Pizza Hub - POS System
echo ================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Starting application...
call npm start

pause
