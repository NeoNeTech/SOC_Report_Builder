# ============================================================
# stop.ps1 — stop the SOC Report Builder static server
#   Usage:  .\scripts\stop.ps1
# Reads .server.pid (written by start.ps1) and stops that process.
# ============================================================
$ErrorActionPreference = "Stop"

$proj    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $proj ".server.pid"
$stopped = $false

if (Test-Path $pidFile) {
  $serverPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($serverPid) {
    $proc = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
    if ($proc) {
      Stop-Process -Id $serverPid -Force
      $stopped = $true
      Write-Host "Stopped server (PID $serverPid)" -ForegroundColor Green
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if (-not $stopped) {
  Write-Host "No tracked server found (.server.pid missing or stale). Nothing to stop." -ForegroundColor Yellow
}
