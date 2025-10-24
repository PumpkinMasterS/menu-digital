# Script para validar pagamento no MongoDB Atlas via API

param(
    [string]$RequestId = "bkmu9xf1eek-1761221686135",
    [string]$OrderId = "bkmu9xf1eek"
)

$BACKEND_URL = "https://menu-digital-production.up.railway.app"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  VALIDAR STATUS DO PAGAMENTO" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "[INFO] Request ID: $RequestId" -ForegroundColor Gray
Write-Host "[INFO] Order ID: $OrderId`n" -ForegroundColor Gray

Write-Host "[1/2] Verificando status do pagamento..." -ForegroundColor Yellow

try {
    $paymentStatus = Invoke-RestMethod -Uri "$BACKEND_URL/v1/public/payments/$OrderId/status" -Method GET
    
    Write-Host "    [OK] Pagamento encontrado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "    Metodo:      $($paymentStatus.method)" -ForegroundColor White
    Write-Host "    Status:      " -NoNewline -ForegroundColor White
    
    if ($paymentStatus.status -eq "completed") {
        Write-Host "$($paymentStatus.status)" -ForegroundColor Green
    } elseif ($paymentStatus.status -eq "pending") {
        Write-Host "$($paymentStatus.status)" -ForegroundColor Yellow
    } else {
        Write-Host "$($paymentStatus.status)" -ForegroundColor Red
    }
    
    Write-Host "    Valor:       $($paymentStatus.amount) EUR" -ForegroundColor White
    Write-Host "    Telefone:    $($paymentStatus.phoneNumber)" -ForegroundColor White
    Write-Host "    Request ID:  $($paymentStatus.requestId)" -ForegroundColor White
    Write-Host "    Criado em:   $($paymentStatus.createdAt)" -ForegroundColor White
    
    if ($paymentStatus.paidAt) {
        Write-Host "    Pago em:     $($paymentStatus.paidAt)" -ForegroundColor Green
    }
    
    if ($paymentStatus.expiresAt) {
        Write-Host "    Expira em:   $($paymentStatus.expiresAt)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "    [ERRO] Falha ao verificar pagamento: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[2/2] Verificando status do pedido..." -ForegroundColor Yellow

try {
    $orderStatus = Invoke-RestMethod -Uri "$BACKEND_URL/v1/public/orders/$OrderId" -Method GET
    
    Write-Host "    [OK] Pedido encontrado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "    Status:      $($orderStatus.status)" -ForegroundColor White
    Write-Host "    Total:       $($orderStatus.total) EUR" -ForegroundColor White
    Write-Host "    Itens:       $($orderStatus.items.Count)" -ForegroundColor White
    
    foreach ($item in $orderStatus.items) {
        Write-Host "      - $($item.quantity)x $($item.name)" -ForegroundColor Gray
    }
    
    Write-Host "    Criado em:   $($orderStatus.createdAt)" -ForegroundColor White
    
} catch {
    Write-Host "    [ERRO] Falha ao verificar pedido: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

if ($paymentStatus.status -eq "completed") {
    Write-Host "[SUCCESS] Pagamento aprovado e processado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Callback do IfThenPay funcionou corretamente:" -ForegroundColor Green
    Write-Host "  - Payment status atualizado para 'completed'" -ForegroundColor White
    Write-Host "  - paidAt registrado: $($paymentStatus.paidAt)" -ForegroundColor White
    Write-Host ""
    Write-Host "Sistema 100% operacional!" -ForegroundColor Green
    
} elseif ($paymentStatus.status -eq "pending") {
    Write-Host "[AGUARDANDO] Pagamento ainda pendente" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Aguarde:" -ForegroundColor Yellow
    Write-Host "  1. Aprovacao no telemovel 962751338" -ForegroundColor White
    Write-Host "  2. Callback do IfThenPay (pode levar alguns segundos)" -ForegroundColor White
    Write-Host ""
    Write-Host "Execute este script novamente em alguns segundos:" -ForegroundColor Yellow
    Write-Host "  .\scripts\validar-pagamento.ps1" -ForegroundColor Gray
    
} else {
    Write-Host "[FALHA] Pagamento nao foi concluido" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status: $($paymentStatus.status)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Se o pagamento foi rejeitado no telemovel" -ForegroundColor White
    Write-Host "  2. Logs do callback: vercel logs <url>" -ForegroundColor White
    Write-Host "  3. MongoDB Atlas para detalhes" -ForegroundColor White
}

Write-Host ""
Write-Host "================================================================`n" -ForegroundColor Cyan

