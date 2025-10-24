# Guia de Produção e Deploy — Menu Digital

Este guia consolida links públicos, endpoints MB WAY, variáveis e o fluxo de deploy via GitHub para Vercel e Railway.

## Links Públicos (Domínio)
- Menu: https://www.menu-online.site/menu/
- Admin: https://www.menu-online.site/admin/
- Cozinha/Pedidos: https://www.menu-online.site/kitchen/

Todos os links respondem com `200 OK` e são servidos pelo Vercel.

## API MB WAY (Produção)
- Criar pagamento: `POST https://www.menu-online.site/v1/public/payments/mbway`
  - Body JSON: `{ "orderId": "...", "amount": 1.20, "phoneNumber": "962751338", "customerEmail": "dev@menu-online.site" }`
- Status do pagamento: `GET https://www.menu-online.site/v1/public/payments/{orderId}/status`

### Callback MB WAY (IfThenPay)
- Endpoint: `GET https://www.menu-online.site/v1/public/payments/ifthenpay/callback`
- Query params obrigatórios:
  - `Key` — Anti‑Phishing (deve coincidir com backend)
  - `RequestId` — devolvido na criação do MB WAY
  - `Estado` — sucesso quando `000`, `PAGO` ou `PAID`
- Exemplo:
```
https://www.menu-online.site/v1/public/payments/ifthenpay/callback?Key=APk9%23vB7tL2xQ%21sR&RequestId={RID}&Estado=000
```

## Variáveis de Ambiente Essenciais
- `IFTHENPAY_ANTI_PHISHING_KEY` — chave anti‑phishing (Railway)
- `IFTHENPAY_API_KEY_MBWAY` — chave MB WAY (Railway)
- `IFTHENPAY_MBWAY_ALIAS` (se aplicável)
- Outras: credenciais MongoDB, host/base URLs conforme backend
## Fluxo de Deploy (GitHub → Vercel + Railway)
1. Commit e push para o ramo `master` no GitHub (`origin`).
2. Vercel (ligado ao repositório) detecta a alteração e publica o frontend estático e as rotas públicas.
3. Railway aplica build/deploy do backend Node, mantendo variáveis e banco.
4. Confirmação pós‑deploy:
   - Abrir `/menu`, `/admin`, `/kitchen` e verificar `200 OK`.
   - Testar `POST /v1/public/payments/mbway` e `GET /status`.
   - Acionar callback para validar transição `pending → completed`.

## Testes Rápidos
- Criar MB WAY:
```
POST /v1/public/payments/mbway
{
  "orderId": "PROD-MBWAY-<timestamp>",
  "amount": 1.20,
  "phoneNumber": "962751338",
  "customerEmail": "dev@menu-online.site"
}
```
- Status: `GET /v1/public/payments/PROD-MBWAY-<timestamp>/status`
- Callback: `GET /v1/public/payments/ifthenpay/callback?Key=<KEY>&RequestId=<RID>&Estado=000`

## Manutenção e Troubleshooting
- `403` no callback: verificar `IFTHENPAY_ANTI_PHISHING_KEY`.
- `pending` que não muda: confirmar `Estado` e `RequestId` corretos.
- Redirect do domínio apex: usar sempre `https://www.menu-online.site/...`.
- Logs de backend (Railway) para erros de BD ou rotas.

## Histórico
- Documentos anteriores foram arquivados em `docs/archived/` para referência.
