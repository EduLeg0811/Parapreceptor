param(
    [int]$Port = 8787,
    [string]$HostAddress = "127.0.0.1",
    [switch]$NoReload
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$venvPython = Join-Path $root ".venv\Scripts\python.exe"
if (Test-Path -LiteralPath $venvPython) {
    $python = $venvPython
} else {
    $python = "python"
}

$reloadArgs = @()
if (-not $NoReload) {
    $reloadArgs += "--reload"
}

Write-Host "Starting Parapreceptor backend at http://$HostAddress`:$Port"
Write-Host "Docs: http://$HostAddress`:$Port/docs"
Write-Host ""

& $python -m uvicorn backend.main:app --host $HostAddress --port $Port @reloadArgs
