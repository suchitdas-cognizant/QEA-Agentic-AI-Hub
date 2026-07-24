# Builds the AgentBench frontend and folds it into the hub so it's served
# same-origin at /benchmark/ (no separate app or hosting needed).
# Run this after syncing your teammate's latest AgentBench changes.
#   powershell -ExecutionPolicy Bypass -File build-agentbench.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app  = Join-Path $root "integrations\agentbench\agentbench\frontend"
$dest = Join-Path $root "client\public\benchmark"

if (-not (Test-Path (Join-Path $app "package.json"))) {
  Write-Host "AgentBench frontend not found. Run: git submodule update --init --recursive integrations/agentbench"
  exit 1
}

Push-Location $app
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Installing AgentBench dependencies (first run)…"
    & npm.cmd install
  }
  Write-Host "Building AgentBench (base=./ so it works under /benchmark/)…"
  # Call vite directly (not npx) and use a relative base — avoids Git-Bash path
  # mangling and npx resolution issues.
  & node "node_modules\vite\bin\vite.js" build --base=./
} finally {
  Pop-Location
}

# Replace the copy served by the hub.
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item -Recurse -Force (Join-Path $app "dist\*") $dest

Write-Host ""
Write-Host "Done — AgentBench built into client\public\benchmark."
Write-Host "It's served at /benchmark/ and embedded in the admin Benchmarking tab."
