# Kitchen Dashboard (Loja/Cozinha)

Este documento descreve requisitos e UX para o painel de cozinha onde a equipa acompanha, aceita e prepara pedidos — inspirado em práticas de plataformas como Uber Eats, Glovo, Bolt Food e Olaclick.

## Objetivos
- Mostrar pedidos em tempo real com estados e SLAs de preparação.
- Minimizar cliques e decisões: fluxo claro de aceitar → preparar → pronto → entregue.
- Suporte a som de alerta, filtros por estado e pesquisa por mesa/código.
- Escalar para múltiplas estações e dispositivos (tablet, desktop) com sincronização.

## Estados de Pedido (workflow)
- `pending` (novo) → `accepted` (aceito) → `in_progress` (a preparar) → `ready` (pronto) → `delivered` (entregue)
- `cancelled` (cancelado) via admin.
- Transições rápidas com botões visíveis por estado.

## Layout e UX
- Layout por colunas (“kanban”) ou filas por estado: Pending, In Progress, Ready.
- Cartões de pedido com: número/mesa, tempo desde criação (timer), itens (com variantes/modificadores), observações, método de pagamento/estado.
- Ações principais no cartão: Aceitar, Iniciar preparação, Marcar pronto, Entregar/Despachar, Cancelar.
- Alertas sonoros e visuais em novos pedidos e SLA a expirar.
- Filtros por estado e busca rápida; paginação/infinitescroll para históricos.
- Modo compacto para alto volume; modo detalhado para conferência.

## Funcionalidades
- Atualização em tempo real: polling 5–10s inicialmente; futuramente SSE/WebSocket (toggle SSE disponível como stub em modo demo).
- Agrupamento e impressão: enviar itens/etiquetas por estação (ex.: bebidas vs. grelha).
- Controlo de stock: marcar itens indisponíveis e comunicar ao cliente/admin.
- Busy-mode: sinalizar tempos mais longos; integração com app admin para limites.
- Vários dispositivos: conflitos resolvidos por última ação, com logs de auditoria.

## Integrações e Segurança
- Autorização via `x-admin-token` (MVP); migração para JWT por utilizador/staff.
- Endpoints usados:
  - `GET /v1/admin/orders?page=&limit=&status=&...`
  - `PATCH /v1/admin/orders/:id` body `{ status: 'accepted'|'in_progress'|'ready'|'delivered'|'cancelled' }`
  - Futuro: `SSE /v1/admin/orders/stream` para push (em desenvolvimento, o frontend simula eventos quando o toggle SSE está ativo e o modo demo ligado).

## Desenvolvimento — Proxy & .env
- Frontend usa proxy Vite para `/v1` ➜ `http://localhost:3000`.
- Variáveis `.env` no frontend:
  - `VITE_API_URL` (opcional): define base da API. Em dev, deixe vazio para usar proxy.
  - `VITE_USE_SSE` (opcional): ativa o toggle SSE (stub) para simulação em modo demo.

## Performance
- Índices MongoDB recomendados para `orders`: `status`, `createdAt`, e composto `status+createdAt` para acelerar listagens e ordenações.
- UI com filtros (texto, estado, intervalo de tempo) e paginação simples.

## Métricas e Observabilidade
- Tempo médio por estado, tempo total de preparação, SLA misses.
- Volume por faixa horária e por estação.
- Logs de ações (quem, quando, o quê) e motivos de cancelamento.

## Roadmap
1. MVP com polling, listagem, ações de estado e alertas.
2. SSE/WebSocket, múltiplas estações e impressão.
3. Perfis staff, auditoria completa e relatórios.
4. Otimizações de UX para alto volume e acessibilidade.

## Referências
- Uber Eats — Order Management overview.
- Uber Eats Orders App — operações no tablet.
- Uber Eats — OMS explicação e ciclo completo.