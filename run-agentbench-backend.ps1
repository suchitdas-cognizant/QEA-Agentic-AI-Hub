# Runs the AgentBench FastAPI backend on :8001.
# REQUIRES internet access to PyPI for the first-run `pip install` (blocked on the
# corporate network — run this on the host or a machine with PyPI access).
#   powershell -ExecutionPolicy Bypass -File run-agentbench-backend.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app  = Join-Path $root "integrations\agentbench\agentbench"   # contains backend/
$venv = Join-Path $app ".venv"
$py   = Join-Path $venv "Scripts\python.exe"

if (-not (Test-Path (Join-Path $app "backend\app.py"))) {
  Write-Host "AgentBench backend not found. Run: git submodule update --init --recursive integrations/agentbench"
  exit 1
}

# 1) Create the virtualenv if needed.
if (-not (Test-Path $py)) {
  Write-Host "Creating Python virtualenv…"
  & python -m venv $venv
}

# 2) Install dependencies (needs PyPI access).
$req = if (Test-Path (Join-Path $app "requirements.txt")) { Join-Path $app "requirements.txt" }
       else { Join-Path $app "backend\requirements.txt" }
Write-Host "Installing backend dependencies from $req …"
& $py -m pip install --upgrade pip
& $py -m pip install -r $req

# 3) Ensure a backend .env exists (edit it to add MONGODB_URI + LLM keys).
$envFile = Join-Path $app "backend\.env"
$envEx   = Join-Path $app "backend\.env.example"
if ((-not (Test-Path $envFile)) -and (Test-Path $envEx)) {
  Copy-Item $envEx $envFile
  Write-Host "Created backend\.env from the example — edit it to set MONGODB_URI, LLM keys, and ALLOWED_ORIGINS."
}

# 4) Run the API on :8001 (module path is backend.app:app, run from the app dir).
Write-Host ""
Write-Host "Starting AgentBench backend on http://localhost:8001 …"
Push-Location $app
try {
  & $py -m uvicorn backend.app:app --host 0.0.0.0 --port 8001
} finally {
  Pop-Location
}
