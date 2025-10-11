import client from 'prom-client';

export const signalsEnqueued = new client.Counter({
  name: 'signals_enqueued_total',
  help: 'Total de sinais enfileirados',
  labelNames: ['symbol', 'timeframe']
});

export const signalsProcessed = new client.Counter({
  name: 'signals_processed_total',
  help: 'Total de sinais processados por status',
  labelNames: ['timeframe', 'status']
});

export const postCloseLatencyMs = new client.Histogram({
  name: 'post_close_latency_ms',
  help: 'Latência em ms do fechamento do candle até processamento do sinal',
  labelNames: ['timeframe'],
  buckets: [50, 100, 200, 300, 500, 800, 1000, 2000, 5000]
});

export const queueReady = new client.Gauge({
  name: 'signals_queue_ready',
  help: 'Disponibilidade da fila de sinais (1=ready, 0=unavailable)'
});

export const redisReady = new client.Gauge({
  name: 'redis_ready',
  help: 'Disponibilidade do Redis (1=ready, 0=unavailable)'
});

export const queueJobsGauge = new client.Gauge({
  name: 'signals_queue_jobs',
  help: 'Contagem de jobs na fila de sinais por estado',
  labelNames: ['state']
});

export const tradesCount = new client.Counter({
  name: 'trades_count_total',
  help: 'Contagem de trades por resultado',
  labelNames: ['symbol', 'timeframe', 'outcome']
});

export const tradesRR = new client.Histogram({
  name: 'trades_rr_ratio',
  help: 'Distribuição de R:R por trade',
  labelNames: ['symbol', 'timeframe', 'outcome'],
  buckets: [0.2, 0.5, 1, 1.5, 2, 3, 5, 8, 13]
});

export const tradesMaeR = new client.Histogram({
  name: 'trades_mae_r',
  help: 'MAE por trade em múltiplos de R',
  labelNames: ['symbol', 'timeframe'],
  buckets: [0.1, 0.2, 0.5, 1, 1.5, 2, 3, 5]
});

export const tradesMfeR = new client.Histogram({
  name: 'trades_mfe_r',
  help: 'MFE por trade em múltiplos de R',
  labelNames: ['symbol', 'timeframe'],
  buckets: [0.1, 0.2, 0.5, 1, 1.5, 2, 3, 5, 8]
});

export const tradesRealizedPnlWinsUsd = new client.Counter({
  name: 'trades_realized_pnl_wins_usd_total',
  help: 'PNL realizado (USD) acumulado em trades vencedores',
  labelNames: ['symbol', 'timeframe']
});

export const tradesRealizedPnlLossesUsd = new client.Counter({
  name: 'trades_realized_pnl_losses_usd_total',
  help: 'PNL realizado (USD) acumulado em trades perdedores (valor absoluto)',
  labelNames: ['symbol', 'timeframe']
});

// Métricas de risco
export const riskBlocks = new client.Counter({
  name: 'risk_blocks_total',
  help: 'Total de bloqueios por política de risco',
  labelNames: ['reason']
});

export const riskKillSwitch = new client.Gauge({
  name: 'risk_killswitch_active',
  help: 'Estado do kill switch de risco (1=ativo, 0=inativo)'
});

export const riskDailyDrawdownUsd = new client.Gauge({
  name: 'risk_daily_drawdown_usd',
  help: 'PnL acumulado no dia (USD, negativo indica drawdown)'
});

export const riskDailyDrawdownLimitUsd = new client.Gauge({
  name: 'risk_daily_drawdown_limit_usd',
  help: 'Limite de drawdown diário em USD (se configurado)'
});

// Novos gauges por símbolo
export const riskDailyDrawdownBySymbolUsd = new client.Gauge({
  name: 'risk_daily_drawdown_symbol_usd',
  help: 'PnL acumulado no dia por símbolo (USD, negativo indica drawdown)',
  labelNames: ['symbol']
});

export const riskDailyDrawdownLimitBySymbolUsd = new client.Gauge({
  name: 'risk_daily_drawdown_symbol_limit_usd',
  help: 'Limite de drawdown diário por símbolo em USD (se configurado)',
  labelNames: ['symbol']
});

// Novos gauges de estado de bloqueio dos gates (0/1)
export const riskGateBlocked = new client.Gauge({
  name: 'risk_gate_blocked',
  help: 'Estado de bloqueio dos risk gates globais (0/1) por tipo',
  labelNames: ['type']
});

export const riskGateBlockedBySymbol = new client.Gauge({
  name: 'risk_gate_blocked_by_symbol',
  help: 'Estado de bloqueio do risk gate por símbolo (0/1)',
  labelNames: ['symbol']
});

export const riskGateTransitions = new client.Counter({
  name: 'risk_gate_transitions_total',
  help: 'Transições de estado dos risk gates (ativado/desativado)',
  labelNames: ['gate', 'symbol', 'event']
});