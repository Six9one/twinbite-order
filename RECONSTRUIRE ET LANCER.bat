@echo off
title TwinPizza Hub - Reconstruction
cd /d "%~dp0"

echo.
echo  Suppression de l'ancien build...
if exist "dist" rmdir /s /q dist

echo  Construction du site (2-3 min)...
call npm run build

if errorlevel 1 (
  echo  ERREUR lors de la construction.
  pause
  exit /b 1
)

echo.
echo  Installation des composants Hub...
cd twinpizzahub
call npm install --silent 2>nul
cd ..

echo.
echo  Lancement TwinPizza Hub...
cd twinpizzahub
node_modules\electron\dist\electron.exe .
cd ..
