# Deploy e Monitorização

Objetivo
- Estabelecer práticas de deploy, monitorização e resposta a incidentes.

Ambiente inicial (sem autenticação no gateway)
- Bind local por padrão (0.0.0.0 somente quando em ambiente controlado).
- CORS restrito (origens explícitas) e headers mínimos.
- Rate-limit por IP/rota, quotas de WS, e logs de acesso/auditoria.

Infra e containers
- Docker: serviços (api, ingestor, workers, dbs) em compose; variáveis de ambiente seguras.
- Observabilidade: Prometheus + Grafana; logs estruturados (pino) exportados.
- Alertas: Slack/Email para erros, latência, drawdown e estado do kill-switch.

Estratégia de atualização
- Blue/Green ou Rolling: zero-downtime para API/WS e workers.
- Migrações de DB versionadas (Timescale/Postgres e Mongo).
- Feature flags para ativar autenticação e regras novas.

SLOs e métricas chave
- Latência p95 de ingestão WS→persistência: < 300ms.
- Tempo de cálculo pós-fechamento (1m/3m): p95 < 500ms.
- Falhas de execução (ordens rejeitadas) < 0,5% por dia.
- Drift entre backtesting e produção (dry-run) dentro da tolerância definida.

Resposta a incidentes
- Kill-switch automático por burst de erros/latência.
- Runbooks para: falha de exchange, degradação de latência, gaps de dados, divergência de PnL.
- Pós-mortem com ação corretiva e registro em auditoria.

## Checklist de pré-produção

Antes de ativar o ambiente, validar:

- Integração ponta a ponta: WS → backend → DB → dashboard em tempo real.
- Consistência de timeframes (1m, 3m, 5m, 10m, 15m, 1h, 4h) em tabelas, buffers e cálculos.
- Limites de rate (REST/WS) e cooldowns conforme definições do RuleConfig.
- Resampling determinístico ativo: 3m de 1m; 10m de 1m/5m; 4h de 1h (UTC, pós-fechamento).
- Backfill configurado para gaps de candles e marcação de candles imputados.
- Alertas configurados (buffers atrasados, reconexões WS, gaps, drift).
- Kill-switch habilitado e testado em modo dry-run e produção controlada.
- Validação por símbolo (stepSize, lotSize, minNotional/qty) antes de enviar ordens.

## Docker Compose inicial (stack mínima)

- TimescaleDB (PostgreSQL) com volumes persistentes para OHLCV/indicadores.
- Redis para cache e filas (BullMQ) com volume persistente opcional.
- MongoDB para RuleConfig versionado e auditoria (audit log).
- Backend (Node.js/TypeScript) com métricas Prometheus e logs estruturados.
- Dashboard (React/Next.js) servindo gráficos, heatmaps e alertas.

Notas:
- Scripts de inicialização devem criar bancos, extensões (TimescaleDB) e índices.
- Variáveis de ambiente separadas por ambiente (dev/stg/prod) e secrets fora do repo.

## Kubernetes futuro (evolução)

- Horizontal scaling do scheduler/worker por símbolo/timeframe.
- Autoscaling baseado em lag de filas, latência de cálculo e volume de símbolos.
- StatefulSets para DBs; operadores para backup/restore.

## Rotinas automáticas de integridade

- Verificação contínua do buffer WS: atraso máximo por timeframe e reconexão assistida.
- Monitor de latência WS→persistência e cálculo pós-fechamento (SLOs por timeframe).
- Detector de gaps de candles com backfill automático e anotação de imputação.
- Métrica de drift entre produção e backtesting (dry-run) por símbolo/timeframe.

## Fluxo de dados (resumo)

Entrada de candles (WS/REST) → buffers por símbolo/timeframe → resampling determinístico → cálculo de indicadores → geração/validação de sinal → execução de ordens → persistência/auditoria → dashboard/alertas.

Mapeamentos de resampling: 1m → 3m; 1m/5m → 10m; 1h → 4h (UTC, somente após fechamento).