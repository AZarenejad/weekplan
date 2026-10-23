$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$env:VITE_API_URL = '/api'
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
& (Join-Path $PSScriptRoot 'install-windows.ps1')
