# PRD — Menu Digital para Hamburgueria (Portugal)

## Visão Geral
- Menu digital acessível via QR code por mesa, com destaque de produtos e possibilidade de pagamento por MB Way.
- Público-alvo: clientes em sala, staff de atendimento/cozinha e administrador.
- Inspiração visual: listagem de produtos semelhante a `burger-ranch.ola.click/products` com hero destacado.

## Objetivos
- Reduzir tempo de espera e fricção no pedido.
- Aumentar o ticket médio com destaques, extras e combos.
- Simplificar gestão de menu e disponibilidade em tempo real.
- Permitir pagamentos rápidos via MB Way com reconciliação automática.

## Personas
- Cliente: consulta menu, adiciona itens, faz pedido e paga.
- Staff: vê pedidos, atualiza estado (em preparação, pronto, entregue).
- Admin: gere categorias, produtos, imagens, preços, disponibilidade, mesas e QR codes.

## Casos de Uso Principais
- Consultar menu por QR (mesa identifica-se automaticamente).
- Filtrar por categoria, ver detalhes e extras.
- Adicionar ao carrinho, rever, submeter pedido.
- Realizar pagamento MB Way (pay-by-request/push), acompanhar estado.
- Receber confirmação e número do pedido.
- Admin CRUD de menu, upload de imagens, ordenação e destaque (hero).
- Admin gestão de mesas/QR, estados de pedidos e relatórios.

## Requisitos Funcionais
- RF1: Página de produtos com hero, categorias e busca.
- RF2: Página de produto com variações e extras opcionais.
- RF3: Carrinho persistente por sessão/mesa.
- RF4: Criação de pedido (sem/como pagamento imediato).
- RF5: Integração MB Way com webhooks de confirmação/erro.
- RF6: Dashboard admin com login (email + password), CRUD completo.
- RF7: Gestão de disponibilidade/stock e horários.
- RF8: Upload e otimização de imagens (CDN/bucket).
- RF9: Geração/gestão de QR codes por mesa.
- RF10: Painel de pedidos em tempo real (WebSocket/SSE).
 - RF11: Composição de produtos estilo marketplace (Glovo/UberEats):
   - Grupos de opções (extras) com regras de seleção `required/min/max/exclusive`.
   - Grupos de variações (tamanhos, sabores) reutilizáveis.
   - Menus/combos com itens incluídos e estratégia de preço `combo_fixed_with_modifiers`.
   - Validação de carrinho/checkout contra regras dos grupos.

## Requisitos Não Funcionais
- RNF1: Performance (LCP < 2.5s em 4G), PWA offline básico.
- RNF2: Segurança (CSP, HTTPS, TLS 1.2+, JWT, senhas com bcrypt).
- RNF3: Escalabilidade (multi-restaurante opcional, fila de webhooks).
- RNF4: Observabilidade (logs estruturados, métricas, alertas).
- RNF5: RGPD (minimizar dados pessoais; retenção e consentimento).

## Fluxos
- QR ➜ Menu: `https://menu.digital/{restaurante}/{mesa}`; server valida mesa e cria sessão.
- Pedido: cliente monta carrinho ➜ POST `/orders` ➜ estado `pending`.
- Pagamento MB Way: POST `/payments/intents` ➜ PSP push ➜ webhook `/payments/webhook` ➜ atualiza `paid`.
- Admin: login ➜ CRUD categorias/produtos ➜ publicar menu.

## MVP
- Listagem produtos + carrinho + criação de pedido.
- Integração MB Way básica (intent + webhook) e painel de pedidos.
- Dashboard admin com CRUD essencial e upload de imagens.

## Roadmap Futuro
- Programa fidelização, cupões, combos dinâmicos.
- Multi-idioma, multilojas, reserva de mesas.
- Integração POS/cozinha e impressão.

## KPIs
- Conversão pedido, taxa de pagamento MB Way, tempo médio de preparação.
- Ticket médio, itens por pedido, pedidos por hora/mesa.