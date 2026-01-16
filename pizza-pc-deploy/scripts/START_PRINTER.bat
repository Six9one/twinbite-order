@echo off
REM ============================================================
REM  Twin Pizza - Start Print Server
REM ============================================================
title Twin Pizza - Print Server

set "INSTALL_DIR=C:\twinbite-order"
cd /d "%INSTALL_DIR%\print-server"

echo ========================================
echo   Twin Pizza - Print Server
echo ========================================
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo [*] Installation des dependances...
    call npm install
    echo.
)

echo [*] Demarrage...
echo.

node server.js

echo.
echo [*] Print Server arrete.
pause
