$orderBody = @{
    items = @(
        @{
            productId = '68f9565344181e74d8ce5b49'
            quantity = 1
            notes = 'TESTE MBWAY via prod backend'
        }
    )
    notes = 'Pedido teste MBWAY'
} | ConvertTo-Json -Depth 10

$backend = 'https://backend-production-348d.up.railway.app'

try {
    $orderResp = Invoke-RestMethod -Uri "$backend/v1/public/orders" -Method POST -ContentType 'application/json' -Body $orderBody
    $orderId = $orderResp.id
    Write-Host "[OK] Order: $orderId"
} catch {
    Write-Host "[ERRO] Criar pedido: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host "Detalhes: $($_.ErrorDetails.Message)" }
    exit 1
}

$paymentBody = @{
    orderId = $orderId
    amount = 0.10
    phoneNumber = '962751338'
    customerEmail = 'teste@menu-digital.pt'
} | ConvertTo-Json

try {
    $payResp = Invoke-RestMethod -Uri "$backend/v1/public/payments/mbway" -Method POST -ContentType 'application/json' -Body $paymentBody
    $json = $payResp | ConvertTo-Json -Depth 6
    Write-Host $json
} catch {
    Write-Host "[ERRO] Criar MB WAY: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host "Detalhes: $($_.ErrorDetails.Message)" }
    exit 1
}