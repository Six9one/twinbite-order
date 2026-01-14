@echo off
REM ============================================================
REM  TWIN PIZZA - UNINSTALL SCRIPT
REM  Removes all Twin Pizza services and files
REM ============================================================

echo.
echo ============================================================
echo    TWIN PIZZA - Desinstallation
echo ============================================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ce script doit etre execute en tant qu'Administrateur!
    echo.
    pause
    exit /b 1
)

set "INSTALL_DIR=C:\TwinPizza"

echo [!] ATTENTION: Ceci va supprimer:
echo     - Les taches planifiees Twin Pizza
echo     - Le dossier %INSTALL_DIR%
echo.
echo Appuyez sur une touche pour continuer ou CTRL+C pour annuler...
pause >nul

echo.
echo [*] Arret des services...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Twin Pizza*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Twin Pizza*" >nul 2>&1

echo [*] Suppression des taches planifiees...
schtasks /delete /tn "TwinPizza_Services" /f >nul 2>&1
schtasks /delete /tn "TwinPizza_AutoUpdate" /f >nul 2>&1

echo [*] Suppression du dossier d'installation...
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%"
    echo     [OK] Dossier supprime
) else (
    echo     [INFO] Dossier non trouve
)

echo.
echo ============================================================
echo    [OK] Desinstallation terminee !
echo ============================================================
echo.
echo Le systeme Twin Pizza a ete completement supprime.
echo.
pause
