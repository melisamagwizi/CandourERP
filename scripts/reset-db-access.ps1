# Candour ERP — one-time local DB access setup.
# Creates the `candour_app` role and `candour` database on the PostgreSQL 18
# instance (port 5432). It does NOT need the forgotten postgres password:
# it temporarily switches local auth to `trust`, does the work, then restores
# pg_hba.conf exactly as it was. Requires Administrator (will self-elevate).
$ErrorActionPreference = 'Stop'

# --- self-elevate so it can edit pg_hba.conf and bounce the service ---
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $admin) {
  Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`""
  exit
}

$log  = Join-Path $PSScriptRoot 'reset-db-access.log'
$data = 'C:\Program Files\PostgreSQL\18\data'
$hba  = Join-Path $data 'pg_hba.conf'
$bak  = Join-Path $data 'pg_hba.conf.candour-bak'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$svc  = 'postgresql-x64-18'
"[*] start $(Get-Date -Format o)" | Out-File $log -Encoding ascii

try {
  Copy-Item $hba $bak -Force
  $orig  = Get-Content $hba -Raw
  $trust = "# TEMP candour trust`r`nhost all postgres 127.0.0.1/32 trust`r`nhost all postgres ::1/128 trust`r`n"
  ($trust + $orig) | Set-Content $hba -Encoding ascii
  Restart-Service $svc
  Start-Sleep -Seconds 3

  $hasRole = & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='candour_app'"
  if (-not $hasRole) {
    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE ROLE candour_app LOGIN PASSWORD 'devpass'" | Out-Null
    "[+] role candour_app created" | Add-Content $log
  } else { "[=] role candour_app already exists" | Add-Content $log }

  $hasDb = & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='candour'"
  if (-not $hasDb) {
    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE candour OWNER candour_app" | Out-Null
    "[+] database candour created" | Add-Content $log
  } else { "[=] database candour already exists" | Add-Content $log }

  "[*] DONE-OK" | Add-Content $log
}
catch { "[!] ERROR: $_" | Add-Content $log }
finally {
  if (Test-Path $bak) {
    Copy-Item $bak $hba -Force
    Restart-Service $svc
    "[*] pg_hba.conf restored to original" | Add-Content $log
  }
}
