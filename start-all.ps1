$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-PhishXProcess {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$WorkingDirectory'; `$host.UI.RawUI.WindowTitle = '$Title'; $Command"
    )
}

Write-Host "Starting PhishX services..." -ForegroundColor Cyan

Start-PhishXProcess -Title "PhishX Backend" -WorkingDirectory $repoRoot -Command "$env:MONGO_MEMORY_FALLBACK='true'; npm run server:dev"
Start-PhishXProcess -Title "PhishX Frontend" -WorkingDirectory $repoRoot -Command "npm run client:dev"
Start-PhishXProcess -Title "PhishX ML Service" -WorkingDirectory $repoRoot -Command "python -m uvicorn inference_service.app:app --app-dir MLPipeline/py --host 127.0.0.1 --port 8010"

Write-Host "Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "ML API:   http://127.0.0.1:8010" -ForegroundColor Green
