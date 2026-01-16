@echo off
REM ============================================================
REM  Twin Pizza - Start WhatsApp Bot
REM  Uses the git repo directly - easy updates with git pull
REM ============================================================
title Twin Pizza - WhatsApp Bot
setlocal enabledelayedexpansion

set "INSTALL_DIR=C:\twinbite-order"
cd /d "%INSTALL_DIR%\whatsapp-bot-python"

echo ========================================
echo   Twin Pizza - WhatsApp Bot
echo ========================================
echo.

REM Check if venv already exists and works
if exist "venv\Scripts\python.exe" (
    echo [*] Demarrage avec venv...
    call venv\Scripts\python.exe bot.py
    goto :end
)

REM Find Python - check explicit paths first (Windows Store alias doesn't work)
echo [*] venv non trouve, recherche de Python...

set "PYTHON_PATH="

REM Check user AppData (most common location)
for %%V in (313 312 311 310 39 38) do (
    if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
        set "PYTHON_PATH=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
        goto :found_python
    )
)

REM Check Program Files
for %%V in (313 312 311 310 39 38) do (
    if exist "%ProgramFiles%\Python%%V\python.exe" (
        set "PYTHON_PATH=%ProgramFiles%\Python%%V\python.exe"
        goto :found_python
    )
)

REM Check C:\Python
for %%V in (313 312 311 310 39 38) do (
    if exist "C:\Python%%V\python.exe" (
        set "PYTHON_PATH=C:\Python%%V\python.exe"
        goto :found_python
    )
)

REM Check py launcher (usually works even if python.exe doesn't)
where py >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Utilisation de py launcher...
    py -m venv venv
    if exist "venv\Scripts\python.exe" (
        goto :install_packages
    )
)

echo.
echo ============================================
echo   [ERREUR] Python non trouve!
echo ============================================
echo.
echo Python n'est pas installe correctement.
echo.
echo SOLUTION:
echo 1. Ouvrir Parametres Windows
echo 2. Rechercher "Alias d'execution d'application"  
echo 3. Desactiver "python.exe" et "python3.exe"
echo 4. OU reinstaller Python depuis python.org
echo    IMPORTANT: Cocher "Add Python to PATH"
echo.
pause
exit /b 1

:found_python
echo [OK] Python trouve: %PYTHON_PATH%
echo [*] Creation de l'environnement virtuel...
"%PYTHON_PATH%" -m venv venv

if not exist "venv\Scripts\python.exe" (
    echo [ERREUR] Echec creation venv!
    pause
    exit /b 1
)

:install_packages
echo [*] Installation des packages (1-2 minutes)...
call venv\Scripts\pip.exe install -r requirements.txt -q

echo [*] Demarrage du bot...
call venv\Scripts\python.exe bot.py

:end
echo.
echo [*] Bot arrete.
pause
