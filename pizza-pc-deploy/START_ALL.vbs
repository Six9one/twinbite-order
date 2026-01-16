' ============================================================
'  TWIN PIZZA - START ALL SERVICES
'  Shows windows so you can see what's happening!
' ============================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Create logs folder if it doesn't exist
logsFolder = scriptPath & "\logs"
If Not fso.FolderExists(logsFolder) Then
    fso.CreateFolder(logsFolder)
End If

' Log file
logFile = logsFolder & "\startup.log"

' Create log entry
Set logStream = fso.OpenTextFile(logFile, 8, True)
logStream.WriteLine "[" & Now() & "] Starting Twin Pizza Services..."

' Start WhatsApp Bot (VISIBLE - 1 = show window)
whatsappScript = scriptPath & "\scripts\START_WHATSAPP.bat"
If fso.FileExists(whatsappScript) Then
    WshShell.Run chr(34) & whatsappScript & chr(34), 1, False
    logStream.WriteLine "[" & Now() & "] WhatsApp Bot started"
Else
    logStream.WriteLine "[" & Now() & "] ERROR: WhatsApp script not found: " & whatsappScript
    MsgBox "ERREUR: Script WhatsApp non trouve!", vbCritical, "Twin Pizza"
End If

' Wait 3 seconds before starting print server
WScript.Sleep 3000

' Start Print Server (VISIBLE - 1 = show window)
printerScript = scriptPath & "\scripts\START_PRINTER.bat"
If fso.FileExists(printerScript) Then
    WshShell.Run chr(34) & printerScript & chr(34), 1, False
    logStream.WriteLine "[" & Now() & "] Print Server started"
Else
    logStream.WriteLine "[" & Now() & "] ERROR: Printer script not found: " & printerScript
End If

logStream.WriteLine "[" & Now() & "] All services started"
logStream.Close

' Show notification
MsgBox "Services demarres!" & vbCrLf & vbCrLf & "- WhatsApp Bot" & vbCrLf & "- Print Server", vbInformation, "Twin Pizza"

Set logStream = Nothing
Set fso = Nothing
Set WshShell = Nothing
