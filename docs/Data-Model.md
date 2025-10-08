# Modelo de Dados — MongoDB Atlas

## Coleções

### restaurants
- Campos: `_id`, `name`, `slug`, `timezone`, `contact`, `address`, `settings`.
- Índices: `slug` único.

### tables
- Campos: `_id`, `restaurantId`, `code`, `label`, `active`, `qrVersion`.
- Índices: `restaurantId + code` único.

### categories
- Campos: `_id`, `restaurantId`, `name`, `slug`, `order`, `visible`.
- Índices: `restaurantId + slug` único.

### products
- Campos: `_id`, `restaurantId`, `categoryId`, `name`, `slug`, `description`, `basePrice`, `currency`, `images[]`, `available`, `composition`.
- Índices: `restaurantId + slug`, `categoryId`.
- `composition`:
  - `pricingStrategy`: `fixed|sum_base_plus_modifiers|combo_fixed_with_modifiers`
  - `includedItems[]`: itens incluídos por defeito (ex.: hambúrguer base)
    - `{ productId, qty, allowReplacement }`
  - `optionGroupIds[]`: referência a grupos de opções/modificadores reutilizáveis
  - `variantGroupIds[]`: referência a grupos de variações (ex.: tamanhos de bebida)

### orders
- Campos: `_id`, `restaurantId`, `tableId`, `sessionId`, `items[]`, `subtotal`, `discounts[]`, `total`, `currency`, `status` (`pending|in_preparation|ready|delivered|cancelled`), `paymentStatus` (`none|pending|paid|failed`), `createdAt`, `updatedAt`.
- Índices: `restaurantId`, `tableId`, `status`, `createdAt`.

### payments
- Campos: `_id`, `orderId`, `provider` (`mbway`), `intentId`, `reference`, `phone`, `amount`, `currency`, `status` (`created|pending|paid|failed|cancelled`), `raw` (payload PSP), `createdAt`, `updatedAt`.
- Índices: `orderId`, `intentId`, `status`.

### users
- Campos: `_id`, `restaurantId`, `email`, `passwordHash`, `roles[]` (`admin|staff`), `active`, `lastLoginAt`.
- Índices: `email` único, `restaurantId`.

### assets
- Campos: `_id`, `restaurantId`, `type` (`image`), `url`, `thumbUrl`, `metadata`, `createdAt`.
- Índices: `restaurantId`.

## Exemplos de Documentos

```json
// product
{
  "_id": "p_menu_bigmac",
  "restaurantId": "r_1",
  "categoryId": "c_menus",
  "name": "Menu Big Mac",
  "slug": "menu-big-mac",
  "description": "Big Mac + Bebida",
  "basePrice": 8.9,
  "currency": "EUR",
  "images": ["https://cdn/.../menu-bigmac.jpg"],
  "available": true,
  "composition": {
    "pricingStrategy": "combo_fixed_with_modifiers",
    "includedItems": [
      { "productId": "p_bigmac", "qty": 1, "allowReplacement": false }
    ],
    "optionGroupIds": ["og_extras_burger"],
    "variantGroupIds": ["vg_drinks"]
  }
}
```

```json
// order
{
  "_id": "o_987",
  "restaurantId": "r_1",
  "tableId": "t_12",
  "sessionId": "s_abc",
  "items": [
    {
      "productId": "p_123",
      "name": "Cheeseburger",
      "price": 6.5,
      "qty": 2,
      "options": [{ "name": "Bacon", "price": 1.0 }]
    }
  ],
  "subtotal": 15.0,
  "discounts": [],
  "total": 15.0,
  "currency": "EUR",
  "status": "pending",
  "paymentStatus": "pending",
  "createdAt": "2025-10-01T18:00:00Z"
}
```

### optionGroups
- Campos: `_id`, `restaurantId`, `type` (`extra|variant`), `name`, `description`, `selection`.
- `selection`: `{ required: boolean, min: number, max: number, exclusive: boolean }`
- Índices: `restaurantId`.

### modifiers (opções)
- Campos: `_id`, `restaurantId`, `groupId`, `name`, `description`, `priceDelta`, `image`, `available`, `order`.
- Índices: `groupId`, `restaurantId`.

### variantGroups
- Campos: `_id`, `restaurantId`, `name`, `selection` (como optionGroups), `variants[]`.
- `variants[]`: `{ name, priceDelta, sku?, available }`

## Considerações de Índices
- Pesquisa por `restaurantId` e `visible/available` no catálogo.
- Listagem de pedidos por mesa e estado.
- Unicidade em slugs e códigos de mesa.

## Migrações
- Scripts de seed para categorias/produtos exemplo e criação de índices.
 - Seeds para `optionGroups`, `modifiers` e `variantGroups` reutilizáveis (ex.: bebidas).