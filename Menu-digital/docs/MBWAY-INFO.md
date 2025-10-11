# 💳 MB Way - Informação Completa

## ⚠️ Status Atual: NÃO IMPLEMENTADO

O MB Way **não está implementado neste projeto**. É uma funcionalidade futura que requer integração com um Payment Service Provider (PSP).

## Por Enquanto: Sistema Funciona Sem Pagamento Online

O sistema está **100% funcional** para:
- ✅ Fazer pedidos
- ✅ Gerir cozinha
- ✅ Administrar produtos
- ✅ Gerar QR codes
- ✅ Acompanhar status

**Método de pagamento atual**: Dinheiro/cartão no local (presencial)

## 🏦 O Que Precisa Para Implementar MB Way

### 1. Escolher um PSP (Payment Service Provider)

#### Opções em Portugal:

**A. SIBS (Oficial MB Way)**
- Website: https://www.sibs.com
- Requer: Empresa portuguesa, NIF, conta bancária
- API: MB Way Direct
- Custo: Taxa por transação (~2-3%)
- Tempo: 2-4 semanas para aprovação

**B. Easypay**
- Website: https://www.easypay.pt
- Mais fácil de integrar
- Suporta MB Way, Multibanco, cartões
- API moderna (REST)
- Custo: A partir de 2.5% por transação
- Tempo: 1-2 semanas

**C. EUPAGO**
- Website: https://eupago.pt
- Fácil para pequenos negócios
- MB Way + outros métodos
- Custo: ~2.9% por transação
- Sandbox disponível

**D. Stripe (limitado)**
- Não suporta MB Way diretamente
- Pode usar para cartões internacionais
- Mais usado fora de Portugal

### 2. Documentos Necessários

Para se registar num PSP:

- 📄 NIF da empresa
- 📄 Certidão permanente da empresa
- 📄 IBAN de conta bancária portuguesa
- 📄 Documento de identificação do responsável
- 📄 Comprovativo de morada da empresa
- 📄 Última declaração de IVA (se aplicável)

### 3. Processo de Integração

#### Passo 1: Registo no PSP
1. Criar conta no website do PSP
2. Submeter documentos
3. Aguardar aprovação (1-4 semanas)
4. Receber API keys

#### Passo 2: Testar em Sandbox
```bash
# Exemplo com Easypay Sandbox
EASYPAY_API_KEY=sandbox_key_xxx
EASYPAY_ACCOUNT_ID=sandbox_account_xxx
```

#### Passo 3: Implementar no Backend

**Exemplo de fluxo MB Way:**

```typescript
// 1. Cliente pede pagamento
POST /v1/payments/mbway
{
  "orderId": "order_123",
  "phone": "912345678",  // Número MB Way
  "amount": 15.50
}

// 2. PSP envia push para telemovel do cliente

// 3. Cliente aprova no app MB Way

// 4. PSP notifica via webhook
POST /v1/payments/webhook
{
  "status": "paid",
  "orderId": "order_123",
  "transactionId": "mb_xxx"
}

// 5. Sistema atualiza pedido para "paid"
```

### 4. Custos Típicos

| PSP | Taxa Setup | Taxa Transação | Taxa Mensal |
|-----|------------|----------------|-------------|
| SIBS | €200-500 | 2-3% | €30-50 |
| Easypay | €0 | 2.5-2.9% | €0-30 |
| EUPAGO | €0 | 2.9% | €0 |

**Exemplo de custo:**
- Pedido de €20
- Taxa 2.5% = €0.50
- Você recebe: €19.50

## 🔐 Segurança MB Way

### O Que o PSP Garante:
- ✅ Certificação PCI-DSS
- ✅ Encriptação de dados
- ✅ Tokenização de números
- ✅ Proteção contra fraude
- ✅ Conformidade RGPD

### O Que Você Precisa:
- ✅ HTTPS obrigatório (SSL/TLS)
- ✅ Validar webhooks com HMAC
- ✅ Não guardar dados de cartão
- ✅ Logs de transações
- ✅ Política de privacidade

## 📝 Implementação Futura

### Backend - O Que Falta Fazer:

1. **Criar rotas de pagamento:**
```typescript
// backend/src/routes/v1/payments.ts
POST /v1/payments/mbway/create
POST /v1/payments/webhook
GET /v1/payments/:id/status
```

2. **Integrar SDK do PSP:**
```bash
npm install @easypay/sdk  # ou outro
```

3. **Configurar webhooks:**
```typescript
// Validar assinatura HMAC
const signature = req.headers['x-webhook-signature'];
const valid = validateSignature(body, signature, SECRET);
```

4. **Atualizar ordem:**
```typescript
await updateOrder(orderId, { 
  paymentStatus: 'paid',
  transactionId: 'mb_xxx' 
});
```

### Frontend - O Que Falta Fazer:

1. **Página de pagamento:**
```typescript
// apps/menu/src/pages/Payment.tsx
- Input para número de telemóvel
- Botão "Pagar com MB Way"
- Spinner "Aguardando aprovação..."
- Confirmação de pagamento
```

2. **Status de pagamento:**
```typescript
// Polling ou WebSocket
const [status, setStatus] = useState('pending');
// pending → processing → paid/failed
```

## 🧪 Testar Sem PSP Real

Pode simular pagamentos para testar:

```typescript
// backend/src/routes/v1/payments_mock.ts
app.post('/v1/payments/mock/approve/:orderId', async (req, reply) => {
  const { orderId } = req.params;
  await updateOrder(orderId, { paymentStatus: 'paid' });
  return { success: true };
});
```

## ⏱️ Timeline Realista

| Fase | Tempo |
|------|-------|
| Registo no PSP | 1-4 semanas |
| Aprovação e API keys | Imediato após aprovação |
| Desenvolvimento | 1-2 semanas |
| Testes em sandbox | 1 semana |
| Testes em produção | 1 semana |
| **Total** | **4-8 semanas** |

## 💡 Recomendação

1. **Agora**: Use o sistema sem pagamento online
2. **Curto prazo** (1-2 meses): Registe-se no Easypay ou EUPAGO
3. **Médio prazo** (2-3 meses): Implemente MB Way
4. **Longo prazo**: Adicione outros métodos (Multibanco, cartões)

## 🆘 Alternativas Imediatas

**Enquanto não tem MB Way:**

1. **Pagamento no local** (atual)
   - Cliente paga quando recebe
   - Simples e funcional
   - Sem custos de transação

2. **MB Way manual**
   - Cliente faz transferência MB Way
   - Para o número da casa
   - Você confirma manualmente

3. **Referência Multibanco**
   - Gerar via PSP
   - Cliente paga no multibanco
   - Webhook confirma pagamento

## 📞 Contactos Úteis

- **Easypay**: suporte@easypay.pt | +351 210 430 497
- **EUPAGO**: suporte@eupago.pt | +351 300 600 110
- **SIBS**: comercial@sibs.com | +351 217 111 000

## 🎯 Conclusão

**O sistema está pronto para usar AGORA sem MB Way.**

Quando quiser adicionar pagamentos online:
1. Registe-se num PSP (recomendo Easypay)
2. Aguarde aprovação
3. Implemente as rotas (1-2 semanas de dev)
4. Teste em sandbox
5. Active em produção

**Custo total**: ~2.5% por transação + possível mensalidade

**Vale a pena?** Depende do volume:
- 100 pedidos/mês × €15 = €1500 × 2.5% = €37.50 em taxas
- 500 pedidos/mês × €15 = €7500 × 2.5% = €187.50 em taxas

