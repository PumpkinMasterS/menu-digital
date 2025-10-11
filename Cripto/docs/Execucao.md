# Execução de Ordens

Conectores de exchange:
- Bybit como alvo inicial (suporte a spot/perp e testnet).
- Abstrair via camada "ExchangeClient" para trocar facilmente Binance/Coinbase.

Tipos de ordem:
- Market, Limit, OCO (One-Cancels-the-Other para SL/TP simultâneos).
- Validação de quantidade mínima e passos de preço.

Ciclo de execução:
1) Receber sinal do Signal Engine.
2) Calcular tamanho de posição e níveis de SL/TP (ATR).
3) Enviar ordens (market/limit) e configurar OCO/stop.
4) Confirmar fills e atualizar estado da posição.
5) Monitorizar stops/take e eventos (ordem rejeitada, cancelada).

Resiliência:
- Retries com backoff para erros temporários.
- Rate-limit: respeitar limites; fila de ordens.
- Testnet: validar toda a lógica antes da produção.

Auditoria:
- Logar request/response (sem segredos) e resultados (fills, PnL).
- Guardar ids das ordens e relacionar com trades/positions.

## Execução em Perp (Derivativos)

Modos de margem:
- Cross margin: margem compartilhada entre posições; maior risco de efeito cascata.
- Isolated margin (recomendado inicialmente): margem por posição; limita risco por trade.

Alavancagem e modo de posição:
- Definir leverage por símbolo (ex.: 2–5x) de acordo com volatilidade e liquidez.
- Preferir modo one-way (sem hedge) no início; avaliar hedge quando houver estratégias long/short simultâneas.

Funding rates:
- Considerar funding como custo no PnL (backtesting e operação).
- Evitar abrir posições próximo a funding desfavorável quando a edge for marginal.

Proteção contra liquidação:
- Calcular preço de liquidação estimado e manter buffer mínimo (ex.: 3–5 × tickSize ou 0.5–1.0 × ATR).
- SL deve ser sempre superior ao preço de liquidação + buffer (long) ou inferior − buffer (short).
- Alertar e reduzir posição se o buffer diminuir em função da volatilidade.

Fees e preferências de ordem:
- Modelar maker/taker fees em simulações e execução.
- Usar postOnly para evitar taker fee quando possível; usar reduceOnly em ordens de saída (SL/TP).

Validações e pré-checagens:
- minNotional, minQty, stepSize, tickSize e precisões por símbolo.
- Saldo e margem disponíveis suficientes para a posição e SL/TP.
- Checagem idempotente para evitar duplicidade de ordens em replays.

Stops e OCO em perp:
- Configurar OCO com stop (reduceOnly) e take-profit (reduceOnly).
- Suporte a trailing stop (opcional) com parâmetros mínimos do símbolo.
- Atualizar stops em fills parciais ou quando houver escalonamento de posição.

Eventos e resiliência:
- Monitorar cancelamentos, rejeições, partial fills e ADL; registrar auditoria.
- Retries com backoff e fila respeitando rate-limits.
- Health-checks e circuit breaker quando a exchange estiver instável.