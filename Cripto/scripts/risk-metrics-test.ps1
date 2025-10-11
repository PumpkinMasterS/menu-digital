param(
  [string]$ServerUrl = 'http://localhost:3000',
  [int]$MaxConcurrent = 2,
  [int]$CooldownSeconds = 2,
  [string[]]$Symbols = @('BTCUSDT','ETHUSDT','SOLUSDT'),
  [string]$Timeframe = '1m',
  [int]$Batch1 = 2,
  [int]$Batch2 = 1,
  [int]$DelayMsBetweenBatches = 300,
  [switch]$Parallel
)

function Publish-RuleConfig {
  param(
    [string]$Url,
    [int]$MaxConcurrent,
    [int]$CooldownSeconds,
    [string[]]$Symbols,
    [string]$Timeframe
  )
  $cfg = [ordered]@{
    schemaVersion = 1
    name          = "automation-$MaxConcurrent-$CooldownSeconds"
    effectiveAt   = (Get-Date).ToUniversalTime().ToString('o')
    timeframes    = @($Timeframe)
    symbols       = $Symbols
    risk          = [ordered]@{
      maxConcurrentSignals = $MaxConcurrent
      rrMin                = 0
      killSwitch           = $false
      cooldownSeconds      = $CooldownSeconds
    }
    precedence    = @($Timeframe)
  } | ConvertTo-Json -Depth 5
  try {
    Invoke-RestMethod -Uri "$Url/publish" -Method Post -ContentType 'application/json' -Body $cfg | Out-Null
    Write-Host "[OK] Publicado config em $Url/publish (maxConcurrent=$MaxConcurrent, cooldown=$CooldownSeconds s)"
  }
  catch {
    Write-Host "[ERRO] Publicação falhou: $($_.Exception.Message)" -ForegroundColor Red
    throw
  }
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
    idempotencyKey = ("auto-" + [guid]::NewGuid().ToString())
    payload        = $Payload
  } | ConvertTo-Json -Depth 5
}

function Send-Signals {
  param(
    [string]$Url,
    [string[]]$Symbols,
    [string]$Timeframe,
    [int]$Batch1,
    [int]$Batch2,
    [int]$DelayMs,
    [switch]$Parallel
  )
  $now = Get-Date
  $sent = 0

  # Lote 1
  $jobs = @()
  for ($i=0; $i -lt $Batch1; $i++) {
    $sym = $Symbols[$i % $Symbols.Count]
    $body = New-SignalBody -Symbol $sym -Timeframe $Timeframe -CloseTime $now -Payload @{ src='automation'; batch=1; n=($i+1) }
    if ($Parallel) {
      $jobs += Start-Job -ScriptBlock { param($u,$b) Invoke-RestMethod -Uri "$u/signals/enqueue" -Method Post -ContentType 'application/json' -Body $b | Out-Null } -ArgumentList $Url,$body
    } else {
      Invoke-RestMethod -Uri "$Url/signals/enqueue" -Method Post -ContentType 'application/json' -Body $body | Out-Null
    }
    $sent++
  }
  if ($jobs.Count -gt 0) { Wait-Job -Job $jobs | Out-Null; Remove-Job -Job $jobs | Out-Null }

  if ($Batch2 -gt 0) { Start-Sleep -Milliseconds $DelayMs }

  # Lote 2
  $jobs = @()
  for ($j=0; $j -lt $Batch2; $j++) {
    $sym = $Symbols[($Batch1 + $j) % $Symbols.Count]
    $body = New-SignalBody -Symbol $sym -Timeframe $Timeframe -CloseTime $now -Payload @{ src='automation'; batch=2; n=($j+1) }
    if ($Parallel) {
      $jobs += Start-Job -ScriptBlock { param($u,$b) Invoke-RestMethod -Uri "$u/signals/enqueue" -Method Post -ContentType 'application/json' -Body $b | Out-Null } -ArgumentList $Url,$body
    } else {
      Invoke-RestMethod -Uri "$Url/signals/enqueue" -Method Post -ContentType 'application/json' -Body $body | Out-Null
    }
    $sent++
  }
  if ($jobs.Count -gt 0) { Wait-Job -Job $jobs | Out-Null; Remove-Job -Job $jobs | Out-Null }

  Write-Host "[OK] Sinais enviados: $sent (Batch1=$Batch1, Batch2=$Batch2, Paralelo=$($Parallel.IsPresent))"
}

function Get-MetricsSummary {
  param(
    [string]$Url,
    [string]$Timeframe,
    [string]$OutFile
  )
  curl.exe -s "$Url/metrics" -o $OutFile | Out-Null
  # Escapar chaves para o formatador (-f) e manter regex de status
  $pattern = ('signals_processed_total{{timeframe="{0}",status="(ok|max_concurrent|cooldown)"}}' -f $Timeframe)
  $lines = Select-String -Path $OutFile -Pattern $pattern
  if (-not $lines) {
    Write-Host "[WARN] Nenhuma linha de métricas encontrada para timeframe=$Timeframe" -ForegroundColor Yellow
    return
  }
  Write-Host "[MÉTRICAS] ($OutFile)" -ForegroundColor Cyan
  $lines | ForEach-Object { $_.Line } | ForEach-Object { Write-Host "  $_" }
}

# Execução
Publish-RuleConfig -Url $ServerUrl -MaxConcurrent $MaxConcurrent -CooldownSeconds $CooldownSeconds -Symbols $Symbols -Timeframe $Timeframe
Send-Signals -Url $ServerUrl -Symbols $Symbols -Timeframe $Timeframe -Batch1 $Batch1 -Batch2 $Batch2 -DelayMs $DelayMsBetweenBatches -Parallel:$Parallel
Start-Sleep -Milliseconds 500
$metricsFile = Join-Path (Get-Location) 'metrics_dump.txt'
Get-MetricsSummary -Url $ServerUrl -Timeframe $Timeframe -OutFile $metricsFile