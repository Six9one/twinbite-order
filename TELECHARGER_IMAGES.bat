@echo off
title Twin Pizza - Telechargement Images Locales
color 0A
echo.
echo ================================================
echo   Twin Pizza -- Images Locales (Cache)
echo ================================================
echo.
echo Telechargement de toutes les images depuis Supabase...
echo Les images seront servies en LOCAL (pas d'internet requis)
echo.

cd /d "%~dp0"
node scripts/cache-images.mjs

echo.
pause
