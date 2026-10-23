$task = Get-ScheduledTask -TaskName 'WeekPlan' -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName 'WeekPlan' -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName 'WeekPlan' -Confirm:$false
}
Write-Host 'Autostart removed. Your database and project files are preserved.'
