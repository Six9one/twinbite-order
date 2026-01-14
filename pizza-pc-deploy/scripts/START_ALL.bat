@echo off
REM ============================================================
REM  Twin Pizza - Start All Services (Visible)
REM  Use this to start services with visible windows for debugging
REM ============================================================

echo.
echo ========================================
echo   Twin Pizza - Demarrage manuel
echo ========================================
echo.

set "INSTALL_DIR=C:\TwinPizza"

echo [*] Demarrage du WhatsApp Bot...
start "Twin Pizza - WhatsApp Bot" cmd /c "%INSTALL_DIR%\scripts\START_WHATSAPP.bat"

timeout /t 3 /nobreak >nul

echo [*] Demarrage du Print Server...
start "Twin Pizza - Print Server" cmd /c "%INSTALL_DIR%\scripts\START_PRINTER.bat"

echo.
echo [OK] Services demarres !
echo.
echo Les services tournent dans des fenetres separees.
echo Fermez cette fenetre, les services continueront.
echo.
pause
