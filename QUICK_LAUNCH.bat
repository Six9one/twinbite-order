@echo off
title Twin Pizza - Quick Launch
color 0B
cd /d %~dp0

echo.
echo ================================================================
echo       TWIN PIZZA - QUICK LAUNCHER
echo ================================================================
echo.

REM Start the dev server
echo [*] Starting Ordering UI Server...
start "Ordering UI Server" cmd /k "npm run dev"

REM Wait for server to start
echo [*] Waiting for server to start (5s)...
timeout /t 5 /nobreak >nul

echo [*] Opening Twin Pizza in your browser...

REM Open in default browser
start http://localhost:8080

echo.
echo [*] Done! The ordering UI should now be open in your browser.
echo [*] Keep this CMD window open (it runs the server).
echo.
pause
