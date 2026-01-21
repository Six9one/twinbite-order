@echo off
title Twin Pizza - DEBUG MODE
color 0E
cd /d %~dp0

echo ========================================
echo   DEBUG MODE - Finding the error
echo ========================================
echo.

echo [1] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    pause
    exit /b 1
)
echo.

echo [2] Checking pip...
pip --version
echo.

echo [3] Checking if PyQt6 is installed...
python -c "import PyQt6; print('PyQt6 OK')"
if %errorlevel% neq 0 (
    echo [!] PyQt6 not installed. Installing now...
    pip install PyQt6 PyQt6-WebEngine
    echo.
    echo [!] Retry running this script after install completes.
    pause
    exit /b 1
)
echo.

echo [4] Checking if desktop_app.py exists...
if not exist "desktop_app.py" (
    echo [ERROR] desktop_app.py not found!
    pause
    exit /b 1
)
echo desktop_app.py found - OK
echo.

echo [5] Running the app (errors will show here)...
echo ----------------------------------------
python desktop_app.py 2>&1
echo ----------------------------------------
echo.
echo [*] App exited with code: %errorlevel%
echo.
pause
