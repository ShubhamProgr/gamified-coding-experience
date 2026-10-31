$ErrorActionPreference = "Stop"

$frontend = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path (Split-Path -Parent $frontend) "backend"

Start-Process powershell.exe -ArgumentList @(
    "-NoProfile",
    "-Command",
    "Set-Location -LiteralPath '$backend'; py -3 -m uvicorn main:app --host 127.0.0.1 --port 8000"
) -WindowStyle Hidden

Set-Location -LiteralPath $frontend
npm run dev:next
