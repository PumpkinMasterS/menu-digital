# Gestão de Risco

Position sizing:
- Percentual fixo do capital (ex.: 1–2% por trade) ajustável.
- Opcional: reduzir sizing quando ATR alto (maior volatilidade).

Stops dinâmicos (ATR):
- Stop-loss = entry_price − k * ATR
- Take-profit = entry_price + m * ATR
- k e m calibrados via backtesting (ex.: k=1.5, m=3).

Limites operacionais:
- Max drawdown diário (ex.: 3–5% do capital): parar o bot quando atingido.
- Nº máximo de posições simultâneas (ex.: 1–3), começando com 1.
- Kill-switch manual e automático (ex.: latência alta, falhas repetidas de ordens).

Slippage e custos:
- Modelar slippage e fees na simulação e na execução.
- Evitar ordens em períodos de baixa liquidez.

Compliance de risco:
- Guardar métricas por trade (R:R, realized PnL, MAE/MFE).
- Alertas visuais no dashboard para SL/TP e risco agregado.

## SL/TP configuráveis

Modos suportados:
- Percentual: SL = entry_price × (1 − value), TP = entry_price × (1 + value)
- Absoluto: SL = entry_price − value, TP = entry_price + value
- ATR múltiplo: SL = entry_price − k × ATR, TP = entry_price + m × ATR

Estrutura de configuração (por regra/estratégia):
- stopLoss: { mode: "percent" | "absolute" | "atrMultiple", value: number }
- takeProfit: { mode: "percent" | "absolute" | "atrMultiple", value: number }
- anchorPrice (opcional): "entry" (padrão) ou "mark"
- rounding: sempre arredondar preço aos incrementos do símbolo (tickSize)

Validação e precedência:
- Política global pode restringir SL/TP (ex.: RR mínimo ≥ 1.5, SL máximo 3%)
- Validar minNotional, minQty, stepSize e tickSize antes de enviar ordens
- Em caso de conflito, prevalece a política global de risco

Exemplos rápidos:
- SL 2% e TP 4%: stopLoss { mode: "percent", value: 0.02 }, takeProfit { mode: "percent", value: 0.04 }
- SL absoluto de 100 USDT, TP absoluto de 200 USDT
- SL = 1.5 × ATR, TP = 3 × ATR

## Precedência e Política Global de Risco

- Sizing máximo por trade (% do capital) e por símbolo
- Limites: drawdown diário, nº máximo de posições simultâneas, maxSignals por janela
- Kill-switch automático (falhas repetidas, latência anormal, desconexão da exchange)
- Logs de decisão (motivo de bloqueio, parâmetros de SL/TP aplicados, arredondamentos)

## Modos de Stop Loss e Take Profit (por regra)

- Selecionáveis no frontend por cada regra/estratégia:
  - Percentual: stopLoss/takeProfit proporcionais ao preço de entrada (ex.: 1.5% SL, 3% TP)
  - Valor absoluto: em unidades de preço (USDT) a partir do preço de entrada (ex.: SL = 100, TP = 200)
  - Múltiplos de ATR: k × ATR(period) (ex.: SL = 1.5 × ATR(14); TP = 3 × ATR(14))
- A política global pode forçar limites (ex.: RR mínimo ≥ 1.5, SL máximo 3%).

### Exemplos (BTCUSDT e ETHUSDT)
- BTCUSDT (long): entrada 26,000 USDT
  - Percentual: SL 1.5% → 25,610; TP 3% → 26,780
  - Absoluto: SL 100 → 25,900; TP 200 → 26,200
  - ATR k=1.5/3 (ATR(14)=80): SL 1.5×80=120 → 25,880; TP 3×80=240 → 26,240
- ETHUSDT (long): entrada 1,600 USDT
  - Percentual: SL 1.5% → 1,576; TP 3% → 1,648
  - Absoluto: SL 10 → 1,590; TP 20 → 1,620
  - ATR k=1.5/3 (ATR(14)=8): SL 1.5×8=12 → 1,588; TP 3×8=24 → 1,624

Notas:
- Os cálculos acima são ilustrativos; o motor arredonda a preços válidos conforme tickSize da exchange antes de enviar ordens.
- A escolha do modo (percent, absolute, atrMultiple) e seus valores é feita por regra no frontend e aplicada no Execution Manager.