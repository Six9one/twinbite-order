@echo off
echo.
echo ====================================
echo    TWIN PIZZA INSTALLATION
echo ====================================
echo.

set INSTALL_DIR=C:\TwinPizza
set REPO_DIR=C:\twinbite-order

echo Creating folders...
if not exist %INSTALL_DIR% mkdir %INSTALL_DIR%
if not exist %INSTALL_DIR%\whatsapp-bot mkdir %INSTALL_DIR%\whatsapp-bot
if not exist %INSTALL_DIR%\print-server mkdir %INSTALL_DIR%\print-server
if not exist %INSTALL_DIR%\scripts mkdir %INSTALL_DIR%\scripts
if not exist %INSTALL_DIR%\logs mkdir %INSTALL_DIR%\logs

echo Copying WhatsApp bot files...
copy %REPO_DIR%\whatsapp-bot-python\bot.py %INSTALL_DIR%\whatsapp-bot\
copy %REPO_DIR%\whatsapp-bot-python\config.py %INSTALL_DIR%\whatsapp-bot\
copy %REPO_DIR%\whatsapp-bot-python\requirements.txt %INSTALL_DIR%\whatsapp-bot\

echo Copying Print Server files...
copy %REPO_DIR%\print-server\server.js %INSTALL_DIR%\print-server\
copy %REPO_DIR%\print-server\package.json %INSTALL_DIR%\print-server\

echo Creating .env file...
echo SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co> %INSTALL_DIR%\print-server\.env
echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc>> %INSTALL_DIR%\print-server\.env
echo PRINTER_IP=192.168.1.200>> %INSTALL_DIR%\print-server\.env
echo PRINTER_PORT=9100>> %INSTALL_DIR%\print-server\.env

echo Copying scripts...
copy %REPO_DIR%\pizza-pc-deploy\scripts\*.bat %INSTALL_DIR%\scripts\
copy %REPO_DIR%\pizza-pc-deploy\START_ALL.vbs %INSTALL_DIR%\

echo Installing Python dependencies...
cd /d %INSTALL_DIR%\whatsapp-bot
python -m venv venv
call venv\Scripts\pip install -r requirements.txt

echo Installing Node dependencies...
cd /d %INSTALL_DIR%\print-server
call npm install

echo.
echo ====================================
echo    INSTALLATION COMPLETE!
echo ====================================
echo.
echo Start services: %INSTALL_DIR%\scripts\START_ALL.bat
echo.
pause
