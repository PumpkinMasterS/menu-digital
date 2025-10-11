# 🚀 Guia de Integração Bybit - Sistema de Pagamentos em Criptomoedas

## 📋 Visão Geral

Este guia explica como configurar e utilizar o sistema de pagamentos integrado com a Bybit para depósitos e saques em criptomoedas.

## 🔧 Configuração da API Bybit

### 1. Criar Conta na Bybit
1. Acesse: https://www.bybit.com/
2. Clique em "Sign Up" e crie uma conta
3. Complete o KYC (verificação de identidade)

### 2. Obter Chaves de API
1. Acesse: https://www.bybit.com/user/api-management
2. Clique em "Create New Key"
3. Configure as permissões:
   - ✅ Wallet: Leitura e transferência
   - ✅ Trade: Leitura (opcional)
   - ❌ Derivatives: Desativar
4. **Anote a API Key** e **API Secret**

### 3. Configurar no Projeto
Edite o arquivo `.env` no backend:

```bash
BYBIT_API_KEY=your_actual_api_key_here
BYBIT_API_SECRET=your_actual_api_secret_here
BYBIT_BASE_URL=https://api.bybit.com
```

## 🚀 Endpoints Implementados

### 1. Obter Endereço de Depósito
**POST** `/api/payments/deposit/address`
```json
{
  "currency": "BTC"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "address": "bc1q...",
    "currency": "BTC",
    "network": "Bitcoin"
  }
}
```

### 2. Criar Depósito
**POST** `/api/payments/deposit`
```json
{
  "amount": 0.1,
  "currency": "BTC",
  "address": "bc1q..."
}
```

### 3. Solicitar Saque
**POST** `/api/payments/withdrawal`
```json
{
  "amount": 0.05,
  "address": "bc1qdestination...",
  "currency": "BTC"
}
```

### 4. Histórico de Transações
**GET** `/api/payments/transactions?page=1&limit=10`

### 5. Detalhes da Transação
**GET** `/api/payments/transactions/:id`

## 💰 Criptomoedas Suportadas

- **BTC** - Bitcoin
- **ETH** - Ethereum  
- **USDT** - Tether (ERC20, TRC20)
- **BNB** - Binance Coin
- **SOL** - Solana
- **XRP** - Ripple
- **ADA** - Cardano
- **DOT** - Polkadot

## 🔒 Segurança

- Todas as rotas requerem autenticação JWT
- Validação de saldo antes de saques
- Verificação de propriedade das transações
- Logs detalhados para auditoria

## 🚨 Webhook de Confirmações

### Configurar Webhook na Bybit
1. Acesse: https://www.bybit.com/user/api-management
2. Configure o webhook para: `https://seusite.com/api/payments/webhook/bybit`
3. Events: `deposit.success`, `withdrawal.success`

### Estrutura do Webhook
```json
{
  "event": "deposit.success",
  "data": {
    "txid": "abc123",
    "currency": "BTC",
    "amount": 0.1,
    "address": "bc1q...",
    "status": "completed"
  }
}
```

## 🧪 Testes

### Testes com Sandbox
1. Use a sandbox da Bybit: `https://api-testnet.bybit.com`
2. Obtenha API keys de teste
3. Teste com valores pequenos

### Comandos de Teste
```bash
# Testar depósito
curl -X POST http://localhost:5000/api/payments/deposit/address \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"BTC"}'

# Testar saque  
curl -X POST http://localhost:5000/api/payments/withdrawal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":0.01,"address":"bc1qtest...","currency":"BTC"}'
```

## ⚠️ Considerações Importantes

### Taxas
- **Depósito**: Gratuito na Bybit
- **Saque**: Variam por rede (consultar site da Bybit)
- **Rede**: Escolher rede correta para evitar perdas

### Tempos de Processamento
- **Depósito**: 1-3 confirmações na blockchain
- **Saque**: 5-30 minutos (depende da rede)

### Limites
- Verificar limites na conta Bybit
- Implementar limites personalizados no sistema

## 🔧 Solução de Problemas

### Erro: "Invalid API Key"
- Verificar se as chaves estão corretas no `.env`
- Confirmar permissões da API Key

### Erro: "Insufficient Balance"
- Verificar saldo na conta Bybit
- Confirmar rede da criptomoeda

### Erro: "Network congestion"
- Aguardar confirmações na blockchain
- Verificar status na explorer da moeda

## 📞 Suporte

- **Bybit Support**: https://www.bybit.com/help-center/
- **Documentação API**: https://bybit-exchange.github.io/docs/
- **Status Network**: https://status.bybit.com/

---

**⚠️ AVISO**: Sempre testar com valores pequenos antes de operações em produção. Criptomoedas envolvem riscos - operar com cautela.