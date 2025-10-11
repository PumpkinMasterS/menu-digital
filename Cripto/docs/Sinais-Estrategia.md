# Motor de Sinais e Estratégia

Diretriz de configuração de sinais (sem regras fixas):
- As regras BUY/SELL/HOLD serão definidas exclusivamente no frontend pelo utilizador, através de um construtor de regras.
- O backend (Signal Engine) será rule-agnostic: carrega a configuração ativa, avalia condições e retorna o sinal.
- Sem defaults rígidos; na ausência de regra válida, o comportamento padrão é HOLD.

Contrato de configuração (esboço técnico):
- Origem: frontend → API → MongoDB (coleção configs), com versionamento.
- Estrutura mínima recomendada:
  - id, enabled, symbol(s), timeframes utilizados
  - conditions: lista (com operadores AND/OR, comparadores > < == >= <=)
    - cada condição referencia: indicador (nome, timeframe, campo), sentimento (fonte/peso), preço/ATR/EMA/RSI etc.
    - thresholds e janelas são definidos pelo utilizador
  - prioridades e precedências (ex.: o que fazer em conflito entre BUY e SELL)
  - limites operacionais (cooldown, maxSignalsPorDia) referenciados ou embutidos
  - referências a perfis de risco (k/m de ATR, sizing) se desejar centralizar na regra
- Validação no backend: esquema JSON e verificação de consistência antes de ativar

Estrutura do motor de sinais:
- Inputs: indicadores sincronizados por ts, sentimento agregado, e a RuleConfig ativa.
- Estado: posição atual (none/long) e metadados (preço de entrada, SL/TP ativos — se geridos pelo Execution Manager).
- Saída: sinal {BUY, SELL, HOLD} com timestamp e justificativas (condições satisfeitas/falhadas).

Fluxo de decisão (orientado a configuração):
1) Atualizar buffers (indicadores/sentimento) por timeframe conforme requerido pela configuração.
2) Avaliar condições conforme lógica definida pelo utilizador (AND/OR, grupos).
3) Aplicar precedências e limites (cooldown, maxSignals/dia) definidos.
4) Gerar sinal e registar auditoria.

Observações:
- Prevalência de eventos de risco (SL/TP) pode ser tratada no Execution Manager independentemente do sinal; ou configurável na RuleConfig.
- Caso a configuração esteja inválida ou não carregue, o backend retorna HOLD e emite alerta.

Log e auditoria:
- Guardar a RuleConfig utilizada, inputs, resultado e explicação das condições.
- Versionamento das regras (id/versão/autor/data) para reprodutibilidade em backtesting.

## Pontos de partida (configuráveis no frontend)

- RSI
  - Comprar quando RSI(14) < 30; Vender quando RSI(14) > 70.
  - Tudo ajustável: período (ex.: 14), limites superior/inferior (ex.: 70/30), timeframe.
- Médias móveis (EMA/SMA)
  - Comprar quando EMA(fast) cruza acima de EMA(slow); Vender no cruzamento inverso.
  - Padrão inicial: EMA(50) e EMA(200), editáveis no frontend.
- SL/TP por ATR e por R:R
  - Exemplo padrão: SL = 1,5 × ATR(14); TP por razão R:R = 2 (ambos ajustáveis).
  - Além de ATR/RR, podes escolher modos percentuais ou valor absoluto por regra (ver Gestão de Risco).
- Proteções operacionais (sempre ativas)
  - Cooldown global: 2s entre sinais do mesmo símbolo/timeframe.
  - Máximo de 2 sinais em paralelo por janela de cooldown.

### Timeframes e símbolos
- Suporte atual de timeframes no backend: 1m, 3m, 5m, 10m, 15m, 1h, 4h.
- Planeado: expandir para outros timeframes comuns do TradingView/corretoras (ex.: 30m, 2h, 1d) — requer atualização do schema e do motor.
- Símbolos de arranque: BTCUSDT e ETHUSDT.

### Publicação e ativação
- O frontend publica a configuração ativa em /rules/publish (JSON Schema v1).
- O backend valida e aplica; as proteções (cooldown, concorrência, limites diários, kill switch) são aplicadas antes de qualquer execução.