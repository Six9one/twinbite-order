# setup-printenv.ps1
# Called by INSTALLER.bat to create print-server/.env from the root .env
# Usage: powershell -File setup-printenv.ps1 "path\to\.env" "path\to\print-server\.env"

param(
    [string]$SourceEnv,
    [string]$DestEnv
)

if (-not (Test-Path $SourceEnv)) {
    Write-Host "Source .env not found: $SourceEnv"
    exit 1
}

$root = Get-Content $SourceEnv -Raw

function Get-EnvValue($content, $key) {
    if ($content -match "(?m)^${key}\s*=\s*[`"']?([^`"'\r\n]+)") {
        return $matches[1].Trim()
    }
    return ""
}

$url  = Get-EnvValue $root "VITE_SUPABASE_URL"
if (-not $url) { $url = Get-EnvValue $root "SUPABASE_URL" }

$key  = Get-EnvValue $root "VITE_SUPABASE_ANON_KEY"
if (-not $key) { $key = Get-EnvValue $root "SUPABASE_ANON_KEY" }

$ip   = Get-EnvValue $root "PRINTER_IPS"
if (-not $ip) { $ip = Get-EnvValue $root "PRINTER_IP" }
if (-not $ip) { $ip = "192.168.1.100" }

$port = Get-EnvValue $root "PRINTER_PORT"
if (-not $port) { $port = "9100" }

$content = @"
SUPABASE_URL=$url
SUPABASE_ANON_KEY=$key
PRINTER_IPS=$ip
PRINTER_PORT=$port
USB_PRINTER_NAME=Star TSP100 Cutter (TSP143)
"@

Set-Content -Path $DestEnv -Value $content -Encoding UTF8
Write-Host "OK  print-server/.env created from root .env"
