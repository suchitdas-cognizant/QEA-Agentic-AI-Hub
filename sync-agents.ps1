# Pulls the latest upstream code for the integrated agent submodules and
# restarts their services, so a teammate's updates take effect.
#   Run:  powershell -ExecutionPolicy Bypass -File sync-agents.ps1
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Pulling latest ARA (evaluation) from upstream…"
git submodule update --remote --merge integrations/ara

Write-Host "Pulling latest AgentBench (benchmarking) from upstream…"
git submodule update --remote --merge integrations/agentbench

# Restart the eval service so it loads the new code.
$c = Get-NetTCPConnection -State Listen -LocalPort 8200 -ErrorAction SilentlyContinue
if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
Start-Sleep -Milliseconds 700
Start-Process -FilePath "python" -ArgumentList "integrations\eval-service\app.py","8200" -WorkingDirectory $root -WindowStyle Hidden

# Rebuild AgentBench into the hub (served same-origin at /benchmark/).
$benchBuild = Join-Path $root "build-agentbench.ps1"
if (Test-Path $benchBuild) {
  Write-Host "Rebuilding AgentBench into the hub…"
  & powershell -ExecutionPolicy Bypass -File $benchBuild
}

Write-Host ""
Write-Host "Done — submodules synced to the latest upstream."
Write-Host "  ARA eval service restarted on :8200."
Write-Host "  AgentBench rebuilt into client\public\benchmark (served at /benchmark/)."
Write-Host "To keep the updates in your repo, commit the new pointers + build:"
Write-Host "    git add integrations/ara integrations/agentbench client/public/benchmark ; git commit -m 'sync agents'"
