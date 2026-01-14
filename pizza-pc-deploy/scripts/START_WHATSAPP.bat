@echo off
REM ============================================================
REM  Twin Pizza - Start WhatsApp Bot
REM ============================================================
title Twin Pizza - WhatsApp Bot
setlocal enabledelayedexpansion

set "INSTALL_DIR=C:\TwinPizza"
cd /d "%INSTALL_DIR%\whatsapp-bot"

echo ========================================
echo   Twin Pizza - WhatsApp Bot
echo ========================================
echo.

REM Check if venv exists
if exist "venv\Scripts\python.exe" (
    echo [*] Demarrage avec venv...
    call venv\Scripts\python.exe bot.py
    goto :end
)

REM Try to find Python and create venv
echo [*] venv non trouve, creation...

set "PYTHON_PATH="

REM Check common Python locations
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\Python39\python.exe"
    "%ProgramFiles%\Python312\python.exe"
    "%ProgramFiles%\Python311\python.exe"
) do (
    if exist "%%~P" (
        set "PYTHON_PATH=%%~P"
        goto :found_python
    )
)

REM Try system PATH
where python >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_PATH=python"
    goto :found_python
)

echo.
echo [ERREUR] Python non trouve!
echo.
echo Installez Python depuis: https://www.python.org/downloads/
echo IMPORTANT: Cochez "Add Python to PATH" pendant l'installation!
echo.
pause
exit /b 1

:found_python
echo [OK] Python trouve: %PYTHON_PATH%
echo [*] Creation de l'environnement virtuel...
"%PYTHON_PATH%" -m venv venv

echo [*] Installation des packages...
call venv\Scripts\pip.exe install -r requirements.txt

echo [*] Demarrage du bot...
call venv\Scripts\python.exe bot.py

:end
echo.
echo [*] Bot arrete.
pause
