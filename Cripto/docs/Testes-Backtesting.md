# Testes e Backtesting

Objetivo
- Garantir correção, robustez e replicabilidade das estratégias e da execução.

Escopos de teste
- Unitários: validação de RuleConfig (Ajv), cálculos de indicadores, sizing, SL/TP, cooldowns.
- Integração: ingestão WS/REST, resampling (1m→3m, 1m/5m→10m, 1h→4h), motor de sinais, execução em perp (isolated/cross).
- End-to-end: do dado bruto à ordem emitida e auditoria registrada.

Backtesting
- Data source: TimescaleDB/arquivos OHLCV (UTC), consistentes com produção.
- Timeframes suportados: 1m, 3m, 5m, 10m, 15m, 1h, 4h.
- Regras:
  - Somente candles fechados; sem lookahead.
  - Resampling determinístico nas bordas do timeframe.
  - Sincronização por símbolo/timeframe; lidar com gaps e reconciliação por REST.
- Métricas:
  - PnL bruto e líquido (fees/slippage).
  - R:R, WinRate, Expectancy, Sharpe/Sortino.
  - MAE/MFE por trade e drawdown (máx diário e total).
- Validações cruzadas:
  - Reproduzir resultados do backtesting com motor de produção (modo dry-run).
  - Semente fixa para quaisquer componentes estocásticos (p.ex., sentimento simulado).

Fixtures e mocks
- Mocks para Bybit REST/WS, latências e erros intermitentes.
- Fixtures de OHLCV de 1m para gerar 3m/10m; de 1h para gerar 4h.

Critérios de aprovação
- Desvios entre backtesting e produção (dry-run) dentro de tolerância definida (<0,5% PnL e <1% taxa de acerto).
- Todos os testes passando no CI; relatórios publicados.