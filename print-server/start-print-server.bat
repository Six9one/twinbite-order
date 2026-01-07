@echo off
title Twin Pizza Print Server
cd /d "%~dp0"
echo.
echo ========================================
echo    TWIN PIZZA - PRINT SERVER
echo ========================================
echo.
echo Starting print server...
echo.
node server.js
pause
