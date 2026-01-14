@echo off
REM ============================================================
REM  Twin Pizza - Stop All Services
REM ============================================================

echo.
echo ========================================
echo   Twin Pizza - Arret des services
echo ========================================
echo.

echo [*] Arret du WhatsApp Bot...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Twin Pizza*" >nul 2>&1
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq Twin Pizza*" >nul 2>&1

echo [*] Arret du Print Server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Twin Pizza*" >nul 2>&1

echo.
echo [OK] Tous les services Twin Pizza ont ete arretes.
echo.
pause
