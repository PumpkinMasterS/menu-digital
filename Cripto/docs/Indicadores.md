# Indicadores Técnicos

Indicadores alvo:
- RSI (curto prazo 10m, médio prazo 1h)
- EMA (50/200) para tendência
- ATR (14) para stops dinâmicos
- MACD (12,26,9) opcional para confirmação

Bibliotecas recomendadas:
- Python: pandas, pandas-ta, TA-Lib
- Cálculo rolling incremental para latência baixa.

Definições e parâmetros:
- RSI: medida de força relativa (0–100). Use método de Wilder; períodos típicos 14. Para curto (10m), calcule RSI sobre candles agregados de 10m; para médio (1h), sobre candles de 1h.
- EMA: médias móveis exponenciais de 50 e 200 períodos para tendência. Cruzamentos (EMA50>EMA200) indicam tendência de alta.
- ATR: média do True Range (geralmente 14 períodos) para estimar volatilidade; usado em SL/TP dinâmicos.
- MACD: diferença entre EMA(12) e EMA(26), com linha de sinal EMA(9) e histograma.

Boas práticas:
- Trate dados faltantes/gaps antes de calcular.
- Valide consistência e recalculações apenas quando novos candles fecharem.
- Armazene indicadores sincronizados com ts do candle.

Performance:
- Use vetorização (pandas/numpy) e evite loops.
- Para streaming, mantenha buffers por símbolo/timeframe e atualize incrementalmente.

## Timeframes suportados e regras de cálculo

Timeframes suportados:
- 1m, 3m, 5m, 10m (agregado), 15m, 1h, 4h.

Regras de cálculo:
- Calcular indicadores apenas em candles fechados (sem lookahead).
- Agregar candles maiores a partir de bases menores quando necessário (ex.: 10m a partir de 1m/5m).
- Sincronizar todos os indicadores com timestamps em UTC e o timeframe correspondente.
- Buffers por símbolo/timeframe para cálculo incremental em streaming.

Validação:
- Tratar gaps e missing data antes do cálculo.
- Recalcular apenas quando houver novo candle fechado; evitar recomputações desnecessárias.