@echo off
REM ============================================================
REM  TWIN PIZZA - EASY INSTALL (Just run this!)
REM ============================================================
echo.
echo ========================================
echo   TWIN PIZZA - Installation Facile
echo ========================================
echo.

REM Create TwinPizza folder
echo [1/4] Creation du dossier...
if not exist "C:\TwinPizza" mkdir "C:\TwinPizza"
if not exist "C:\TwinPizza\whatsapp-bot" mkdir "C:\TwinPizza\whatsapp-bot"
if not exist "C:\TwinPizza\scripts" mkdir "C:\TwinPizza\scripts"
if not exist "C:\TwinPizza\logs" mkdir "C:\TwinPizza\logs"

REM Copy WhatsApp bot files
echo [2/4] Copie des fichiers WhatsApp Bot...
copy /Y "%~dp0whatsapp-bot-python\bot.py" "C:\TwinPizza\whatsapp-bot\" >nul 2>&1
copy /Y "%~dp0whatsapp-bot-python\config.py" "C:\TwinPizza\whatsapp-bot\" >nul 2>&1
copy /Y "%~dp0whatsapp-bot-python\requirements.txt" "C:\TwinPizza\whatsapp-bot\" >nul 2>&1

REM Copy scripts
echo [3/4] Copie des scripts...
copy /Y "%~dp0pizza-pc-deploy\scripts\*.bat" "C:\TwinPizza\scripts\" >nul 2>&1
copy /Y "%~dp0pizza-pc-deploy\UPDATE.bat" "C:\TwinPizza\" >nul 2>&1
copy /Y "%~dp0pizza-pc-deploy\START_ALL.vbs" "C:\TwinPizza\" >nul 2>&1

REM Save repo path
echo %~dp0>C:\TwinPizza\github_repo_path.txt

REM Setup Python virtual environment
echo [4/4] Configuration Python (peut prendre 1-2 minutes)...
cd /d "C:\TwinPizza\whatsapp-bot"

if not exist "venv" (
    echo      - Creation environnement virtuel...
    python -m venv venv
)

echo      - Installation des packages...
call venv\Scripts\pip.exe install -r requirements.txt -q

echo.
echo ========================================
echo   INSTALLATION TERMINEE!
echo ========================================
echo.
echo Pour demarrer le bot WhatsApp:
echo   C:\TwinPizza\scripts\START_WHATSAPP.bat
echo.
echo Pour les mises a jour futures:
echo   C:\TwinPizza\UPDATE.bat
echo.

set /p START="Demarrer le bot maintenant? (O/N): "
if /i "%START%"=="O" (
    start "" "C:\TwinPizza\scripts\START_WHATSAPP.bat"
)

pause
