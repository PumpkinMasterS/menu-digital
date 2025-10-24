# Script para testar diretamente a API IfThenPay MB WAY

$MBWAY_KEY = "UGE-291261"
$BACKOFFICE_KEY = "2767-7625-6087-1212"
$PHONE = "962751338"
$AMOUNT = "0.10"
$ORDER_ID = "TEST-" + (Get-Date -Format "yyyyMMddHHmmss")

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  TESTE DIRETO API IFTHENPAY MB WAY" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "[INFO] MB WAY Key: $MBWAY_KEY" -ForegroundColor Gray
Write-Host "[INFO] Telefone: $PHONE" -ForegroundColor Gray
Write-Host "[INFO] Valor: $AMOUNT EUR" -ForegroundColor Gray
Write-Host "[INFO] Order ID: $ORDER_ID`n" -ForegroundColor Gray

# Teste 1: API REST v2
Write-Host "[1/3] Testando API REST v2..." -ForegroundColor Yellow

$apiUrl = "https://ifthenpay.com/api/mbway"
$mobileNumber = "351#$PHONE"

$restBody = @{
    mbWayKey = $MBWAY_KEY
    orderId = $ORDER_ID
    amount = $AMOUNT
    mobileNumber = $mobileNumber
    email = "teste@menu-digital.pt"
    description = "Teste API $ORDER_ID"
} | ConvertTo-Json

Write-Host "    URL: $apiUrl" -ForegroundColor Gray
Write-Host "    Mobile: $mobileNumber" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $apiUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $restBody `
        -UseBasicParsing
    
    Write-Host "    [OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "    Response: $($response.Content)" -ForegroundColor White
    
    $json = $response.Content | ConvertFrom-Json
    if ($json.RequestId) {
        Write-Host "    Request ID: $($json.RequestId)" -ForegroundColor Green
    }
    if ($json.Status) {
        Write-Host "    Status: $($json.Status)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "    [ERRO] Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "    Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "    Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Teste 2: API SOAP (fallback legado)
Write-Host "`n[2/3] Testando API SOAP (SetPedidoJson)..." -ForegroundColor Yellow

$soapUrl = "https://mbway.ifthenpay.com/ifthenpaymbw.asmx/SetPedidoJSON"
$nrtlm = "351$PHONE"  # Sem # no formato SOAP

$params = @{
    MbWayKey = $MBWAY_KEY
    canal = "03"
    referencia = $ORDER_ID.Substring(0, [Math]::Min(15, $ORDER_ID.Length))
    valor = $AMOUNT
    nrtlm = $nrtlm
    email = "teste@menu-digital.pt"
    descricao = "Teste SOAP $ORDER_ID"
}

$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
$fullUrl = "$soapUrl`?$queryString"

Write-Host "    URL: $soapUrl" -ForegroundColor Gray
Write-Host "    NRTLM: $nrtlm" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $fullUrl -Method GET -UseBasicParsing
    
    Write-Host "    [OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "    Response: $($response.Content)" -ForegroundColor White
    
    $json = $response.Content | ConvertFrom-Json
    if ($json.IdPedido) {
        Write-Host "    IdPedido: $($json.IdPedido)" -ForegroundColor Green
    }
    if ($json.Estado) {
        Write-Host "    Estado: $($json.Estado)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "    [ERRO] Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "    Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "    Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Teste 3: Verificar se a chave está ativa
Write-Host "`n[3/3] Verificando credenciais..." -ForegroundColor Yellow

Write-Host "    MB WAY Key: $MBWAY_KEY" -ForegroundColor White
Write-Host "    Backoffice Key: $BACKOFFICE_KEY" -ForegroundColor White
Write-Host ""
Write-Host "    [INFO] Verifique no backoffice IfThenPay:" -ForegroundColor Cyan
Write-Host "    1. A chave MB WAY esta ativa?" -ForegroundColor White
Write-Host "    2. O servico MB WAY esta habilitado para a sua conta?" -ForegroundColor White
Write-Host "    3. Existe algum limite de valor minimo? (pode ser que 0.10 EUR seja muito baixo)" -ForegroundColor White
Write-Host "    4. O numero 962751338 esta registado corretamente?" -ForegroundColor White

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "POSSIVEIS CAUSAS:" -ForegroundColor Yellow
Write-Host "1. Chave MB WAY nao ativa no backoffice IfThenPay" -ForegroundColor White
Write-Host "2. Servico MB WAY nao contratado/ativo" -ForegroundColor White
Write-Host "3. Valor minimo pode ser maior que 0.10 EUR" -ForegroundColor White
Write-Host "4. Numero de telefone precisa estar em formato especifico" -ForegroundColor White
Write-Host "5. Ambiente de testes vs producao (sandbox)" -ForegroundColor White
Write-Host ""

Write-Host "SOLUCOES:" -ForegroundColor Yellow
Write-Host "1. Confirme no backoffice IfThenPay que MB WAY esta ativo" -ForegroundColor White
Write-Host "2. Verifique se ha mensagens de erro na area do cliente" -ForegroundColor White
Write-Host "3. Tente com valor maior (ex: 1.00 EUR)" -ForegroundColor White
Write-Host "4. Entre em contato com suporte IfThenPay se necessario" -ForegroundColor White
Write-Host ""

Write-Host "================================================================`n" -ForegroundColor Cyan

