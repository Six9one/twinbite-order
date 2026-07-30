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
set PATH=%PATH%;%USERPROFILE%\AppData\Local\nvm\v22.22.0;C:\Program Files\nodejs
node server.js
pause

