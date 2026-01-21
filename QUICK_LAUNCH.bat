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

echo [*] Opening Twin Pizza in Edge App Mode...

REM Open Edge in app mode (no address bar, looks like an app)
start "" msedge --app=http://localhost:5173 --start-maximized

echo.
echo [*] Done! The ordering UI should now be open.
echo [*] You can close this window.
echo.
pause
