import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import client from 'prom-client';
import { getSignalsQueue } from '../signals/queue.js';
import { queueReady, queueJobsGauge, redisReady, postCloseLatencyMs, signalsProcessed, signalsEnqueued, tradesCount, tradesRR, tradesMaeR, tradesMfeR, tradesRealizedPnlWinsUsd, tradesRealizedPnlLossesUsd, riskDailyDrawdownBySymbolUsd, riskDailyDrawdownLimitBySymbolUsd, riskGateBlocked, riskGateBlockedBySymbol, riskGateTransitions } from './metrics.js'

const TFS = ['1m','3m','5m','10m','15m','1h','4h'] as const;
const STATUSES = ['ok','dedup','blocked_precedence','cooldown','killswitch','max_concurrent','max_daily','rr_min'] as const;
const OUTCOMES = ['win','loss','breakeven'] as const;
const SYMBOLS = ['BTCUSDT','ETHUSDT','XRPUSDT'] as const;

export const metricsPlugin = fp(async function (app: FastifyInstance) {
  // Coleta métricas padrão do processo (CPU, memória, GC, event loop, etc.)
  client.collectDefaultMetrics();

  // Inicializa gauges com valores seguros (0) para garantir exposição mesmo sem eventos
  queueReady.set(0);
  redisReady.set(0);
  queueJobsGauge.set({ state: 'waiting' }, 0);
  queueJobsGauge.set({ state: 'active' }, 0);
  queueJobsGauge.set({ state: 'delayed' }, 0);
  queueJobsGauge.set({ state: 'completed' }, 0);
  queueJobsGauge.set({ state: 'failed' }, 0);
  queueJobsGauge.set({ state: 'paused' }, 0);

  // Preaquecer histogram e counters com 0 para que apareçam em /metrics
  for (const tf of TFS) {
    // Um observe(0) cria as séries do histograma por label
    postCloseLatencyMs.labels(tf).observe(0);
    for (const st of STATUSES) {
      signalsProcessed.inc({ timeframe: tf, status: st }, 0);
    }
    // Preaquecer métricas de trades
    for (const symbol of SYMBOLS) {
      for (const outcome of OUTCOMES) {
        tradesCount.inc({ symbol, timeframe: tf, outcome }, 0);
        tradesRR.labels(symbol, tf, outcome).observe(0);
      }
      tradesMaeR.labels(symbol, tf).observe(0);
      tradesMfeR.labels(symbol, tf).observe(0);
      tradesRealizedPnlWinsUsd.inc({ symbol, timeframe: tf }, 0);
      tradesRealizedPnlLossesUsd.inc({ symbol, timeframe: tf }, 0);

      // Preaquecer novos gauges por símbolo
      riskDailyDrawdownBySymbolUsd.set({ symbol }, 0);
      riskDailyDrawdownLimitBySymbolUsd.set({ symbol }, 0);
      riskGateBlockedBySymbol.set({ symbol }, 0);
    }
  }
  // Preaquecer estado de bloqueio global por tipo
  riskGateBlocked.set({ type: 'manual_killswitch' }, 0);
  riskGateBlocked.set({ type: 'daily_drawdown' }, 0);
  
  // Preaquecer transições dos risk gates
  // Eventos possíveis: activated/deactivated
  try {
    riskGateTransitions.inc({ gate: 'manual_killswitch', symbol: '', event: 'activated' }, 0);
    riskGateTransitions.inc({ gate: 'manual_killswitch', symbol: '', event: 'deactivated' }, 0);
    riskGateTransitions.inc({ gate: 'daily_drawdown', symbol: '', event: 'activated' }, 0);
    riskGateTransitions.inc({ gate: 'daily_drawdown', symbol: '', event: 'deactivated' }, 0);
    for (const symbol of SYMBOLS) {
      riskGateTransitions.inc({ gate: 'symbol_drawdown', symbol, event: 'activated' }, 0);
      riskGateTransitions.inc({ gate: 'symbol_drawdown', symbol, event: 'deactivated' }, 0);
    }
  } catch {}

  // Criar série inicial para sinais enfileirados
  signalsEnqueued.inc({ symbol: 'BTCUSDT', timeframe: '1m' }, 0);

  // Poll periódico das contagens da fila BullMQ
  setInterval(() => {
    try {
      const q = getSignalsQueue();
      if (!q) {
        queueReady.set(0);
        return;
      }
      queueReady.set(1);
      q.getJobCounts().then(counts => {
        queueJobsGauge.set({ state: 'waiting' }, counts.waiting || 0);
        queueJobsGauge.set({ state: 'active' }, counts.active || 0);
        queueJobsGauge.set({ state: 'delayed' }, counts.delayed || 0);
        queueJobsGauge.set({ state: 'completed' }, counts.completed || 0);
        queueJobsGauge.set({ state: 'failed' }, counts.failed || 0);
        queueJobsGauge.set({ state: 'paused' }, counts.paused || 0);
      }).catch(() => {
        // Evitar barulho em logs
      });
    } catch (e) {
      // Não quebrar o endpoint de métricas
    }
  }, 15_000).unref();

  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', client.register.contentType);
    return client.register.metrics();
  });
});