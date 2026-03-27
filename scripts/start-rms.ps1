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

Run-Step "Prisma client olusturuluyor..." "Set-Location '$projectRoot'; npm run db:generate"
Run-Step "Veritabani migration uygulanıyor..." "Set-Location '$projectRoot'; npm run db:deploy"
Run-Step "Baslangic verileri yukleniyor..." "Set-Location '$projectRoot'; npm run db:seed"

$job = Start-Job -ScriptBlock {
  param($root)
  Set-Location $root
  npm run dev
} -ArgumentList $projectRoot

Write-Host "Sunucu baslatiliyor..."

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 2
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
  throw "Uygulama 3000 portunda acilamadi."
}

Start-Process "http://127.0.0.1:3000"
Write-Host "Arayuz acildi. Pencereyi kapatirsaniz sunucu durur."

Receive-Job -Job $job -Wait -AutoRemoveJob
