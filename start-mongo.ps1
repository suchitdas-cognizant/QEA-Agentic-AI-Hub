# Starts the local MongoDB server for the Agent Dashboard.
# Usage:  right-click > "Run with PowerShell", or:  powershell -ExecutionPolicy Bypass -File start-mongo.ps1
$ErrorActionPreference = 'Stop'

# Find mongod.exe inside the portable MongoDB folder in your user profile.
$mongoRoot = Join-Path $env:USERPROFILE 'mongodb'
$mongod = Get-ChildItem -Path $mongoRoot -Recurse -Filter 'mongod.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $mongod) {
  Write-Error "mongod.exe not found under $mongoRoot. Re-run the MongoDB download/extract step."
  exit 1
}

# Data directory (created on first run).
$dataDir = Join-Path $mongoRoot 'data'
New-Item -ItemType Directory -Force $dataDir | Out-Null

Write-Host "Starting MongoDB on mongodb://127.0.0.1:27017 ..." -ForegroundColor Green
Write-Host "Data directory: $dataDir"
Write-Host "Leave this window open while you use the dashboard. Press Ctrl+C to stop." -ForegroundColor Yellow
& $mongod.FullName --dbpath $dataDir --port 27017
