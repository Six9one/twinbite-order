@echo off
REM ===========================================
REM  Uninstall WhatsApp Bot Auto-Start
REM ===========================================

echo.
echo ========================================
echo   Desinstaller Auto-Start
echo ========================================
echo.

schtasks /delete /tn "TwinPizzaWhatsAppBot" /f

if %errorlevel% equ 0 (
    echo.
    echo [OK] Auto-start desinstalle.
    echo.
) else (
    echo.
    echo [INFO] Tache non trouvee ou deja supprimee.
    echo.
)

pause
