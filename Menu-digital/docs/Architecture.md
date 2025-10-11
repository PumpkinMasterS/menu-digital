# Arquitetura Técnica

## Overview
- Frontend: React + Vite (TypeScript), PWA opcional, UI (Tailwind/Chakra), i18n (pt-PT).
- Backend: Node.js (Fastify/Express), TypeScript, JWT, validação (zod/ajv), SSE/WebSocket.
- Base de Dados: MongoDB Atlas com coleções normalizadas e índices.
- Pagamentos: PSP com MB Way (intent + webhook), fila/retry.
- Storage: Bucket S3/GCS/Azure Blob para imagens com CDN.

## Componentes
- Web App Cliente: navegação QR ➜ listagem ➜ produto ➜ carrinho ➜ checkout.
- API Gateway: REST endpoints, autenticação admin, rate limit.
- Worker/Webhooks: processamento assíncrono de pagamentos e atualizações de pedidos.
- Admin Dashboard: SPA protegida, gestão de menu, mesas e relatórios.
- Observabilidade: logs estruturados (JSON), métricas (Prometheus/OpenTelemetry), alertas.

## Comunicações
- Cliente ↔ API: HTTPS, JSON; tempo real via SSE/WebSocket para estado de pedidos.
- API ↔ PSP: HTTPS, assinaturas HMAC/secret, webhooks idempotentes.
- API ↔ MongoDB: driver oficial, índices e transações (quando necessárias).

## Segurança
- JWT para admin com refresh tokens; senhas `bcrypt`.
- CSP, CORS restrito ao domínio do menu, TLS, headers de segurança.
- Validação de input e saída, sanitização de HTML, limites de payload.

## Escalabilidade
- Stateless API, autoscaling horizontal, cache CDN para imagens.
- Sharding/replica set no Atlas conforme crescimento.
- Filas para webhooks e notificações.