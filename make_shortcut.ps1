$exePath = "c:\Users\Slicydicy\Documents\GitHub\twinbite-order\electron-app\dist\win-unpacked\Twin Pizza Hub.exe"
$shortcutPath = "$env:USERPROFILE\Desktop\Twin Pizza Hub.lnk"
$workDir = "c:\Users\Slicydicy\Documents\GitHub\twinbite-order\electron-app\dist\win-unpacked"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $exePath
$Shortcut.WorkingDirectory = $workDir
$Shortcut.IconLocation = "$exePath,0"
$Shortcut.Description = "Twin Pizza Hub - POS App"
$Shortcut.Save()

Write-Host "Shortcut updated!" -ForegroundColor Green
