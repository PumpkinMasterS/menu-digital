$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000"
$outDir = ".test_outputs"
$outFile = Join-Path $outDir "metrics_smoke.txt"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
if (Test-Path $outFile) { Remove-Item $outFile -Force }

$failCount = 0

function Write-Result {
    param(
        [string]$Name,
        [bool]$Ok,
        [string]$Details
    )
    $status = if ($Ok) { "PASS" } else { "FAIL" }
    $line = "[$status] $Name - $Details"
    Add-Content -Path $outFile -Value $line
    if (-not $Ok) { $global:failCount++ }
}

function Test-ContentType {
    param(
        $Response,
        [string]$Expected
    )
    try {
        $ct = $Response.Headers["Content-Type"]
        return ($ct -like "*$Expected*")
    } catch {
        return $false
    }
}

# Healthz
try {
    $resp = Invoke-WebRequest -UseBasicParsing "$baseUrl/healthz"
    $ok = ($resp.StatusCode -eq 200) -and ($resp.Content -match '"status"\s*:\s*"ok"')
    $ctOk = Test-ContentType -Response $resp -Expected "application/json"
    Write-Result -Name "GET /healthz" -Ok $ok -Details "status=$($resp.StatusCode); contentTypeOk=$ctOk"
} catch {
    Write-Result -Name "GET /healthz" -Ok $false -Details $_.Exception.Message
}

# Metrics (Prometheus text)
try {
    $resp = Invoke-WebRequest -UseBasicParsing "$baseUrl/metrics"
    $hasSignalsEnqueued = ($resp.Content -match 'signals_enqueued_total')
    $hasSignalsProcessed = ($resp.Content -match 'signals_processed_total')
    $ctOk = Test-ContentType -Response $resp -Expected "text/plain"
    $ok = ($resp.StatusCode -eq 200) -and $hasSignalsEnqueued -and $hasSignalsProcessed
    Write-Result -Name "GET /metrics" -Ok $ok -Details "status=$($resp.StatusCode); contentTypeOk=$ctOk; signals_enqueued_total=$hasSignalsEnqueued; signals_processed_total=$hasSignalsProcessed"
} catch {
    Write-Result -Name "GET /metrics" -Ok $false -Details $_.Exception.Message
}

# Metrics Summary (JSON)
try {
    $resp = Invoke-WebRequest -UseBasicParsing "$baseUrl/metrics/summary"
    $ctOk = Test-ContentType -Response $resp -Expected "application/json"
    $jsonOk = $false
    try {
        $obj = $resp.Content | ConvertFrom-Json
        $jsonOk = $null -ne $obj -and ($obj.PSObject.Properties.Name -contains 'queue') -and ($obj.PSObject.Properties.Name -contains 'signals') -and ($obj.PSObject.Properties.Name -contains 'risk') -and ($obj.PSObject.Properties.Name -contains 'trades')
    } catch {}
    $ok = ($resp.StatusCode -eq 200) -and $jsonOk
    Write-Result -Name "GET /metrics/summary" -Ok $ok -Details "status=$($resp.StatusCode); contentTypeOk=$ctOk; jsonStructureOk=$jsonOk"
} catch {
    Write-Result -Name "GET /metrics/summary" -Ok $false -Details $_.Exception.Message
}

$summary = "Smoke test completed. Failures: $failCount"
Add-Content -Path $outFile -Value $summary

if ($failCount -gt 0) {
    Write-Output $summary
    exit 1
} else {
    Write-Output $summary
    exit 0
}