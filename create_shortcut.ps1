$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Twin Pizza Hub.lnk")
$Shortcut.TargetPath = "c:\Users\Slicydicy\Documents\GitHub\twinbite-order\electron-app\dist\Twin Pizza Hub-win32-x64\Twin Pizza Hub.exe"
$Shortcut.WorkingDirectory = "c:\Users\Slicydicy\Documents\GitHub\twinbite-order\electron-app\dist\Twin Pizza Hub-win32-x64"
$Shortcut.Description = "Twin Pizza Hub"
$Shortcut.Save()
Write-Host "Desktop shortcut created for Twin Pizza Hub.exe!"
