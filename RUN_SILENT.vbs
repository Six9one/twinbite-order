Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c START.bat", 0
Set WshShell = Nothing
