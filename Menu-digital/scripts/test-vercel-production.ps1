# Script de Teste - Validação Completa Vercel + IfThenPay
# Execute após remover a Deployment Protection

$DOMAIN = "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app"
$KEY = "APk9%23vB7tL2xQ%21sR"  # URL encoded
$KEY_RAW = "APk9#vB7tL2xQ!sR"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTES DE VALIDAÇÃO - VERCEL PRODUCTION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: HEAD Healthcheck
Write-Host "[1/7] Testing HEAD healthcheck..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Method HEAD -Uri "$DOMAIN/v1/public/payments/ifthenpay/callback" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Status: 200 OK" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL - Status: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: GET Healthcheck
Write-Host "`n[2/7] Testing GET healthcheck..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$DOMAIN/v1/public/payments/ifthenpay/callback?healthcheck=1" -Method Get
    if ($response.ok -eq $true) {
        Write-Host "✅ PASS - Response: {ok: true}" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL - Unexpected response: $($response | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Empty query (should also return ok)
Write-Host "`n[3/7] Testing empty query..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$DOMAIN/v1/public/payments/ifthenpay/callback" -Method Get
    if ($response.ok -eq $true) {
        Write-Host "✅ PASS - Response: {ok: true}" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL - Unexpected response: $($response | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Invalid Anti-Phishing Key
Write-Host "`n[4/7] Testing invalid anti-phishing key (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$DOMAIN/v1/public/payments/ifthenpay/callback?Key=INVALID_KEY" -Method Get
    Write-Host "❌ FAIL - Should have returned 401, but got: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS - Correctly rejected with 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL - Wrong error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Valid Key but missing RequestId
Write-Host "`n[5/7] Testing valid key without RequestId (should fail)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$DOMAIN/v1/public/payments/ifthenpay/callback?Key=$KEY" -Method Get
    Write-Host "❌ FAIL - Should have returned 400, but got: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ PASS - Correctly rejected with 400 Bad Request" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL - Wrong error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Proxy /v1 to Railway backend
Write-Host "`n[6/7] Testing proxy /v1 to Railway backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$DOMAIN/v1/public/products" -Method Get
    Write-Host "✅ PASS - Backend responded (proxy working)" -ForegroundColor Green
    Write-Host "Response preview: $($response | ConvertTo-Json -Depth 1 | Select-Object -First 200)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️  WARN - 404: Endpoint may not exist, but proxy is working" -ForegroundColor Yellow
    } else {
        Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 7: Proxy /public to Railway backend
Write-Host "`n[7/7] Testing proxy /public to Railway backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$DOMAIN/public/health" -Method Get
    Write-Host "✅ PASS - Backend responded (proxy working)" -ForegroundColor Green
    Write-Host "Response preview: $($response | ConvertTo-Json -Depth 1 | Select-Object -First 200)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️  WARN - 404: Endpoint may not exist, but proxy is working" -ForegroundColor Yellow
    } else {
        Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Se todos os testes passaram, configure o callback no backoffice IfThenPay" -ForegroundColor White
Write-Host "   URL: $DOMAIN/v1/public/payments/ifthenpay/callback" -ForegroundColor Gray
Write-Host "   Anti-Phishing Key: $KEY_RAW" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Crie um pedido de teste no sistema para gerar um payment com:" -ForegroundColor White
Write-Host "   - requestId: REQ123" -ForegroundColor Gray
Write-Host "   - method: mbway" -ForegroundColor Gray
Write-Host "   - status: pending" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Teste o callback completo com:" -ForegroundColor White
Write-Host "   Invoke-RestMethod -Uri '$DOMAIN/v1/public/payments/ifthenpay/callback?Key=$KEY&RequestId=REQ123&Estado=000'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verifique no MongoDB Atlas que:" -ForegroundColor White
Write-Host "   - payments.status = 'completed'" -ForegroundColor Gray
Write-Host "   - payments.paidAt está preenchido" -ForegroundColor Gray
Write-Host "   - orders.paymentStatus = 'paid'" -ForegroundColor Gray
Write-Host "   - orders.paidAt está preenchido" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Cyan

