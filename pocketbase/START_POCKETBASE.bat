@echo off
echo ========================================
echo   Twin Pizza - PocketBase Backend
echo ========================================
echo.
echo Starting PocketBase server...
echo Admin Panel: http://127.0.0.1:8090/_/
echo API:         http://127.0.0.1:8090/api/
echo.

cd /d "%~dp0"

if not exist pocketbase.exe (
    echo ERROR: pocketbase.exe not found!
    echo.
    echo Please download PocketBase for Windows:
    echo   https://pocketbase.io/docs/
    echo.
    echo Download the Windows AMD64 zip, extract pocketbase.exe
    echo into this directory: %~dp0
    echo.
    pause
    exit /b 1
)

pocketbase.exe serve --http="127.0.0.1:8090"
pause
