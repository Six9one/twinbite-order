@echo off
title Twin Pizza - SERVEUR D'IMPRESSION
color 0E
cd /d %~dp0

echo.
echo ================================================================
echo       TWIN PIZZA - SERVEUR D'IMPRESSION LOCAL
echo       (WhatsApp gere par le Cloud désormais)
echo ================================================================
echo.

REM ========== 1. Update from git ==========
echo [1/2] Mise a jour automatique...
git stash -q 2>nul
git pull -q 2>nul
echo       OK!
echo.

REM ========== 2. Start Print Server ==========
echo [2/2] Demarrage de l'imprimante...
cd /d %~dp0print-server
if not exist "node_modules" (
    echo       Installation packages npm...
    call npm install -q
)

echo.
echo   --------------------------------------------------------------
echo   CONSEIL: Laissez cette fenetre ouverte pour les tickets.
echo   WhatsApp est maintenant automatique et gere par Supabase! 🚀
echo   --------------------------------------------------------------
echo.

node server.js

echo.
pause
