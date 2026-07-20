# Starts the whole QEA Agentic Hub stack. Idempotent — skips anything already up.
#   Run:  powershell -ExecutionPolicy Bypass -File start-all.ps1
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-Port($p) { [bool](Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue) }
function Wait-Port($p, $secs = 20) {
  for ($i = 0; $i -lt ($secs * 2); $i++) { if (Test-Port $p) { return $true }; Start-Sleep -Milliseconds 500 }
  return $false
}

# 1) MongoDB (portable local install)
if (Test-Port 27017) { Write-Host "MongoDB      : already running (27017)" }
else {
  $mongod = "$env:USERPROFILE\mongodb\mongodb-win32-x86_64-windows-8.0.26\bin\mongod.exe"
  $data   = "$env:USERPROFILE\mongodb\data"
  New-Item -ItemType Directory -Force $data | Out-Null
  Start-Process -FilePath $mongod -ArgumentList "--dbpath `"$data`" --port 27017" -WindowStyle Hidden
  if (Wait-Port 27017) { Write-Host "MongoDB      : started (27017)" } else { Write-Host "MongoDB      : FAILED to start" }
}

# 2) ARA evaluation microservice
if (Test-Port 8200) { Write-Host "Eval service : already running (8200)" }
else {
  Start-Process -FilePath "python" -ArgumentList "integrations\eval-service\app.py","8200" -WorkingDirectory $root -WindowStyle Hidden
  if (Wait-Port 8200) { Write-Host "Eval service : started (8200)" } else { Write-Host "Eval service : FAILED to start" }
}

# 3) Hub API
if (Test-Port 5000) { Write-Host "Hub API      : already running (5000)" }
else {
  Start-Process -FilePath "node" -ArgumentList "--watch","server.js" -WorkingDirectory "$root\server" -WindowStyle Hidden
  if (Wait-Port 5000) { Write-Host "Hub API      : started (5000)" } else { Write-Host "Hub API      : FAILED to start" }
}

# 4) Hub frontend (Vite dev)
if (Test-Port 5173) { Write-Host "Hub frontend : already running (5173)" }
else {
  Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory "$root\client" -WindowStyle Hidden
  if (Wait-Port 5173 30) { Write-Host "Hub frontend : started (5173)" } else { Write-Host "Hub frontend : starting… (5173)" }
}

# 5) AgentBench (benchmarking) frontend
if (Test-Port 5199) { Write-Host "AgentBench   : already running (5199)" }
else {
  $benchStart = Join-Path $root "start-agentbench.ps1"
  if (Test-Path $benchStart) {
    & powershell -ExecutionPolicy Bypass -File $benchStart | Out-Null
    if (Wait-Port 5199 40) { Write-Host "AgentBench   : started (5199)" } else { Write-Host "AgentBench   : starting… (5199)" }
  } else { Write-Host "AgentBench   : start-agentbench.ps1 not found (skipped)" }
}

Write-Host ""
Write-Host "QEA Agentic Hub is up  ->  http://localhost:5173"
Write-Host "AgentBench (benchmarking) ->  http://localhost:5199"
