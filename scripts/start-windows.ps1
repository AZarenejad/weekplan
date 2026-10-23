$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 4173
$env:NODE_ENV = 'production'
$env:HOST = '127.0.0.1'
$env:PORT = "$port"
$env:DB_PATH = Join-Path $root 'data\weekplan.db'
$env:WEB_DIST = Join-Path $root 'apps\web\dist'
$server = Join-Path $root 'apps\api\dist\server.js'
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path (Join-Path $root 'data'), $logDir | Out-Null
if (-not (Test-Path $server) -or -not (Test-Path (Join-Path $env:WEB_DIST 'index.html'))) {
  throw 'Production build missing. Run scripts\setup-windows.ps1 first.'
}
try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2 -UseBasicParsing
  if ($health.StatusCode -eq 200) { exit 0 }
} catch { }
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw "Port $port is occupied by another application." }
$node = (Get-Command node.exe -ErrorAction Stop).Source
Set-Location $root
# Task Scheduler runs this PowerShell process hidden; node stays attached to it.
& $node $server *>> (Join-Path $logDir 'weekplan.log')
