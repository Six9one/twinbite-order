@echo off
title Twin Pizza - Dashboard
color 0A
cd /d %~dp0

echo.
echo ==================================================
echo       TWIN PIZZA - CONTROLE SYSTEME
echo ==================================================
echo.

REM ========== 1. Update from git ==========
echo [1/3] Mise a jour automatique...
git stash -q 2>nul
git pull -q 2>nul
echo       OK!
echo.

REM ========== 2. Check node_modules ==========
echo [2/3] Verification des dependances...
cd /d %~dp0print-server
if not exist "node_modules" (
    echo       Installation packages npm...
    call npm install -q
)
echo       OK!
echo.

REM ========== 3. Start Dashboard ==========
echo [3/3] Demarrage du Dashboard...
echo.
echo   --------------------------------------------------
echo   Le Dashboard va demarrer dans votre navigateur!
echo   
echo   WhatsApp Bot + Imprimante = AUTOMATIQUE
echo   --------------------------------------------------
echo.

start http://localhost:3000
node dashboard.js

echo.
pause
