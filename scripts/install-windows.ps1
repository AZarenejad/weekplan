$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script = Join-Path $PSScriptRoot 'start-windows.ps1'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'WeekPlan' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
$shortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'WeekPlan.url'
Set-Content -Path $shortcut -Encoding ASCII -Value '[InternetShortcut]', 'URL=http://127.0.0.1:4173/'
Write-Host 'Installed. WeekPlan starts at Windows sign-in without opening a browser.'
Write-Host 'Use the WeekPlan desktop shortcut when you want to open it.'
Start-ScheduledTask -TaskName 'WeekPlan'
