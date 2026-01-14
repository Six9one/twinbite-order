@echo off
REM ============================================================
REM  TWIN PIZZA - EASY INSTALL (Just run this!)
REM ============================================================
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TWIN PIZZA - Installation Facile
echo ========================================
echo.

REM Create TwinPizza folder
echo [1/5] Creation du dossier...
if not exist "C:\TwinPizza" mkdir "C:\TwinPizza"
if not exist "C:\TwinPizza\whatsapp-bot" mkdir "C:\TwinPizza\whatsapp-bot"
if not exist "C:\TwinPizza\print-server" mkdir "C:\TwinPizza\print-server"
if not exist "C:\TwinPizza\scripts" mkdir "C:\TwinPizza\scripts"
if not exist "C:\TwinPizza\logs" mkdir "C:\TwinPizza\logs"

REM Copy WhatsApp bot files
echo [2/5] Copie des fichiers WhatsApp Bot...
copy /Y "%~dp0whatsapp-bot-python\bot.py" "C:\TwinPizza\whatsapp-bot\" >nul 2>&1
copy /Y "%~dp0whatsapp-bot-python\config.py" "C:\TwinPizza\whatsapp-bot\" >nul 2>&1
copy /Y "%~dp0whatsapp-bot-python\requirements.txt" "C:\TwinPizza\whatsapp-bot\" >nul 2>&1

REM Copy Print Server files
echo [3/5] Copie des fichiers Print Server...
copy /Y "%~dp0print-server\server.js" "C:\TwinPizza\print-server\" >nul 2>&1
copy /Y "%~dp0print-server\package.json" "C:\TwinPizza\print-server\" >nul 2>&1
copy /Y "%~dp0print-server\package-lock.json" "C:\TwinPizza\print-server\" >nul 2>&1
if exist "%~dp0print-server\node_modules" (
    echo      [*] Copie node_modules...
    xcopy /E /Y /I /Q "%~dp0print-server\node_modules" "C:\TwinPizza\print-server\node_modules\" >nul 2>&1
)

REM Create .env file for print server
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co> "C:\TwinPizza\print-server\.env"
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6mjHi2qWeWwIEaNDutZ1spsahUGxEAnc>> "C:\TwinPizza\print-server\.env"
echo PRINTER_IP=192.168.1.200>> "C:\TwinPizza\print-server\.env"
echo PRINTER_PORT=9100>> "C:\TwinPizza\print-server\.env"

REM Copy scripts
echo [4/5] Copie des scripts...
copy /Y "%~dp0pizza-pc-deploy\scripts\*.bat" "C:\TwinPizza\scripts\" >nul 2>&1
copy /Y "%~dp0pizza-pc-deploy\UPDATE.bat" "C:\TwinPizza\" >nul 2>&1
copy /Y "%~dp0pizza-pc-deploy\START_ALL.vbs" "C:\TwinPizza\" >nul 2>&1

REM Save repo path
echo %~dp0>C:\TwinPizza\github_repo_path.txt

REM Setup Python virtual environment
echo [5/5] Configuration Python...
cd /d "C:\TwinPizza\whatsapp-bot"

if exist "venv\Scripts\python.exe" (
    echo      [OK] venv existe deja
    goto :done_python
)

REM Find Python - check explicit paths first
set "PYTHON_PATH="

for %%V in (313 312 311 310 39 38) do (
    if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
        set "PYTHON_PATH=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
        goto :create_venv
    )
)

for %%V in (313 312 311 310 39 38) do (
    if exist "%ProgramFiles%\Python%%V\python.exe" (
        set "PYTHON_PATH=%ProgramFiles%\Python%%V\python.exe"
        goto :create_venv
    )
)

for %%V in (313 312 311 310 39 38) do (
    if exist "C:\Python%%V\python.exe" (
        set "PYTHON_PATH=C:\Python%%V\python.exe"
        goto :create_venv
    )
)

REM Try py launcher
where py >nul 2>&1
if %errorlevel% equ 0 (
    echo      [*] Utilisation de py launcher...
    py -m venv venv
    goto :install_packages
)

echo.
echo [ERREUR] Python non trouve!
echo Installez Python depuis python.org
echo IMPORTANT: Cochez "Add Python to PATH"
pause
exit /b 1

:create_venv
echo      [OK] Python: %PYTHON_PATH%
echo      [*] Creation venv...
"%PYTHON_PATH%" -m venv venv

:install_packages
echo      [*] Installation packages (1-2 min)...
call venv\Scripts\pip.exe install -r requirements.txt -q
echo      [OK] Packages installes

:done_python
echo.
echo ========================================
echo   INSTALLATION TERMINEE!
echo ========================================
echo.
echo Pour demarrer: C:\TwinPizza\scripts\START_WHATSAPP.bat
echo.

set /p START="Demarrer le bot maintenant? (O/N): "
if /i "%START%"=="O" (
    start "" "C:\TwinPizza\scripts\START_WHATSAPP.bat"
)

pause
