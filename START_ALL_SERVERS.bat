@echo off
title Twin Pizza - All Servers
color 0A

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║       🍕 TWIN PIZZA - SERVER LAUNCHER 🍕        ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║  1. PocketBase    → http://127.0.0.1:8090       ║
echo  ║  2. Cloudflare Tunnel → Exposes PocketBase      ║
echo  ║  3. Print Server  → http://localhost:3001        ║
echo  ║  4. Web App        → http://localhost:8080        ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set PROJECT_DIR=C:\Users\Slicydicy\Documents\GitHub\twinbite-order
set PB_EXE=%PROJECT_DIR%\pocketbase\pocketbase.exe
set PB_DATA=%PROJECT_DIR%\pocketbase

:: ============================================
:: 1. Start PocketBase (database server)
:: ============================================
echo [1/4] Starting PocketBase...
start "PocketBase Server" /min cmd /c "cd /d "%PB_DATA%" && "%PB_EXE%" serve --http=127.0.0.1:8090 --dir="%PB_DATA%\pb_data""

:: Wait for PocketBase to be ready
echo      Waiting for PocketBase to start...
timeout /t 4 /nobreak >nul

:: ============================================
:: 2. Start Cloudflare Tunnel (expose PocketBase)
:: ============================================
echo [2/4] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" /min cmd /c "cloudflared tunnel --url http://127.0.0.1:8090"

timeout /t 2 /nobreak >nul

:: ============================================
:: 3. Start Print Server
:: ============================================
echo [3/4] Starting Print Server...
start "Print Server" /min cmd /c "cd /d "%PROJECT_DIR%\print-server" && node server.js"

:: ============================================
:: 4. Start Web App (Vite dev server)
:: ============================================
echo [4/4] Starting Web App...
start "TwinPizza Web App" /min cmd /c "cd /d "%PROJECT_DIR%" && npm run dev"

echo.
echo  ✅ All servers started!
echo.
echo  PocketBase:       http://127.0.0.1:8090/_/
echo  Cloudflare Tunnel: Check "Cloudflare Tunnel" window for public URL
echo  Print Server:     http://localhost:3001/health
echo  Web App (local):  http://localhost:8080/
echo.
echo  ⚠️ IMPORTANT: If the tunnel URL changed, update it in Vercel:
echo     Vercel → Settings → Environment Variables → VITE_POCKETBASE_URL
echo.
echo  All windows are minimized in taskbar.
echo.
pause
