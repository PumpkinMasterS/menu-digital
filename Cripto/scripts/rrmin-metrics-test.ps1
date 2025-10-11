param(
  [string]$ServerUrl = 'http://localhost:3000',
  [string]$Timeframe = '1m',
  [string]$Symbol = 'BTCUSDT',
  [double]$RrMin = 2.0,
  [string]$OutFile = (Join-Path (Get-Location) '.test_outputs\e2e_rr_min.txt')
)

function Publish-RuleConfig {
  param(
    [string]$ApiUrl,
    [string]$Timeframe,
    [string]$Symbol,
    [double]$RrMin
  )
  $cfg = [ordered]@{
    schemaVersion = 1
    name          = "rrmin-e2e-$RrMin"
    effectiveAt   = (Get-Date).ToUniversalTime().ToString('o')
    timeframes    = @($Timeframe)
    symbols       = @($Symbol)
    risk          = [ordered]@{
      maxConcurrentSignals = 3
      rrMin                = $RrMin
      killSwitch           = $false
      cooldownSeconds      = 0
    }
    precedence    = @($Timeframe)
  } | ConvertTo-Json -Depth 5
  $base = $ApiUrl.TrimEnd('/')
  Invoke-RestMethod -Uri "$base/publish" -Method Post -ContentType 'application/json' -Body $cfg | Out-Null
  Write-Host ("[OK] Publicado rrMin={0} em {1}" -f $RrMin, "$base/publish")
}

function New-SignalBody {
  param(
    [string]$Symbol,
    [string]$Timeframe,
    [datetime]$CloseTime,
    [hashtable]$Payload
  )
  return @{ 
    symbol         = $Symbol
    timeframe      = $Timeframe
    closeTime      = ($CloseTime.ToUniversalTime().ToString('o'))
    idempotencyKey = ("rr-" + [guid]::NewGuid().ToString())
    payload        = $Payload
  } | ConvertTo-Json -Depth 5
}

function Send-RrSignals {
  param(
    [string]$ApiUrl,
    [string]$Symbol,
    [string]$Timeframe,
    [double]$Below,
    [double]$Above
  )
  $now = Get-Date
  $bodyBad = New-SignalBody -Symbol $Symbol -Timeframe $Timeframe -CloseTime $now -Payload @{ src='rrmin-e2e'; expectedRR=$Below }
  $bodyOk  = New-SignalBody -Symbol $Symbol -Timeframe $Timeframe -CloseTime $now -Payload @{ src='rrmin-e2e'; expectedRR=$Above }
  $signalsUrl = ("{0}/signals/enqueue" -f $ApiUrl.TrimEnd('/'))
  Invoke-RestMethod -Uri $signalsUrl -Method Post -ContentType 'application/json' -Body $bodyBad | Out-Null
  Start-Sleep -Milliseconds 200
  Invoke-RestMethod -Uri $signalsUrl -Method Post -ContentType 'application/json' -Body $bodyOk | Out-Null
  Write-Host ("[OK] Enfileirados sinais: below={0}, above={1}" -f $Below,$Above)
}

function Dump-Metrics {
  param(
    [string]$ApiUrl,
    [string]$Timeframe,
    [string]$OutFile,
    [string]$FullOutFile = $null
  )
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("metrics-" + [guid]::NewGuid().ToString() + ".txt")
  curl.exe -s ("{0}/metrics" -f $ApiUrl.TrimEnd('/')) -o $tmp | Out-Null
  # Padrões literais (usando {{ }} para escapar chaves no -f)
  $patternOk    = ('signals_processed_total{{timeframe="{0}",status="ok"}}' -f $Timeframe)
  $patternRrMin = ('signals_processed_total{{timeframe="{0}",status="rr_min"}}' -f $Timeframe)
  $outLines = @()
  $lines = Get-Content -Path $tmp -ErrorAction SilentlyContinue
  if ($null -ne $lines) {
    $okLine    = $lines | Where-Object { $_ -like ("*{0}*" -f $patternOk) } | Select-Object -First 1
    $rrminLine = $lines | Where-Object { $_ -like ("*{0}*" -f $patternRrMin) } | Select-Object -First 1
    if ($okLine)    { $outLines += $okLine }
    if ($rrminLine) { $outLines += $rrminLine }
  }
  $outDir = Split-Path -Parent $OutFile
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
  Set-Content -Path $OutFile -Value $outLines -Encoding UTF8
  if ($FullOutFile) {
    $fullDir = Split-Path -Parent $FullOutFile
    if (-not (Test-Path $fullDir)) { New-Item -ItemType Directory -Path $fullDir | Out-Null }
    Copy-Item -Path $tmp -Destination $FullOutFile -Force
  }
  Remove-Item $tmp -ErrorAction SilentlyContinue
  Write-Host ("[MÉTRICAS] Dump salvo em {0}" -f $OutFile) -ForegroundColor Cyan
  if ($FullOutFile) { Write-Host ("[MÉTRICAS] Snapshot completo salvo em {0}" -f $FullOutFile) -ForegroundColor DarkCyan }
}

# Execução
$api = $ServerUrl
Publish-RuleConfig -ApiUrl $api -Timeframe $Timeframe -Symbol $Symbol -RrMin $RrMin
Send-RrSignals -ApiUrl $api -Symbol $Symbol -Timeframe $Timeframe -Below ($RrMin - 0.5) -Above ($RrMin + 0.5)
Start-Sleep -Milliseconds 2500
Dump-Metrics -ApiUrl $api -Timeframe $Timeframe -OutFile $OutFile -FullOutFile (Join-Path (Get-Location) '.test_outputs\metrics_full.txt')