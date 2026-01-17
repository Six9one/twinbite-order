@echo off
title Twin Pizza - Dashboard
color 0A
cd /d C:\twinbite-order

echo.
echo ================================================================
echo       TWIN PIZZA - MONITEUR SYSTEME
echo ================================================================
echo.
echo   Demarrage de l'interface unifiee...
echo.

cd print-server
node dashboard.js

pause
