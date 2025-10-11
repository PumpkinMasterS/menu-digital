# Arquitetura e Pipeline

Objetivo: definir o fluxo end-to-end do bot de trading, módulos e responsabilidades.

Pipeline:
Exchanges (Bybit, Binance, Coinbase) → WebSocket/API → Back-end Bot
    │
    ├─ Data Storage
    │    ├─ TimescaleDB/InfluxDB: candles e indicadores
    │    ├─ Redis: cache de ticks e últimos candles
    │    └─ MongoDB Atlas: logs, configs, agregados de sentimento
    │
    ├─ Indicators Engine: cálculo de RSI, EMA(50/200), ATR, MACD, etc.
    ├─ Signal Engine: geração de sinais BUY/SELL/HOLD com base em regras
    └─ Execution Manager: ordens, stops (dinâmicos por ATR), position sizing
    │
    ▼
Frontend Dashboard (React + Next.js): gráficos em tempo real, heatmaps, alertas

Estilo de arquitetura:
- Back-end modular com serviços:
  - Ingestor de mercado (WebSocket/REST)
  - Persistência (candles/indicadores/ticks)
  - Cálculo de indicadores (batch + streaming)
  - Sentimento (coleta, classificação, agregação)
  - Motor de sinais (regra/estado)
  - Gestor de execução (conectores de exchange, ordens, gestão de risco)
  - API/WS Gateway (servir dados ao frontend)
- Pode iniciar como monólito modular e evoluir para microserviços.

Mensageria e escalabilidade:
- Fila/event bus (ex.: Redis Streams / Kafka) opcional para desacoplar ingestão, indicadores, sinais e execução.
- Containers (Docker) e orquestração (Kubernetes) para escalar ingestão e cálculo.

Latência e consistência:
- WebSocket para dados de mercado em tempo real.
- Cálculo incremental (rolling) de indicadores para timeframes 10m e 1h.
- Persistência de candles agregados e indicadores para backtesting e auditoria.

Observabilidade:
- Métricas (Prometheus) e dashboards (Grafana).
- Logs estruturados (MongoDB) e alertas (Slack/Email).

## Stack do Backend (aceito)

- Runtime: Node.js + TypeScript.
- HTTP/WS: Fastify, fastify-websocket (canal de dados em tempo real).
- Validação: Ajv (JSON Schema 2020-12) para validar RuleConfig.md.
- Filas e agendamento: BullMQ + Redis (ingestão, cálculos pós-fechamento, backfill, cooldowns, retries).
- Persistência:
  - TimescaleDB (PostgreSQL) para OHLCV e indicadores.
  - Redis para cache/ticks/últimos candles.
  - MongoDB para RuleConfig versionado, auditoria e logs estruturados.
- Observabilidade: pino (logs), prometheus-client (métricas), OpenTelemetry (tracing futuro).
- Testes: Vitest/Jest e doubles dos conectores de exchange.
- Empacotamento: Docker (Windows via Docker Desktop).

## Timeframes e processamento

- Timeframes suportados: 1m, 3m, 5m, 10m, 15m, 1h, 4h.
- Regras:
  - Processar sinais sempre após fechamento do candle (UTC).
  - Resampling determinístico: 3m de 1m; 10m de 1m/5m; 4h de 1h.
  - Buffers por símbolo/timeframe para cálculo incremental e validação de integridade.

## Design rule-agnostic

- Contrato <mcfile name="RuleConfig.md" path="c:\Projetos\Cripto\docs\RuleConfig.md"></mcfile> valida regras, risco e execução.
- Precedência: política global de risco bloqueia ordens que violem SL/TP/rrMin/drawdown/limites.
- Ciclo: draft → validate → publish, com auditoria e rollback.

## Fase inicial sem autenticação

- Exposição limitada (bind local, CORS restrito, rate-limits fortes, quotas WS, auditoria de acesso).
- Plano de evolução: ativar JWT/OAuth e perfis de acesso quando necessário.

## Backtesting e pesquisa

- Pode ser executado em TypeScript ou separado em Python (pandas/NumPy) para pesquisa quantitativa.
- Integra com timeseries persistidas (TimescaleDB) e segue regras de fechamento/UTC/resampling.

## Glossário de termos e abreviações

- SL (Stop Loss): ordem/nível para limitar perda da posição.
- TP (Take Profit): ordem/nível para realizar lucro da posição.
- ATR (Average True Range): indicador de volatilidade, usado para stops dinâmicos.
- MAE (Maximum Adverse Excursion): pior excursão negativa de um trade.
- MFE (Maximum Favorable Excursion): melhor excursão positiva de um trade.
- R:R (Risk:Reward): razão risco/retorno do trade (ex.: 1:2).
- OCO (One-Cancels-the-Other): conjunto de ordens onde uma cancela a outra (tipicamente SL+TP).
- WS (WebSocket): canal de dados em tempo real (ticks/candles).
- rrMin: razão mínima R:R exigida para permitir execução.
- Kill-switch: mecanismo automático de desligamento por erro/latência/drawdown.
- Cooldown: número de candles que o sistema aguarda antes de emitir novo sinal.
- Resampling determinístico: agregação de candles em bordas fixas do timeframe, sem drift.

## Scheduler / Aggregator

- Buffers separados por símbolo + timeframe (1m/3m/5m/10m/15m/1h/4h).
- Ajv valida RuleConfig antes de qualquer cálculo/ingestão.
- Resampling:
  - 3m gerado de 1m; 10m de 1m/5m; 4h de 1h; sempre em UTC e apenas após fechamento.
- Backfill/retries:
  - Backfill via REST quando detectar gaps; marcar candles imputados.
  - Retries exponenciais para falhas de ingestão/execução.
- Integridade:
  - Validar sequências (sem overlapps/gaps) e volumes/outliers.

## Fila de sinais (BullMQ/Redis)

- Filas por timeframe ou prioridade (ex.: high: 1h/4h, normal: 10m/15m, low: 1m/3m).
- Jobs: geração de sinal, validação de risco, emissão de ordens, audit trail.
- Suporte a backfill e reprocessamento (idempotência por chave símbolo+timeframe+timestamp).
- Retries e backoff configuráveis; DLQ para investigar falhas.

## Observabilidade avançada

- Métricas de latência: WS→persistência, cálculo pós-fechamento por timeframe (1m/3m destacados).
- Drift: diferença entre motor de produção e backtesting (dry-run) por símbolo/timeframe.
- Alertas: atraso de buffers, reconexões WS falhas, gaps de candles, violações de rrMin/drawdown.

## Front-end / Dashboard

- Heatmaps por símbolo/timeframe com seleção dinâmica de indicadores e timeframes.
- Alertas visuais e sonoros para: sinais críticos, SL/TP atingidos, erros de execução e violações de risco.
- Paper-trade/simulação integrada, reproduzindo o pipeline de cálculo de produção (resampling UTC e pós-fechamento) sem enviar ordens reais.
- KPIs e saúde: latência WS→persistência, atraso de buffers por timeframe (1m/3m destacados), drift produção vs backtesting, status de reconexões WS.