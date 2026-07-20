# Starts the integrated AgentBench benchmarking app (Vite/React frontend) on :5199.
# The hub's own frontend uses :5173, so AgentBench runs on a separate port and is
# embedded / linked from the admin "Benchmarking" tab.
#   Run:  powershell -ExecutionPolicy Bypass -File start-agentbench.ps1
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app  = Join-Path $root "integrations\agentbench\agentbench\frontend"
$port = 5199

if (-not (Test-Path (Join-Path $app "package.json"))) {
  Write-Host "AgentBench frontend not found at $app"
  Write-Host "Run:  git submodule update --init --recursive integrations/agentbench"
  exit 1
}

# Install deps on first run.
if (-not (Test-Path (Join-Path $app "node_modules"))) {
  Write-Host "Installing AgentBench dependencies (first run)…"
  Push-Location $app
  & npm.cmd install
  Pop-Location
}

# Restart cleanly on the fixed port.
$c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
Start-Sleep -Milliseconds 500

Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev","--","--port","$port","--strictPort" -WorkingDirectory $app -WindowStyle Hidden
Write-Host "AgentBench starting on http://localhost:$port  (embedded in the admin Benchmarking tab)"
