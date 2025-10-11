# API e WebSocket do Dashboard

Fase inicial (sem autenticação):
- A API e o WS estarão acessíveis apenas na rede local (bind 127.0.0.1) ou em porta protegida por firewall.
- Mitigações: rate-limits por IP, CORS restrito, desabilitar endpoints perigosos (por ex., execuções manuais fora da testnet).
- Logs e auditoria habilitados desde o início.

Plano de autenticação futura:
- Token-based (JWT) com refresh, roles (viewer/editor/admin) e permissões por recurso.
- Proteção CSRF para endpoints de escrita.
- Suporte a API keys limitadas para integrações e alertas.

Endpoints REST (propostos):
- GET /health: status dos serviços
- GET /metrics: métricas de operação e risco
- GET /positions: posições atuais
- GET /orders: ordens recentes
- GET /signals: sinais e histórico
- POST /rules: publicar nova versão de RuleConfig (fase futura)
- GET /config: obter configuração atual (sem segredos)

WebSocket:
- Canal /ws para streaming de: candles, sinais, ordens/fills, métricas e alertas.
- Formato JSON, mensagens versionadas (v1), com envelope { type, ts, payload }.
- Backpressure: buffers e limites por subscrição.

Quotas e proteção:
- Rate-limit: por IP, por rota, com bucket de 1s/1min.
- Limite de conexões simultâneas no WS.
- Logs de acesso e auditoria de mudanças de configuração.

## Parâmetros comuns

- timeframe: valores aceitos [1m, 3m, 5m, 10m, 15m, 1h, 4h].
- symbol: ex. BTCUSDT, ETHUSDT.
- limit: paginação de resultados (default 100, máx 1000).
- from/to: intervalos em UTC (ISO 8601), aplicável a consultas históricas.