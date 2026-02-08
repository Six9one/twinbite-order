@echo off
title Twin Pizza Hub - Starting...
color 0A
cd /d %~dp0

echo.
echo ==================================================
echo       TWIN PIZZA HUB - STARTING
echo ==================================================
echo.

REM ========== 1. Check if already running ==========
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo   [!] Node.js already running, proceeding...
)

REM ========== 2. Start Web Dev Server in background ==========
echo   [1/3] Starting web server...
start "TwinPizza-DevServer" cmd /c "npm run dev"

REM ========== 3. Wait for server to be ready ==========
echo   [2/3] Waiting for server (port 5173)...
:waitloop
timeout /t 2 /nobreak >nul
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 goto waitloop
echo         Server ready!
echo.

REM ========== 4. Start Electron App ==========
echo   [3/3] Starting Twin Pizza Hub...
echo.
cd /d %~dp0electron-app
call npm start -- --dev

REM ========== 5. Cleanup when Electron closes ==========
echo.
echo   Shutting down...
taskkill /FI "WINDOWTITLE eq TwinPizza-DevServer" /F >nul 2>&1
echo   Done!
timeout /t 2 >nul
