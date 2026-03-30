$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name bulunamadi. Once yukleyin."
  }
}

function Ensure-EnvFile {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env dosyasi .env.example uzerinden olusturuldu."
  }
}

function Read-EnvFile {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path $Path)) {
    return $values
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed -split "=", 2
    if ($parts.Count -ne 2) {
      continue
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($key.Length -gt 0) {
      $values[$key] = $value
    }
  }

  return $values
}

function Apply-ProcessEnv {
  param([hashtable]$Values)

  foreach ($entry in $Values.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($entry.Key, "Process"))) {
      [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
    }
  }
}

function Get-EnvOrDefault {
  param(
    [string]$Name,
    [string]$DefaultValue
  )

  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $DefaultValue
  }

  return $value
}

function Ensure-Dependencies {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Bagimliliklar kuruluyor..."
    npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install basarisiz oldu."
    }
  }
}

function Run-Step {
  param(
    [string]$Title,
    [string]$Command
  )

  Write-Host $Title
  powershell -NoProfile -ExecutionPolicy Bypass -Command $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Title basarisiz oldu."
  }
}

Require-Command node
Require-Command npm

Ensure-EnvFile
Ensure-Dependencies

$envValues = Read-EnvFile ".env"
Apply-ProcessEnv $envValues

$backendMode = (Get-EnvOrDefault -Name "RMS_BACKEND_MODE" -DefaultValue "shared-file").ToLowerInvariant()
$webPort = Get-EnvOrDefault -Name "PORT" -DefaultValue "3210"
$sharedRoot = Get-EnvOrDefault -Name "RMS_SHARED_ROOT" -DefaultValue ""
$databaseUrl = Get-EnvOrDefault -Name "DATABASE_URL" -DefaultValue ""

if ($backendMode -eq "postgres") {
  if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "RMS_BACKEND_MODE=postgres icin DATABASE_URL tanimli olmali."
  }

  Run-Step "Prisma client olusturuluyor..." "Set-Location '$projectRoot'; npm run db:generate"
  Run-Step "Veritabani migration uygulanıyor..." "Set-Location '$projectRoot'; npm run db:deploy"
  Run-Step "Baslangic verileri yukleniyor..." "Set-Location '$projectRoot'; npm run db:seed"
} else {
  Write-Host "Shared-file modu secildi. Uygulama ortak klasordeki rms-data.json uzerinden calisacak."
}

$job = Start-Job -ScriptBlock {
  param($root, $port, $mode, $dbUrl, $sharedRootValue)
  Set-Location $root
  [Environment]::SetEnvironmentVariable("PORT", $port, "Process")
  [Environment]::SetEnvironmentVariable("RMS_BACKEND_MODE", $mode, "Process")
  if (-not [string]::IsNullOrWhiteSpace($dbUrl)) {
    [Environment]::SetEnvironmentVariable("DATABASE_URL", $dbUrl, "Process")
  }
  if (-not [string]::IsNullOrWhiteSpace($sharedRootValue)) {
    [Environment]::SetEnvironmentVariable("RMS_SHARED_ROOT", $sharedRootValue, "Process")
  }
  npm run dev
} -ArgumentList $projectRoot, $webPort, $backendMode, $databaseUrl, $sharedRoot

Write-Host "Sunucu baslatiliyor..."

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$webPort" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200) {
      $ready = $true
      break
    }
  } catch {
  }
}

if (-not $ready) {
  Receive-Job -Job $job -Keep | Select-Object -Last 20
  Stop-Job $job | Out-Null
  Remove-Job $job | Out-Null
  throw "Uygulama $webPort portunda acilamadi."
}

Start-Process "http://127.0.0.1:$webPort"
Write-Host "Arayuz acildi. Pencereyi kapatirsaniz sunucu durur."

Receive-Job -Job $job -Wait -AutoRemoveJob
