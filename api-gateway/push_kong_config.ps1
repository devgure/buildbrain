param(
  [string]$KongAdmin = 'http://localhost:8001',
  [string]$File = 'api-gateway/kong.yaml'
)

if (-not (Test-Path $File)) {
  Write-Error "Config file not found: $File"
  exit 2
}

Write-Host "Pushing $File to Kong Admin at $KongAdmin/config"

$bytes = [System.IO.File]::ReadAllBytes($File)
$response = Invoke-RestMethod -Method Post -Uri "$KongAdmin/config" -ContentType 'application/yaml' -Body $bytes
$response | ConvertTo-Json -Depth 5

Write-Host "Done. Check Kong admin: $KongAdmin/status"