# PowerShell script to build and run the Donut GPU service
# Requires: NVIDIA Container Toolkit on Windows and Docker configured for GPUs
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root\.. 

Write-Host "Building donut-gpu image..."
docker compose build --no-cache donut-gpu

Write-Host "Starting donut-gpu container (with GPUs)..."
docker compose up -d --no-deps --build donut-gpu

Write-Host "Donut GPU service started. View logs: docker compose logs -f donut-gpu"
