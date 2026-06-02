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
set PATH=%PATH%;C:\Users\Slicydicy\AppData\Local\nvm\v22.22.0;%USERPROFILE%\AppData\Local\nvm\v22.22.0
node server.js
pause

