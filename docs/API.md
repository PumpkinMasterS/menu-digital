# APIs e Webhooks

## Autenticação
- Admin: JWT (login com email/password). Header: `Authorization: Bearer <token>`.
- Cliente: sessão anónima por mesa (cookie/sessão com `tableSessionId`).

## Endpoints Públicos (Cliente)
- `GET /v1/restaurants/:slug/menu` — categorias e produtos visíveis.
- `GET /v1/products/:id` — detalhes do produto.
- `POST /v1/orders` — cria pedido a partir do carrinho.
- `GET /v1/orders/:id` — estado do pedido em tempo real (SSE opcional: `/v1/orders/:id/stream`).
- `POST /v1/payments/intents` — cria intent MB Way (phone, amount, orderId).

Payload `POST /v1/orders`
```json
{
  "restaurantSlug": "burger-porto",
  "tableCode": "T12",
  "items": [
    { "productId": "p_123", "qty": 2, "options": [{"name":"Bacon","price":1.0}] }
  ]
}
```

## Endpoints Admin (protegidos)
- `POST /v1/auth/login` — autentica admin.
- `GET /v1/admin/orders` — lista pedidos por estado.
- `PATCH /v1/admin/orders/:id/status` — atualiza estado do pedido.
- `GET /v1/admin/menu` — lista categorias/produtos.
- `POST /v1/admin/categories` — cria categoria.
- `POST /v1/admin/products` — cria produto.
- `PUT /v1/admin/products/:id` — edita produto.
- `DELETE /v1/admin/products/:id` — remove produto.
- `POST /v1/admin/assets` — upload imagem (devolve URL/CDN).
- `GET /v1/admin/tables` — lista mesas; `POST /v1/admin/tables/qrcodes` — gera QR.

### Gestão de Composição (Grupos/Opções/Variações)
- `POST /v1/admin/option-groups` — cria grupo de opções (extras/variações) com `selection` `{ required, min, max, exclusive }`.
- `GET /v1/admin/option-groups` — lista grupos.
- `PUT /v1/admin/option-groups/:id` — atualiza grupo.
- `DELETE /v1/admin/option-groups/:id` — remove grupo (se não estiver em uso).
- `POST /v1/admin/modifiers` — cria opção dentro de um grupo (nome, `priceDelta`, disponibilidade, ordem).
- `PUT /v1/admin/modifiers/:id` — atualiza opção.
- `DELETE /v1/admin/modifiers/:id` — remove opção.
- `POST /v1/admin/variant-groups` — cria grupo de variações reutilizável (ex.: bebidas pequeno/médio/grande).
- `PUT /v1/admin/variant-groups/:id` — atualiza grupo de variações.
- `POST /v1/admin/products/:id/composition` — anexa `optionGroupIds`, `variantGroupIds` e `includedItems` ao produto; define `pricingStrategy`.
- `DELETE /v1/admin/products/:id/composition` — limpa composição do produto.

### Cálculo de Preço e Validação
- `POST /v1/orders/price` — calcula total de um carrinho/pedido, aplicando `pricingStrategy`, `priceDelta` de opções e regras (min/max, required). Útil para validar antes de criar/pagar.

Request exemplo `POST /v1/admin/products/:id/composition`
```json
{
  "pricingStrategy": "combo_fixed_with_modifiers",
  "includedItems": [{ "productId": "p_bigmac", "qty": 1, "allowReplacement": false }],
  "optionGroupIds": ["og_extras_burger"],
  "variantGroupIds": ["vg_drinks"]
}
```

## Webhooks MB Way
- `POST /v1/payments/webhook` — recebe eventos do PSP.
  - Validação de assinatura (HMAC/shared secret).
  - Idempotência por `intentId/reference`.
  - Atualiza `payments.status` e `orders.paymentStatus`.

Webhook exemplo
```json
{
  "provider": "mbway",
  "intentId": "mw_123",
  "orderId": "o_987",
  "status": "paid",
  "amount": 15.0,
  "currency": "EUR",
  "timestamp": "2025-10-01T18:01:00Z"
}
```

## Erros e Códigos
- 400 validação, 401 não autenticado, 403 proibido, 404 não encontrado.
- 409 conflito (idempotência), 429 rate limit, 500 erro servidor.

## Segurança de API
- Rate limit por IP/sessão; proteção contra replay no pagamento.
- Logging de auditoria para ações admin.
- Campos sensíveis nunca expostos (passwordHash, secretos PSP).
 - Idempotência: operações de criação aceitam `Idempotency-Key` no header.

---

## Implementação atual (MVP - v1 Lazy Mongo)

Esta secção documenta os endpoints atualmente implementados no backend (Fastify) com validação Zod, conexão ao MongoDB por requisição, timestamps e soft delete. A autenticação de admin usa cabeçalho `x-admin-token`.

### Ambiente
- `.env` requer: `MONGODB_URI`, `PORT`, `ADMIN_TOKEN`.
- Inicie com `npm run dev` em `backend/`. Health: `GET /health`.

### Autenticação Admin
- Header: `x-admin-token: <ADMIN_TOKEN>`.
- Sem token ou token inválido: `401`.

### Endpoints Públicos
- `GET /v1/public/categories` — lista categorias ativas.
- `GET /v1/public/categories/:id` — detalhe de categoria.
- `GET /v1/public/products` — lista produtos (query opcional `categoryId`).
- `GET /v1/public/products/:id` — detalhe de produto.
- `GET /v1/public/modifiers` — lista grupos de modificadores.
- `GET /v1/public/variants` — lista grupos de variantes.
- `GET /v1/public/products/:id/composition` — composição expandida do produto (grupos e itens).
- `POST /v1/public/orders` — cria pedido, calcula totais.

Payload exemplo `POST /v1/public/orders`
```json
{
  "tableId": "T12",
  "items": [
    {
      "productId": "p_123",
      "quantity": 2,
      "modifiers": [{ "groupId": "g_extras", "modifierId": "m_bacon" }],
      "variants": [{ "groupId": "g_sizes", "variantId": "v_large" }]
    }
  ],
  "notes": "Sem cebola",
  "payment": { "method": "cash" }
}
```

### Endpoints Admin (protegidos por `x-admin-token`)
- Categorias: `GET /v1/admin/categories`, `POST /v1/admin/categories`, `PATCH /v1/admin/categories/:id`, `DELETE /v1/admin/categories/:id`.
- Produtos: `GET /v1/admin/products`, `POST /v1/admin/products`, `PATCH /v1/admin/products/:id`, `DELETE /v1/admin/products/:id`.
- Modificadores: `GET /v1/admin/modifiers`, `POST /v1/admin/modifiers`, `PATCH /v1/admin/modifiers/:id`, `DELETE /v1/admin/modifiers/:id`.
- Variantes: `GET /v1/admin/variants`, `POST /v1/admin/variants`, `PATCH /v1/admin/variants/:id`, `DELETE /v1/admin/variants/:id`.
- Composição de produto:
  - `PUT /v1/admin/products/:id/modifiers` — body `{ groupIds: string[] }`.
  - `PUT /v1/admin/products/:id/variants` — body `{ groupIds: string[] }`.
- Pedidos: `GET /v1/admin/orders`, `GET /v1/admin/orders/:id`, `PATCH /v1/admin/orders/:id`, `DELETE /v1/admin/orders/:id`.

### Observações
- Todas as entidades suportam `isActive` e soft delete.
- Ordem (`order`) pode ser usada para ordenar resultados.
- Validação via Zod em payloads de criação/atualização.