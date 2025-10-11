# Plano de Implementação (Sprint 1)

- Objetivo: subir backend mínimo viável em produção (dev=prod) focando RuleConfig + scheduler 1m/3m e métricas.
- Ordem lógica e prática comum:
  1) Validação Ajv do RuleConfig e endpoint /rules/publish (fail-closed, audit log)
  2) Servidor Fastify + /metrics + /healthz (Prometheus)
  3) Scheduler 1m: buffers por símbolo, ingestão WS, backfill REST
  4) Resampling determinístico para 3m e métricas de latência pós-fechamento
  5) Fila de sinais (BullMQ) com idempotency key e DLQ
  6) Persistência TimescaleDB para OHLCV/indicadores
  7) Painéis básicos (Grafana) com SLOs iniciais

- Ambiente: único (produção) com variáveis e segredos alinhados; paper-trade isolado por config.
- Entregáveis: binário TS, Compose para serviços, documentação atualizada.