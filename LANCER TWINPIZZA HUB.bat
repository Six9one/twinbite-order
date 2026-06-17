@echo off
title TwinPizza Hub - Demarrage
cd /d "%~dp0"

echo.
echo  ==========================================
echo   TwinPizza Hub - Demarrage complet
echo  ==========================================
echo.

:: Build site if needed
if not exist "dist\index.html" (
  echo  [1/3] Construction du site...
  call npm run build
)

:: Install Hub dependencies if needed
if not exist "twinpizzahub\node_modules\qrcode" (
  echo  [2/3] Installation des composants...
  cd twinpizzahub
  call npm install --silent 2>nul
  cd ..
) else (
  echo  [2/3] Composants deja installes.
)

:: Launch Hub
echo  [3/3] Lancement TwinPizza Hub...
echo.
cd twinpizzahub
node_modules\electron\dist\electron.exe .
cd ..
