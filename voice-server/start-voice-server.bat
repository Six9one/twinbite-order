@echo off
title Twin Pizza Voice Receptionist
cd /d "%~dp0"
echo.
echo ========================================
echo   TWIN PIZZA - VOICE RECEPTIONIST SERVER
echo ========================================
echo.
echo Starting voice receptionist server...
echo.
set PATH=%PATH%;C:\Users\Slicydicy\AppData\Local\nvm\v22.22.0;%USERPROFILE%\AppData\Local\nvm\v22.22.0
node server.js
pause
