@echo off
REM Creates a desktop shortcut to Twin Pizza Hub.exe
REM Run this once to add the app icon to your desktop

set APP_EXE=%~dp0electron-app\dist\win-unpacked\Twin Pizza Hub.exe
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Twin Pizza Hub.lnk
set ICON_PATH=%~dp0electron-app\assets\icon.ico

echo Creating desktop shortcut for Twin Pizza Hub...

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%APP_EXE%'; $Shortcut.WorkingDirectory = '%~dp0electron-app\dist\win-unpacked'; $Shortcut.IconLocation = '%ICON_PATH%'; $Shortcut.Description = 'Twin Pizza Hub - Desktop Application'; $Shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ========================================
    echo   SUCCESS! Desktop shortcut created!
    echo ========================================
    echo.
    echo   Location: %SHORTCUT_PATH%
    echo.
    echo   Double-click "Twin Pizza Hub" on 
    echo   your desktop to launch the app!
    echo.
) else (
    echo.
    echo   Failed to create shortcut
)

pause
