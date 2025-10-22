$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

function Get-Status {
    param(
        [string]$Url,
        [hashtable]$Headers
    )
    try {
        if ($Headers) {
            $resp = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -Headers $Headers -ErrorAction Stop
        } else {
            $resp = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -ErrorAction Stop
        }
        return [int]$resp.StatusCode
    } catch {
        $resp = $_.Exception.Response
        if ($resp -and ($resp.PSObject.Properties.Name -contains 'StatusCode')) { return [int]$resp.StatusCode }
        elseif ($resp -and $resp.StatusCode.value__) { return [int]$resp.StatusCode.value__ }
        else { return -1 }
    }
}

$status1 = Get-Status "$base/v1/admin/tables" $null

$loginBody = '{"email":"admin@example.com","password":"admin123"}'
$rLogin = Invoke-WebRequest -Uri "$base/v1/auth/login" -Method POST -UseBasicParsing -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
$token = ($rLogin.Content | ConvertFrom-Json).token

$status2 = Get-Status "$base/v1/admin/tables" @{ Authorization = "Bearer $token" }

Write-Host "status1=$status1"
Write-Host "status2=$status2"