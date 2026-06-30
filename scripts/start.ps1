# ============================================================
# start.ps1 — launch the SOC Report Builder static server
#   Usage:  .\scripts\start.ps1            (port 5173)
#           .\scripts\start.ps1 -Port 8080
# Writes the server PID to .server.pid so stop.ps1 can find it.
# ============================================================
param([int]$Port = 5173)
$ErrorActionPreference = "Stop"

$proj    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $proj ".server.pid"
$logFile = Join-Path $proj "server.log"

# Already running?
if (Test-Path $pidFile) {
  $existing = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
    Write-Host "Server already running (PID $existing) -> http://localhost:$Port" -ForegroundColor Yellow
    exit 0
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js not found in PATH. Install it from https://nodejs.org" -ForegroundColor Red
  exit 1
}

$env:PORT = $Port
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory $proj -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err"

$proc.Id | Out-File -FilePath $pidFile -Encoding ascii
Start-Sleep -Milliseconds 600

Write-Host "SOC Report Builder started (PID $($proc.Id))" -ForegroundColor Green
Write-Host "  URL : http://localhost:$Port"
Write-Host "  Logs: $logFile"
Write-Host "  Stop: .\scripts\stop.ps1"
Start-Process "http://localhost:$Port"
