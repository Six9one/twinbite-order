@echo off
REM ===========================================
REM  Install WhatsApp Bot Auto-Start
REM  This adds the bot to Windows Task Scheduler
REM ===========================================

echo.
echo ========================================
echo   Twin Pizza WhatsApp Bot - Auto-Start
echo ========================================
echo.

REM Create scheduled task to run at user login
schtasks /create /tn "TwinPizzaWhatsAppBot" /tr "wscript.exe \"C:\Users\Slicydicy\Documents\GitHub\twinbite-order\whatsapp-bot-python\START_BOT_HIDDEN.vbs\"" /sc onlogon /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo [OK] Auto-start installe avec succes!
    echo.
    echo Le bot demarrera automatiquement a chaque connexion Windows.
    echo.
) else (
    echo.
    echo [ERREUR] Echec de l'installation. Executez en tant qu'administrateur.
    echo.
)

pause
