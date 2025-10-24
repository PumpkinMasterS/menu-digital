# Script para criar pagamento de teste MB WAY
# Valor: 0.10 EUR
# Telefone: 962751338

$BACKEND_URL = "https://menu-digital-production.up.railway.app"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  CRIAR PAGAMENTO DE TESTE MB WAY" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "[1/3] Criando pedido de teste..." -ForegroundColor Yellow

# Criar pedido com produto barato
$orderBody = @{
    items = @(
        @{
            productId = "68f9565344181e74d8ce5b49"  # Aneis de Cebola (4 EUR)
            quantity = 1
            notes = "TESTE MB WAY - Pagamento 0.10 EUR"
        }
    )
    notes = "Pedido de teste para validacao MB WAY callback"
} | ConvertTo-Json -Depth 10

try {
    $orderResponse = Invoke-RestMethod -Uri "$BACKEND_URL/v1/public/orders" `
        -Method POST `
        -ContentType "application/json" `
        -Body $orderBody
    
    $orderId = $orderResponse.id
    Write-Host "    [OK] Pedido criado: $orderId" -ForegroundColor Green
    Write-Host "    Total do pedido: $($orderResponse.totals.total) EUR" -ForegroundColor Gray
} catch {
    Write-Host "    [ERRO] Falha ao criar pedido: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Criando pagamento MB WAY de 0.10 EUR..." -ForegroundColor Yellow

# Criar pagamento MB WAY com valor personalizado
$paymentBody = @{
    orderId = $orderId
    amount = 0.10
    phoneNumber = "962751338"
    customerEmail = "teste@menu-digital.pt"
} | ConvertTo-Json

try {
    $paymentResponse = Invoke-RestMethod -Uri "$BACKEND_URL/v1/public/payments/mbway" `
        -Method POST `
        -ContentType "application/json" `
        -Body $paymentBody
    
    $requestId = $paymentResponse.requestId
    Write-Host "    [OK] Pagamento criado!" -ForegroundColor Green
    Write-Host "    RequestId: $requestId" -ForegroundColor Gray
    Write-Host "    Telefone: $($paymentResponse.phoneNumber)" -ForegroundColor Gray
    Write-Host "    Valor: $($paymentResponse.amount) EUR" -ForegroundColor Gray
    Write-Host "    Status: $($paymentResponse.status)" -ForegroundColor Gray
    Write-Host "    Expira em: $($paymentResponse.expiresAt)" -ForegroundColor Gray
    
    if ($paymentResponse.simulation) {
        Write-Host "`n    [AVISO] Modo simulacao ativo!" -ForegroundColor Yellow
        Write-Host "    $($paymentResponse.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    [ERRO] Falha ao criar pagamento: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Validando no MongoDB Atlas..." -ForegroundColor Yellow
Write-Host "    Verifique a collection 'payments' no Atlas:" -ForegroundColor Gray
Write-Host "    - requestId: $requestId" -ForegroundColor Gray
Write-Host "    - orderId: $orderId" -ForegroundColor Gray
Write-Host "    - amount: 0.10" -ForegroundColor Gray
Write-Host "    - status: pending" -ForegroundColor Gray
Write-Host "    - phoneNumber: 962751338" -ForegroundColor Gray

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "1. Verifique o telemovel 962751338 - deve ter notificacao MB WAY" -ForegroundColor White
Write-Host ""
Write-Host "2. Aprove o pagamento de 0.10 EUR na app MB WAY" -ForegroundColor White
Write-Host ""
Write-Host "3. O IfThenPay ira chamar o callback:" -ForegroundColor White
Write-Host "   https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Validar no MongoDB Atlas que foi atualizado:" -ForegroundColor White
Write-Host "   - payments.status = 'completed'" -ForegroundColor Gray
Write-Host "   - payments.paidAt = (data atual)" -ForegroundColor Gray
Write-Host "   - orders.paymentStatus = 'paid'" -ForegroundColor Gray
Write-Host "   - orders.paidAt = (data atual)" -ForegroundColor Gray
Write-Host ""

Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "DADOS PARA REFERENCIA:" -ForegroundColor Yellow
Write-Host "  Order ID:    $orderId" -ForegroundColor White
Write-Host "  Request ID:  $requestId" -ForegroundColor White
Write-Host "  Telefone:    962751338" -ForegroundColor White
Write-Host "  Valor:       0.10 EUR" -ForegroundColor White
Write-Host ""

