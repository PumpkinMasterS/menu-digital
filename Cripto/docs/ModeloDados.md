# Modelos de Dados

TimescaleDB (candles e indicadores):
- Tabela candles:
  - symbol (TEXT)
  - timeframe (TEXT)
  - ts (TIMESTAMPTZ, início do candle)
  - open (NUMERIC)
  - high (NUMERIC)
  - low (NUMERIC)
  - close (NUMERIC)
  - volume (NUMERIC)
  - PRIMARY KEY (symbol, timeframe, ts)
  - Hypertable por ts; índices por (symbol, timeframe, ts).
- Tabela indicators:
  - symbol, timeframe, ts
  - rsi_short, rsi_medium
  - ema_50, ema_200
  - atr
  - macd, macd_signal, macd_hist (opcional)
  - UNIQUE (symbol, timeframe, ts)

Redis (cache):
- Chaves:
  - tick:{symbol} → último preço/ts
  - candles:{symbol}:{timeframe} → lista/últimos N candles
  - indicators:{symbol}:{timeframe} → últimos N valores
- TTL e política de expiração conforme necessidades.

MongoDB Atlas (logs/config/sentimento):
- collections:
  - configs: parâmetros, credenciais (nunca armazenar chaves em texto plano)
  - logs: eventos de ingestão, sinais, execuções, erros
  - sentiment: documentos com fonte, score [-1,+1], ts, símbolo
  - trades: históricos de trades (id_ordem, preço, qty, ts, pnl)
  - positions: estado atual das posições (entry, qty, SL/TP, ts)

Relacionamentos e integridade:
- Referencie trades/positions com symbol e ids da exchange.
- Mantenha ts coerente (UTC), sem overlaps e duplicações.