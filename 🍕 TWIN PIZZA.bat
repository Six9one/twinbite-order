@echo off
setlocal EnableDelayedExpansion
title 🍕 Twin Pizza - Demarrage
color 0A
cd /d "%~dp0"

echo.
echo  +============================================================+
echo  ^|                                                            ^|
echo  ^|              🍕  TWIN PIZZA  HUB                          ^|
echo  ^|           Demarrage de tous les services...               ^|
echo  ^|                                                            ^|
echo  +============================================================+
echo.

:: ── Ecrire les .env locaux ────────────────────────────────────────────────────
(
echo VITE_SUPABASE_PROJECT_ID=hsylnrzxeyqxczdalurj
echo VITE_SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1Ijoic2FwaG91dSIsImEiOiJjbWxkeGx3ZnExZGd6M2dwa29jbWQxY280In0.58_v8unUiqxjtjr-QhalMw
echo PRINTER_IP=192.168.1.100
echo PRINTER_PORT=9100
) > "%~dp0.env"

(
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc
echo PRINTER_IPS=192.168.1.200
echo PRINTER_PORT=9100
echo USB_PRINTER_NAME=Star TSP100 Cutter (TSP143)
) > "%~dp0print-server\.env"

:: ── Verifier Node.js ──────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERREUR : Node.js introuvable - lancez INSTALLER.bat d'abord !
    pause
    exit /b 1
)

:: ── Verifier Electron ─────────────────────────────────────────────────────────
set ELECTRON_EXE=%~dp0twinpizzahub\node_modules\electron\dist\electron.exe
if not exist "!ELECTRON_EXE!" (
    echo  Installation des dependances (premiere fois)...
    cd /d "%~dp0twinpizzahub"
    call npm install
    cd /d "%~dp0"
)

:: ── Verifier print-server ─────────────────────────────────────────────────────
if not exist "%~dp0print-server\node_modules\express" (
    echo  Installation print-server...
    cd /d "%~dp0print-server"
    call npm install
    cd /d "%~dp0"
)

:: ── Verifier build ────────────────────────────────────────────────────────────
if not exist "%~dp0dist\index.html" (
    echo  Construction de l'application (2-4 min la premiere fois)...
    call npm install
    call npm run build
    if errorlevel 1 (
        echo  ERREUR lors du build !
        pause
        exit /b 1
    )
)

:: ── Tuer les anciens processus ────────────────────────────────────────────────
taskkill /F /IM electron.exe >nul 2>&1
taskkill /FI "WINDOWTITLE eq TwinPizza-PrintServer" /F >nul 2>&1

echo  Demarrage en cours...
echo.

:: ── Lancer Electron (gere print-server + WhatsApp en interne) ─────────────────
cd /d "%~dp0twinpizzahub"
"!ELECTRON_EXE!" . --enable-logging
set EXIT_CODE=!ERRORLEVEL!
cd /d "%~dp0"

echo.
if !EXIT_CODE! NEQ 0 (
    echo  ============================================================
    echo   ERREUR code !EXIT_CODE! - relancez ou executez METTRE_A_JOUR.bat
    echo  ============================================================
) else (
    echo   Twin Pizza ferme normalement.
)
echo.
pause
exit /b !EXIT_CODE!
