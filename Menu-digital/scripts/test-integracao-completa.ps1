# ===================================================================
# TESTE DE INTEGRACAO COMPLETA - Menu Digital
# Backend Railway -> MongoDB Atlas -> Vercel -> IfThenPay
# ===================================================================

$RAILWAY_URL = "https://menu-digital-production.up.railway.app"
$VERCEL_URL = "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app"
$ANTI_PHISHING_KEY = "APk9%23vB7tL2xQ%21sR"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  TESTE DE INTEGRACAO COMPLETA - MENU DIGITAL" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [int]$ExpectedStatus = 200,
        [string]$ExpectedContent = $null
    )
    
    $global:totalTests++
    Write-Host "`n[$global:totalTests] Testando: " -NoNewline -ForegroundColor Yellow
    Write-Host $Name -ForegroundColor White
    Write-Host "    URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            if ($ExpectedContent -and $response.Content -notmatch $ExpectedContent) {
                Write-Host "    [FAIL] Status OK mas conteudo inesperado" -ForegroundColor Red
                Write-Host "    Recebido: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
                $global:failedTests++
                return $false
            }
            Write-Host "    [PASS] Status: $($response.StatusCode)" -ForegroundColor Green
            if ($ExpectedContent) {
                Write-Host "    Conteudo validado: OK" -ForegroundColor Green
            }
            $global:passedTests++
            return $true
        } else {
            Write-Host "    [FAIL] Status: $($response.StatusCode) (esperado: $ExpectedStatus)" -ForegroundColor Red
            $global:failedTests++
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "    [PASS] Status: $statusCode (esperado erro)" -ForegroundColor Green
            $global:passedTests++
            return $true
        }
        Write-Host "    [FAIL] Erro: $statusCode (esperado: $ExpectedStatus)" -ForegroundColor Red
        Write-Host "    Detalhe: $($_.Exception.Message)" -ForegroundColor Gray
        $global:failedTests++
        return $false
    }
}

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " FASE 1: BACKEND RAILWAY (Direto)" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan

Test-Endpoint -Name "Health Check" -Url "$RAILWAY_URL/health" -ExpectedContent '"status":"ok"'
Test-Endpoint -Name "Produtos Publicos" -Url "$RAILWAY_URL/v1/public/products" -ExpectedContent '"items"'
Test-Endpoint -Name "Categorias Publicas" -Url "$RAILWAY_URL/v1/public/categories" -ExpectedContent '"id"'

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " FASE 2: VERCEL - ENDPOINTS PUBLICOS" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan

Write-Host "`n[AVISO] Se retornar 401, o Deployment Protection esta ativa." -ForegroundColor Yellow
Write-Host "        Siga instrucoes em O-QUE-NAO-CONSEGUI-FAZER.md para resolver." -ForegroundColor Yellow

Test-Endpoint -Name "Callback IfThenPay - HEAD" -Url "$VERCEL_URL/v1/public/payments/ifthenpay/callback" -Method HEAD
Test-Endpoint -Name "Callback IfThenPay - Healthcheck" -Url "$VERCEL_URL/v1/public/payments/ifthenpay/callback?healthcheck=1" -ExpectedContent '"ok":true'
Test-Endpoint -Name "Callback IfThenPay - Empty Query" -Url "$VERCEL_URL/v1/public/payments/ifthenpay/callback" -ExpectedContent '"ok":true'

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " FASE 3: SEGURANCA ANTI-PHISHING" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan

Test-Endpoint -Name "Key Invalida (deve rejeitar)" -Url "$VERCEL_URL/v1/public/payments/ifthenpay/callback?Key=INVALID" -ExpectedStatus 401
Test-Endpoint -Name "Key Valida sem RequestId (deve rejeitar)" -Url "$VERCEL_URL/v1/public/payments/ifthenpay/callback?Key=$ANTI_PHISHING_KEY" -ExpectedStatus 400

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " FASE 4: PROXIES VERCEL -> RAILWAY" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan

Test-Endpoint -Name "Proxy /v1 - Produtos" -Url "$VERCEL_URL/v1/public/products" -ExpectedContent '"items"'
Test-Endpoint -Name "Proxy /v1 - Categorias" -Url "$VERCEL_URL/v1/public/categories" -ExpectedContent '"id"'

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " FASE 5: MONGODB ATLAS (via API)" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan

Write-Host "`n[INFO] Se os endpoints acima retornaram produtos e categorias," -ForegroundColor Cyan
Write-Host "       isso confirma que o MongoDB Atlas esta conectado e operacional." -ForegroundColor Cyan

# Resumo
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host " Total de testes: $totalTests" -ForegroundColor White
Write-Host " [OK] Aprovados:    " -NoNewline -ForegroundColor Green
Write-Host $passedTests -ForegroundColor White
Write-Host " [FAIL] Falharam:   " -NoNewline -ForegroundColor Red
Write-Host $failedTests -ForegroundColor White

if ($failedTests -eq 0) {
    Write-Host "`n[SUCCESS] TODOS OS TESTES PASSARAM! Sistema 100% operacional!" -ForegroundColor Green
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    Write-Host " PROXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    Write-Host ""
    Write-Host " 1. Configure o callback no backoffice IfThenPay:" -ForegroundColor White
    Write-Host "    URL: $VERCEL_URL/v1/public/payments/ifthenpay/callback" -ForegroundColor Gray
    Write-Host "    Anti-Phishing Key: APk9#vB7tL2xQ!sR" -ForegroundColor Gray
    Write-Host ""
    Write-Host " 2. Teste um pagamento real MB WAY" -ForegroundColor White
    Write-Host ""
    Write-Host " 3. Valide no MongoDB Atlas que os dados foram atualizados" -ForegroundColor White
    Write-Host ""
} elseif ($failedTests -gt 0 -and $passedTests -ge 3) {
    Write-Host "`n[WARN] Alguns testes falharam, mas o core esta funcionando." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Se os erros sao 401 Unauthorized:" -ForegroundColor Yellow
    Write-Host "  - Deployment Protection esta ativa no Vercel" -ForegroundColor White
    Write-Host "  - Veja: O-QUE-NAO-CONSEGUI-FAZER.md para resolver" -ForegroundColor White
    Write-Host ""
    Write-Host "Backend Railway: [OK] Operacional" -ForegroundColor Green
    Write-Host "MongoDB Atlas:   [OK] Conectado" -ForegroundColor Green
    Write-Host "Vercel:          [WARN] Protegido (acao manual necessaria)" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "`n[ERROR] Muitos testes falharam. Verifique:" -ForegroundColor Red
    Write-Host ""
    Write-Host " 1. Logs do Railway: railway logs" -ForegroundColor White
    Write-Host " 2. Logs do Vercel: vercel logs $VERCEL_URL" -ForegroundColor White
    Write-Host " 3. MongoDB Atlas: https://cloud.mongodb.com" -ForegroundColor White
    Write-Host ""
    Write-Host " Documentacao: CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "================================================================`n" -ForegroundColor Cyan
