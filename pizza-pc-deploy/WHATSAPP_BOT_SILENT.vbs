' Twin Pizza WhatsApp Bot - Silent Background Launcher
' Double-click to start the bot silently (minimized)

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d C:\twinbite-order\whatsapp-bot-python && git stash -q 2>nul && git pull -q 2>nul && venv\Scripts\python bot.py", 1, False
