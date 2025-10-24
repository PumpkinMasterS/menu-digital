# Backend Multi-Tenant (Preparação)

Este documento orienta como preparar o backend para suportar múltiplos restaurantes (tenants) sem alterar o comportamento atual.

## Objetivo
- Garantir isolamento de dados por restaurante.
- Permitir escalar para SaaS com subdomínios e chaves específicas.

## Campos `restaurantId`
Adicionar o campo `restaurantId` (string) nas coleções:
- `orders`: `{ id, items, status, restaurantId, createdAt, updatedAt, ... }`
- `payments`: `{ requestId, method, orderId, restaurantId, status, createdAt, updatedAt, ... }`
- `tables`: `{ id, name, status, restaurantId, ... }`
- `users`: `{ id, email, role, restaurantId, ... }`

Nota: a aplicação atual funciona sem esse campo; a inclusão deve ser planeada para não quebrar tipos/uso. Recomenda-se introduzir gradualmente.

## Derivação do tenant
- **Menu (público)**: a partir do host/subdomínio (`req.headers.host`). Ex.: `menu.restauranteX.com` → tenant `restauranteX`.
- **Admin/Kitchen**: do `JWT` (claim `restaurantId`) ou do login inicial.
- **Callback IfThenPay**: opcionalmente incluir `restaurantId` na query ou resolver via tabela de chaves (mapa Anti-Phishing → restaurante).

## Índices recomendados
- `orders`: `{ restaurantId: 1, status: 1, createdAt: -1 }`
- `payments`: `{ restaurantId: 1, requestId: 1, method: 1 }`
- `tables`: `{ restaurantId: 1, id: 1 }`
- `users`: `{ restaurantId: 1, role: 1 }`

Atualizar `src/lib/db.ts` para criar estes índices quando a coleção não tiver (sem necessidade imediata).

## Padrões de consulta
- Todas as queries incluem `restaurantId`:
  - `orders.find({ restaurantId, status })`
  - `payments.findOne({ restaurantId, requestId, method })`
- Atualizações/streams também filtram por `restaurantId`.

## Migração de dados existente
1. Adicionar `restaurantId` com valor padrão (ex.: `default`) em todos os documentos atuais.
2. Criar índices após a migração.
3. Atualizar serviços para sempre exigir `restaurantId` via contexto (host ou token).

## Segurança
- Validar que um token JWT só acede ao `restaurantId` associado.
- Prevenir acesso cruzado com checagens na camada de serviço/rota.

## Observabilidade
- Taggear logs com `restaurantId`.
- Dashboards (admin/kitchen) mostram apenas dados do seu tenant.

## Próximos passos
- Definir a estratégia de derivação (host/subdomínio vs token).
- Mapear fluxos críticos (pedidos/pagamentos/callback) garantindo `restaurantId` em todas as operações.
- Implementar indices e migração quando decidires avançar.