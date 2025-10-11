# Supabase Edge Functions

Este diretório contém as Edge Functions do projeto SaborPortuguês.

## Functions Disponíveis

### 1. process-order
Processa novos pedidos e envia notificações.

**Endpoint:** `POST /functions/v1/process-order`

**Payload:**
```json
{
  "orderData": {
    "user_id": "uuid",
    "restaurant_id": "uuid", 
    "items": [
      {
        "meal_id": "uuid",
        "quantity": 2,
        "unit_price": 12.50
      }
    ],
    "delivery_address": "Rua ABC, 123, Lisboa",
    "delivery_fee": 2.50,
    "notes": "Instruções especiais"
  }
}
```

### 2. generate-daily-deliveries
Gera entregas diárias para subscriçoes ativas.

**Endpoint:** `POST /functions/v1/generate-daily-deliveries`

**Uso:** Deve ser executada diariamente via cron job (6:00 AM)

### 3. stripe-webhook
Processa webhooks do Stripe para pagamentos e subscriçoes.

**Endpoint:** `POST /functions/v1/stripe-webhook`

**Headers:**
- `stripe-signature`: Assinatura do webhook Stripe

## Deploy das Functions

1. Instalar Supabase CLI:
```bash
npm install -g supabase
```

2. Login no Supabase:
```bash
supabase login
```

3. Deployar todas as functions:
```bash
supabase functions deploy
```

4. Deployar uma function específica:
```bash
supabase functions deploy process-order
```

## Configurar Variáveis de Ambiente

No painel do Supabase, configure as seguintes secrets:

1. **STRIPE_WEBHOOK_SECRET**: Secret para verificar webhooks do Stripe
2. **RESEND_API_KEY**: API key para envio de emails (futuro)
3. **ONESIGNAL_API_KEY**: API key para push notifications (futuro)

## Configurar Cron Jobs

Para a function `generate-daily-deliveries`, configure um cron job:

```sql
-- Execute no SQL Editor do Supabase
SELECT cron.schedule(
  'generate-daily-deliveries',
  '0 6 * * *', -- Todo dia às 6:00 AM
  'https://your-project.supabase.co/functions/v1/generate-daily-deliveries'
);
```

## Logs e Debugging

Para ver os logs das functions:

```bash
supabase functions logs process-order
```

Para ver logs em tempo real:
```bash
supabase functions logs --follow
```

## Testing Local

Para testar localmente:

1. Iniciar Supabase local:
```bash
supabase start
```

2. Servir functions localmente:
```bash
supabase functions serve
```

3. Testar a function:
```bash
curl -X POST http://localhost:54321/functions/v1/process-order \
  -H "Content-Type: application/json" \
  -d '{"orderData": {...}}'
```

## Webhooks do Stripe

1. No painel do Stripe, adicione o endpoint:
   `https://your-project.supabase.co/functions/v1/stripe-webhook`

2. Configure os eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

3. Copie o webhook secret e adicione como `STRIPE_WEBHOOK_SECRET` nas secrets do Supabase.

## Monitorização

As functions automaticamente logam eventos importantes. Para monitorizar em produção, considere:

1. Configurar alertas no Supabase para function errors
2. Usar Sentry para tracking de erros
3. Configurar métricas customizadas para business events

## Limitações

- Cada function tem timeout de 60 segundos
- Máximo de 10MB por request
- Coldstart pode adicionar latência na primeira execução 