# Fontes de Dados: Exchanges e Candles

Exchanges alvo:
- Bybit (prioritária para candles e testnet)
- Binance, Coinbase (alternativas/expansão)

Bybit – abordagem:
- Mercado spot e/ou perp.
- Obter preços via WebSocket para ticks e via REST para candles OHLCV.
- Timeframes: 1m, 3m, 5m, 10m (agregado), 15m, 1h, etc.
- Símbolos: BTCUSDT (spot/perp), expandir para ETHUSDT, etc.
- Suporte a testnet para execução sem risco.

Candles e agregação:
- Se o timeframe 10m não existir nativo, agregue 1m/5m para construir candles de 10m.
- Normalize timestamps (UTC) e garanta integridade (sem gaps).

Resiliência:
- Reconexão automática do WebSocket.
- Backfill histórico via REST para preencher períodos em falta.
- Rate-limit handling com retries exponenciais.

Validação de dados:
- Checagem de outliers, zero volume e spikes.
- Marcar candles imputados ou parciais.

Estratégia de armazenamento:
- Ticks recentes: Redis (chaves por símbolo).
- Candles e indicadores: TimescaleDB/InfluxDB.
- Metadados e logs: MongoDB.

## Alinhamento de candles e tempo

- Todos os timestamps em UTC; frontend pode exibir em fuso local, mas serviços operam em UTC.
- Alinhamento estrito: cálculos e sinais apenas após fechamento do candle.
- Agregação confiável:
  - 10m via agregação de candles de base (1m/5m) quando não houver nativo.
  - 3m via agregação de 1m.
  - 4h via agregação de 1h.
- Backfill e reconciliação: preencher gaps via REST e marcar candles imputados.

## Regras de resampling

- Usar resampling determinístico (bordas em múltiplos do timeframe) para evitar drift.
- Evitar lookahead e garantir que o último intervalo só é considerado após fechamento.
- Documentar fonte e precisão por exchange/símbolo.