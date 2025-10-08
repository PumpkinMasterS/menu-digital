# Dashboard Admin — Requisitos

## Autenticação
- Login com email e password (JWT + refresh).
- Perfis: `admin` (total) e `staff` (pedidos/mesas).

## Páginas
- Login e recuperação de password.
- Produtos: listagem, criação, edição, remoção; upload de imagens.
- Categorias: ordenação, visibilidade, destaque (hero).
- Pedidos: board em tempo real por estado (kanban: pending → in_preparation → ready → delivered).
- Mesas & QR: gestão de mesas, geração e download de QR codes.
- Relatórios: vendas, produtos mais vendidos, tempos médios.
- Configurações: horários, disponibilidade, moedas, impostos.

## UX/Funcionalidades
- Pesquisa e filtros; paginação; feedback de sucesso/erro.
- Uploader com compressão/resize e preview; arrastar-para-ordenar.
- Notificações de novos pedidos (som/banner).
- Confirmação de ações destrutivas; histórico/auditoria.

## Segurança
- RLS por `restaurantId`; logs de auditoria; CSRF para ações sensíveis.
- Senhas seguras; 2FA opcional; bloqueio após tentativas falhadas.