# Checklist de Validação — Projeto Único (Produção)

Este checklist garante que o projeto único (menu + backend) está pronto e validado em produção, incluindo o callback IfThenPay.

## Preparação
- Repositório ligado ao Vercel (root do projeto).
- Variáveis de ambiente do backend definidas:
  - `MONGODB_URI`, `JWT_SECRET`, `IFTHENPAY_ANTI_PHISHING_KEY`.
- Variáveis do menu definidas:
  - `VITE_API_URL` → domínio público do backend.
- Domínio mapeado (ex.: `menu.seurestaurante.com`).
- Rewrite ativo: `/v1/public/payments/ifthenpay/callback` → `/api/ifthenpay-callback`.

## Deploy e Build
- Build sem erros no Vercel (production).
- Logs de build revisados (sem warnings críticos).

## Callback — Healthcheck
- Aceder: `https://<domínio>/v1/public/payments/ifthenpay/callback?healthcheck=1`.
  - Esperado: `ok`.

## Callback — Anti-Phishing Key
- Chave incorreta: `.../callback?Key=INCORRETA`.
  - Esperado: `401 Unauthorized`.
- Falta `RequestId` com Key correta: `.../callback?Key=<IFTHENPAY_ANTI_PHISHING_KEY>`.
  - Esperado: `400 Missing RequestId`.

## Callback — Fluxo Pago (`Estado=000`)
1. Inserir dados de teste (se necessário): `node backend/scripts/create_test_payment.js`.
   - Cria `Order.id=ORD123` e `Payment.requestId=REQ123`.
2. Abrir um **share link de bypass** do Vercel no browser (para definir cookie de bypass).
3. Executar o callback completo:
   - `https://<domínio>/v1/public/payments/ifthenpay/callback?Key=<IFTHENPAY_ANTI_PHISHING_KEY>&RequestId=REQ123&Estado=000`.
4. Verificar Atlas (MongoDB):
   - `payments.status` → `paid` e ligação ao `orderId` correta.
   - `orders.paymentStatus` → `paid`.
5. Confirmar logs no Vercel (função `api/ifthenpay-callback`).

## Cenários adicionais
- `RequestId` inexistente: 
  - Esperado: `404 Not Found` (não encontra pagamento/ordem).
- `Estado` diferente de `000`:
  - Esperado: não marca como pago; resposta `400` ou `200` com no-op conforme implementação.

## Observabilidade e Segurança
- `LOG_LEVEL=info` (ou `debug` para testes) no backend.
- Segurança de headers confirmada (definida em `vercel.json`).
- Para testes automatizados em rotas protegidas, usar **Protection Bypass Token** (header `x-vercel-protection-bypass`).

## Critérios de aprovação (Sign-off)
- Healthcheck retorna `ok`.
- Anti-phishing valida corretamente (`401` com Key errada; `400` sem `RequestId`).
- Fluxo `Estado=000` atualiza `payments` e `orders` para `paid`.
- Logs no Vercel sem erros; sem `504` após cookie de bypass.
- Domínio e rewrite verificados e funcionais.