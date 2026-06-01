# Start PharmaWatch Analysis API (requires conda base)
& "C:\Users\kunjp\anaconda3\shell\condabin\conda-hook.ps1"
conda activate base
Set-Location $PSScriptRoot

$port = 8000

python -c "import fastapi" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] fastapi not installed. Run:" -ForegroundColor Red
    Write-Host "  pip install -r requirements-api.txt"
    exit 1
}

try {
    $health = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -TimeoutSec 2
    if ($health.ok -eq $true) {
        Write-Host "PharmaWatch API is already running on http://localhost:$port" -ForegroundColor Yellow
        Write-Host "No need to start again. Use the frontend at npm run dev in PharmaWatch/."
        exit 0
    }
} catch {
    # not running yet — continue to start
}

$inUse = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
if ($inUse) {
    Write-Host "[ERROR] Port $port is in use by another process, but it is not the PharmaWatch API." -ForegroundColor Red
    Write-Host "Free the port or change the port in start-api.ps1 and PharmaWatch/vite.config.js."
    Write-Host ""
    Write-Host "To find the blocking process:"
    Write-Host "  netstat -ano | findstr :$port"
    exit 1
}

Write-Host "Starting PharmaWatch Analysis API on http://localhost:$port" -ForegroundColor Green
python -m uvicorn api_server:app --reload --port $port
