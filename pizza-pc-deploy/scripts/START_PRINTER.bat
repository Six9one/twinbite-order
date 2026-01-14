@echo off
REM ============================================================
REM  Twin Pizza - Start Print Server
REM ============================================================
title Twin Pizza - Print Server

set "INSTALL_DIR=C:\TwinPizza"
cd /d "%INSTALL_DIR%\print-server"

echo ========================================
echo   Twin Pizza - Print Server
echo ========================================
echo.
echo [*] Demarrage...
echo.

node server.js

echo.
echo [*] Print Server arrete.
pause
