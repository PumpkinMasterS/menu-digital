import Fastify from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { register } from 'prom-client';
import { ruleConfigPlugin } from './modules/rules/rule-config-plugin.js';
import { metricsPlugin } from './modules/observability/metrics-plugin.js';
import indicatorsPlugin from './modules/indicators/indicators-plugin.js';
import signalsPlugin from './modules/signals/signals-plugin.js';
import backtestingPlugin from './modules/backtesting/backtesting-plugin.js';
import { initializeExchangeService, getExchangeService } from './modules/exchanges/exchange-service.js';
import { initializeRedis, getRedisClient } from './modules/persistence/redis-client.js';
import { initializePersistenceService } from './modules/persistence/persistence-service.js';
import { initializeOrderExecutor } from './modules/execution/order-executor.js';
import executionPlugin from './modules/execution/execution-plugin.js';
import { enqueueSignal } from './modules/signals/queue.js';
import { startSignalsWorker } from './modules/signals/worker.js';
import { startScheduler } from './modules/scheduler/scheduler.js';
import { tradesCount, tradesRR, tradesMaeR, tradesMfeR, tradesRealizedPnlWinsUsd, tradesRealizedPnlLossesUsd, riskBlocks, riskKillSwitch, riskDailyDrawdownUsd, riskDailyDrawdownLimitUsd, signalsEnqueued, riskDailyDrawdownBySymbolUsd, riskDailyDrawdownLimitBySymbolUsd, riskGateBlocked, riskGateBlockedBySymbol } from './modules/observability/metrics.js';
import { promises as fs } from 'fs';
import path from 'path';
import 'dotenv/config';
import { riskGateTransitions } from './modules/observability/metrics.js';

const app = Fastify({ logger: true });
// CORS e headers de segurança (dev/testnet)
const FRONTEND_ORIGIN = 'http://localhost:5173';
app.addHook('onSend', async (req, reply, payload) => {
  const origin = (req.headers.origin as string) || '';
  if (origin === FRONTEND_ORIGIN) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Vary', 'Origin');
  }
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('Referrer-Policy', 'no-referrer');
  return payload;
});
app.options('*', async (req, reply) => {
  const origin = (req.headers.origin as string) || FRONTEND_ORIGIN;
  reply.header('Access-Control-Allow-Origin', origin);
  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
  reply.code(204).send();
});

// Estado em memória para kill switch manual
let runtimeKillSwitchManual = false;

// Cache leve em memória (TTL) para endpoints externos
type CacheEntry<T = any> = { ts: number; value: T };
const memCache = new Map<string, CacheEntry>();
function getCache<T = any>(key: string, ttlMs: number): T | undefined {
  const e = memCache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.ts > ttlMs) {
    memCache.delete(key);
    return undefined;
  }
  return e.value as T;
}
function setCache<T = any>(key: string, value: T) {
  memCache.set(key, { ts: Date.now(), value });
}

await app.register(metricsPlugin);
await app.register(ruleConfigPlugin, { prefix: '/rules' });
await app.register(indicatorsPlugin, { prefix: '/api/v1' });
await app.register(signalsPlugin, { prefix: '/api/v1' });
await app.register(backtestingPlugin, { prefix: '/api/v1' });
await app.register(executionPlugin, { prefix: '/api/v1' });

// Inicializa o Redis
const redisClient = initializeRedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

try {
  await redisClient.connect();
  console.log('Connected to Redis');
} catch (error) {
  console.error('Failed to connect to Redis:', error);
  // Continua mesmo sem Redis, mas com funcionalidades limitadas
}

// Auditoria de eventos de risco
type RiskAuditEvent = {
  ts: string;
  gate: 'manual_killswitch' | 'daily_drawdown' | 'symbol_drawdown';
  event: 'activated' | 'deactivated';
  symbol?: string;
  meta?: Record<string, any>;
};
const MAX_AUDIT_BUFFER = 500;
const riskAuditBuffer: RiskAuditEvent[] = [];
const riskAuditJsonlPath = path.join(process.cwd(), 'risk_audit.jsonl');
let prevManualKillSwitchActive = false;
let prevDailyDrawdownBreached = false;
const prevSymbolBlocked: Record<string, boolean> = {};
function recordAudit(
  gate: 'manual_killswitch' | 'daily_drawdown' | 'symbol_drawdown',
  event: 'activated' | 'deactivated',
  symbol: string = '',
  meta?: Record<string, any>,
) {
  const evt: RiskAuditEvent = {
    ts: new Date().toISOString(),
    gate,
    event,
    ...(symbol ? { symbol } : {}),
    ...(meta ? { meta } : {}),
  };
  // Métrica de transição
  try { riskGateTransitions.inc({ gate, symbol, event }); } catch {}
  // Buffer em memória com tamanho máximo
  riskAuditBuffer.push(evt);
  if (riskAuditBuffer.length > MAX_AUDIT_BUFFER) {
    riskAuditBuffer.splice(0, riskAuditBuffer.length - MAX_AUDIT_BUFFER);
  }
  // Persistência em JSONL
  try { fs.appendFile(riskAuditJsonlPath, JSON.stringify(evt) + '\n').catch(() => {}); } catch {}
}

// Carrega trades existentes (JSONL)
const tradesPath = path.join(process.cwd(), 'trades.jsonl');
const tradeRecords: any[] = [];
try {
  const data = await fs.readFile(tradesPath, 'utf-8');
  const lines = data.trim().split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      tradeRecords.push(JSON.parse(line));
    } catch {}
  }
} catch {}

// Configuração de credenciais Bybit
let bybitCreds: { apiKey: string; apiSecret: string; testnet: boolean } | null = null;
if (process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET) {
  const k = process.env.BYBIT_API_KEY;
  const s = process.env.BYBIT_API_SECRET;
  const tRaw = process.env.BYBIT_TESTNET;
  bybitCreds = { apiKey: k, apiSecret: s, testnet: tRaw === 'true' || tRaw === '1' || tRaw === 'yes' };
}

// Inicializa o serviço de exchanges
const exchangeService = initializeExchangeService({
  symbols: ['BTCUSDT', 'ETHUSDT'],
  timeframes: ['1m', '3m', '5m', '15m', '1h'],
  enableBybit: true,
  bybitCredentials: bybitCreds ? {
    apiKey: bybitCreds.apiKey,
    apiSecret: bybitCreds.apiSecret,
    testnet: bybitCreds.testnet
  } : undefined
});

// Inicia o serviço de exchanges
await exchangeService.start();

// Inicializa o serviço de persistência
const persistenceConfig = {
  candlesRetentionDays: 30,
  indicatorsRetentionDays: 7,
  signalsRetentionDays: 14,
  maxCandlesPerSymbol: 10000
};

const persistenceService = initializePersistenceService(persistenceConfig);

// Inicializa o executor de ordens
const executionConfig = {
  enableBybit: !!process.env.BYBIT_API_KEY,
  enableBinance: false, // Por enquanto, apenas Bybit
  enablePaperTrading: process.env.ENABLE_PAPER_TRADING === 'true',
  paperTradingBalance: 10000,
  maxPositionSize: 1000,
  maxDailyLoss: 500,
  maxOpenPositions: 5,
  defaultLeverage: 10,
  commissionRate: 0.1,
  slippageRate: 0.05
};

const orderExecutor = initializeOrderExecutor(executionConfig);

// Inicia o executor de ordens
try {
  await orderExecutor.start();
  console.log('Order executor started');
} catch (error) {
  console.error('Failed to start order executor:', error);
  // Continua mesmo sem executor de ordens
}

// Persistência simples em memória e em arquivo JSONL para trades
interface TradeRecord {
  symbol: string;
  timeframe: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  sizeUsd: number;
  feesUsd: number;
  highPrice?: number;
  lowPrice?: number;
  qty: number;
  realizedPnlUsd: number;
  rUsd: number;
  rr: number;
  maeR?: number;
  mfeR?: number;
  outcome: 'win' | 'loss' | 'breakeven';
  closedAt: string; // ISO datetime
}

// Utilitários de risco/drawdown diário (UTC)
const getUtcDayKey = (d: Date) => d.toISOString().slice(0, 10);
function computeTodayPnlUsd(): number {
  const today = getUtcDayKey(new Date());
  let sum = 0;
  for (const t of tradeRecords) {
    if (!t?.closedAt) continue;
    const d = new Date(t.closedAt);
    if (isNaN(d.getTime())) continue;
    if (getUtcDayKey(d) === today) sum += t.realizedPnlUsd;
  }
  return sum;
}
function computeTodayPnlUsdBySymbol(symbol: string): number {
  const today = getUtcDayKey(new Date());
  let sum = 0;
  for (const t of tradeRecords) {
    if (!t?.closedAt || t.symbol !== symbol) continue;
    const d = new Date(t.closedAt);
    if (isNaN(d.getTime())) continue;
    if (getUtcDayKey(d) === today) sum += t.realizedPnlUsd;
  }
  return sum;
}
function getDailyDrawdownLimitUsd(): { limitUsd?: number; mode?: 'usd' | 'pct' } {
  const rawUsd = process.env.MAX_DAILY_DRAWDOWN_USD;
  const usd = rawUsd !== undefined ? Number(rawUsd) : undefined;
  if (typeof usd === 'number' && isFinite(usd) && usd > 0) return { limitUsd: usd, mode: 'usd' };

  const rawPct = process.env.MAX_DAILY_DRAWDOWN_PCT;
  const pctRaw = rawPct !== undefined ? Number(rawPct) : undefined;
  const rawBase = process.env.BASE_EQUITY_USD ?? process.env.ACCOUNT_EQUITY_USD;
  const base = rawBase !== undefined ? Number(rawBase) : undefined;
  if (typeof pctRaw === 'number' && pctRaw > 0 && typeof base === 'number' && base > 0) {
    const pct = pctRaw >= 1 ? pctRaw / 100 : pctRaw; // aceita 1 == 1%
    return { limitUsd: base * pct, mode: 'pct' };
  }
  return {};
}
function updateRiskGauges() {
  const pnlToday = computeTodayPnlUsd();
  try { riskDailyDrawdownUsd.set(pnlToday); } catch {}
  const { limitUsd } = getDailyDrawdownLimitUsd();
  let breached = false;
  if (typeof limitUsd === 'number' && isFinite(limitUsd) && limitUsd > 0) {
    try { riskDailyDrawdownLimitUsd.set(limitUsd); } catch {}
    breached = pnlToday <= -limitUsd;
  } else {
    try { riskDailyDrawdownLimitUsd.set(0); } catch {}
  }
  const active = runtimeKillSwitchManual || breached;
  try { riskKillSwitch.set(active ? 1 : 0); } catch {}
  // Atualiza gauges dos gates globais
  try { riskGateBlocked.set({ type: 'manual_killswitch' }, runtimeKillSwitchManual ? 1 : 0); } catch {}
  try { riskGateBlocked.set({ type: 'daily_drawdown' }, breached ? 1 : 0); } catch {}
  // Auditoria de transições globais
  if (runtimeKillSwitchManual !== prevManualKillSwitchActive) {
    recordAudit('manual_killswitch', runtimeKillSwitchManual ? 'activated' : 'deactivated');
    prevManualKillSwitchActive = runtimeKillSwitchManual;
  }
  if (breached !== prevDailyDrawdownBreached) {
    recordAudit('daily_drawdown', breached ? 'activated' : 'deactivated', '', { pnl_today_usd: pnlToday, limit_usd: limitUsd || 0 });
    prevDailyDrawdownBreached = breached;
  }
}
async function preloadTradesFromJsonl() {
  try {
    const content = await fs.readFile(tradesPath, { encoding: 'utf8' });
    const lines = content.split(/\r?\n/);
    const seen = new Set<string>();
    let dedupSkipped = 0;
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      try {
        const obj = JSON.parse(s);
        if (obj && typeof obj.symbol === 'string' && typeof obj.timeframe === 'string' && typeof obj.realizedPnlUsd === 'number' && typeof obj.closedAt === 'string') {
          const rec = obj as TradeRecord;
          // Dedup simples baseado em chaves estáveis do trade
          const r: any = rec;
          const dedupKey = `${r.symbol}|${r.timeframe}|${r.side}|${r.entryPrice}|${r.exitPrice}|${r.stopPrice}|${r.sizeUsd}|${r.feesUsd}|${r.closedAt}`;
          if (seen.has(dedupKey)) { dedupSkipped++; continue; }
          seen.add(dedupKey);

          tradeRecords.push(rec);
          // Replay de métricas prom-client a partir do histórico
          try {
            const outcome = (rec as any).outcome || (rec.realizedPnlUsd > 0 ? 'win' : rec.realizedPnlUsd < 0 ? 'loss' : 'breakeven');
            tradesCount.inc({ symbol: rec.symbol, timeframe: rec.timeframe, outcome });
          } catch {}
          try {
            const outcome = (rec as any).outcome || (rec.realizedPnlUsd > 0 ? 'win' : rec.realizedPnlUsd < 0 ? 'loss' : 'breakeven');
            if (typeof (rec as any).rr === 'number' && (rec as any).rr > 0) {
              tradesRR.labels(rec.symbol, rec.timeframe, outcome).observe((rec as any).rr);
            }
            if (typeof (rec as any).maeR === 'number' && (rec as any).maeR >= 0) {
              tradesMaeR.labels(rec.symbol, rec.timeframe).observe((rec as any).maeR);
            }
            if (typeof (rec as any).mfeR === 'number' && (rec as any).mfeR >= 0) {
              tradesMfeR.labels(rec.symbol, rec.timeframe).observe((rec as any).mfeR);
            }
          } catch {}
          try {
            if (rec.realizedPnlUsd > 0) {
              tradesRealizedPnlWinsUsd.inc({ symbol: rec.symbol, timeframe: rec.timeframe }, rec.realizedPnlUsd);
            } else if (rec.realizedPnlUsd < 0) {
              tradesRealizedPnlLossesUsd.inc({ symbol: rec.symbol, timeframe: rec.timeframe }, Math.abs(rec.realizedPnlUsd));
            }
          } catch {}
        }
      } catch {}
    }
    updateRiskGauges();
    app.log.info({ count: tradeRecords.length, dedupSkipped }, 'Trades pré-carregados de trades.jsonl');
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      app.log.info('Arquivo trades.jsonl não encontrado, iniciando sem histórico');
    } else {
      app.log.warn({ err }, 'Falha ao pré-carregar trades.jsonl (prosseguindo)');
    }
  }
}

app.get('/healthz', async () => ({ status: 'ok' }));

app.post('/signals/debug', async (req, reply) => {
  const now = new Date().toISOString();
  const job = {
    symbol: 'BTCUSDT',
    timeframe: '1m',
    closeTime: now,
    idempotencyKey: `BTCUSDT-1m-${now}`,
    payload: { demo: true }
  };
  try {
    await enqueueSignal(job);
    return { ok: true };
  } catch (err: any) {
    if (err?.message?.includes('Redis/Queue not configured')) {
      reply.code(503);
      return { ok: false, error: 'Fila de sinais indisponível. Configure REDIS_URL e um servidor Redis.' };
    }
    throw err;
  }
});

// Rota de enqueue consolidada encontra-se mais abaixo com gates globais e por símbolo.


// Endpoint para registrar métricas por trade
// Exemplo de payload:
// {
//   "symbol": "BTCUSDT",
//   "timeframe": "1m",
//   "side": "long", // ou "short"
//   "entryPrice": 100,
//   "exitPrice": 102,
//   "stopPrice": 99,
//   "sizeUsd": 1000,
//   "highPrice": 103,
//   "lowPrice": 99.5,
//   "feesUsd": 0 // opcional
// }
/**
 * Endpoint: POST /trades/record
 * Objetivo: Receber dados de fechamento de trade e atualizar métricas de observabilidade:
 *  - trades_count_total (por outcome: win/loss/breakeven)
 *  - trades_rr_ratio (histograma do R:R por trade)
 *  - trades_mae_r (histograma de MAE em múltiplos de R)
 *  - trades_mfe_r (histograma de MFE em múltiplos de R)
 *  - trades_realized_pnl_wins_usd_total (PNL acumulado em USD para trades vencedores)
 *  - trades_realized_pnl_losses_usd_total (PNL acumulado em USD para trades perdedores)
 *
 * Exemplo de payload:
 * {
 *   "symbol": "BTCUSDT",
 *   "timeframe": "1m",
 *   "side": "long",            // "long" ou "short"
 *   "entryPrice": 100.0,
 *   "exitPrice": 102.0,
 *   "stopPrice": 98.0,          // preço de stop usado para calcular o risco (R)
 *   "sizeUsd": 1000.0,          // tamanho nocional do trade em USD
 *   "highPrice": 103.0,         // opcional, usado para MFE
 *   "lowPrice": 99.5,           // opcional, usado para MAE
 *   "feesUsd": 0.5              // opcional, taxas pagas em USD
 * }
 *
 * Cálculos:
 *  - realizedPnLUsd = (side == long ? (exit - entry) : (entry - exit)) * (sizeUsd / entry) - feesUsd
 *  - R (risco) = (side == long ? (entry - stop) : (stop - entry)) * (sizeUsd / entry)
 *  - rrRatio = realizedPnLUsd / R
 *  - maeR = |drawdown_vs_entry| / R (usando lowPrice para long e highPrice para short)
 *  - mfeR = |runup_vs_entry| / R (usando highPrice para long e lowPrice para short)
 */
app.post('/trades/record', async (req, reply) => {
  const b = req.body as any;
  const required = ['symbol','timeframe','side','entryPrice','exitPrice','stopPrice','sizeUsd'];
  for (const k of required) {
    if (b?.[k] === undefined || b?.[k] === null) {
      return reply.code(400).send({ ok: false, error: `Campo obrigatório ausente: ${k}` });
    }
  }
  const symbol = String(b.symbol);
  const timeframe = String(b.timeframe);
  const side = String(b.side);
  const entry = Number(b.entryPrice);
  const exit = Number(b.exitPrice);
  const stop = Number(b.stopPrice);
  const sizeUsd = Number(b.sizeUsd);
  const feesUsd = Number(b.feesUsd || 0);
  const high = b.highPrice !== undefined ? Number(b.highPrice) : undefined;
  const low = b.lowPrice !== undefined ? Number(b.lowPrice) : undefined;
  const closedAt: string = typeof b.closedAt === 'string' ? b.closedAt : new Date().toISOString();

  if (!['long','short'].includes(side)) {
    return reply.code(400).send({ ok: false, error: 'side inválido: use "long" ou "short"' });
  }
  if (!(entry > 0 && exit > 0 && stop > 0 && sizeUsd > 0)) {
    return reply.code(400).send({ ok: false, error: 'entryPrice/exitPrice/stopPrice/sizeUsd devem ser > 0' });
  }

  // Quantidade aproximada para contratos lineares: qty = sizeUsd / entryPrice
  const qty = sizeUsd / entry;
  // PnL realizado em USD (considerando direção)
  const grossPnlUsd = side === 'long' ? (exit - entry) * qty : (entry - exit) * qty;
  const realizedPnlUsd = grossPnlUsd - feesUsd;
  // R em USD (risco até o stop)
  const rUsd = Math.abs(stop - entry) * qty;

  // Outcome
  const outcome = realizedPnlUsd > 0.000001 ? 'win' : realizedPnlUsd < -0.000001 ? 'loss' : 'breakeven';
  tradesCount.inc({ symbol, timeframe, outcome });

  // R:R ratio (apenas observa valores positivos no histograma)
  let rr = 0;
  if (rUsd > 0) {
    rr = realizedPnlUsd / rUsd;
    if (rr > 0) {
      tradesRR.labels(symbol, timeframe, outcome).observe(rr);
    }
  }

  // MAE/MFE em múltiplos de R (se dados de high/low presentes)
  let maeR: number | undefined = undefined;
  let mfeR: number | undefined = undefined;
  if (rUsd > 0) {
    if (side === 'long') {
      if (typeof high === 'number') {
        const moveUp = Math.max(0, high - entry);
        const mfeUsd = moveUp * qty;
        mfeR = mfeUsd / rUsd;
        if (Number.isFinite(mfeR) && mfeR >= 0) tradesMfeR.labels(symbol, timeframe).observe(mfeR);
      }
      if (typeof low === 'number') {
        const moveDown = Math.max(0, entry - low);
        const maeUsd = moveDown * qty;
        maeR = maeUsd / rUsd;
        if (Number.isFinite(maeR) && maeR >= 0) tradesMaeR.labels(symbol, timeframe).observe(maeR);
      }
    } else {
      // short
      if (typeof low === 'number') {
        const moveDown = Math.max(0, entry - low); // favorável para short
        const mfeUsd = moveDown * qty;
        mfeR = mfeUsd / rUsd;
        if (Number.isFinite(mfeR) && mfeR >= 0) tradesMfeR.labels(symbol, timeframe).observe(mfeR);
      }
      if (typeof high === 'number') {
        const moveUp = Math.max(0, high - entry); // adverso para short
        const maeUsd = moveUp * qty;
        maeR = maeUsd / rUsd;
        if (Number.isFinite(maeR) && maeR >= 0) tradesMaeR.labels(symbol, timeframe).observe(maeR);
      }
    }
  }

  // Acumular PnL realizado separado por wins/losses
  if (realizedPnlUsd > 0) {
    tradesRealizedPnlWinsUsd.inc({ symbol, timeframe }, realizedPnlUsd);
  } else if (realizedPnlUsd < 0) {
    tradesRealizedPnlLossesUsd.inc({ symbol, timeframe }, Math.abs(realizedPnlUsd));
  }

  // Persistir trade (memória + arquivo JSONL best-effort)
  const rec: TradeRecord = {
    symbol,
    timeframe,
    side: side as 'long' | 'short',
    entryPrice: entry,
    exitPrice: exit,
    stopPrice: stop,
    sizeUsd,
    feesUsd,
    highPrice: high,
    lowPrice: low,
    qty,
    realizedPnlUsd,
    rUsd,
    rr,
    maeR,
    mfeR,
    outcome,
    closedAt
  };
  tradeRecords.push(rec);
  try {
    const line = JSON.stringify(rec) + '\n';
    await fs.appendFile(tradesPath, line, { encoding: 'utf8' });
  } catch (e) {
    app.log.warn({ err: e }, 'Falha ao persistir trade em trades.jsonl (ignorado)');
  }

  // Atualiza gauges de risco após registrar trade
  updateRiskGauges();
  try {
    const symPnl = computeTodayPnlUsdBySymbol(symbol);
    riskDailyDrawdownBySymbolUsd.set({ symbol }, symPnl);
  } catch {}

  return { ok: true };
});

// Estatísticas agregadas de trades
// GET /trades/stats?symbol=BTCUSDT&timeframe=1m&from=2025-09-24T00:00:00Z&to=2025-09-25T00:00:00Z
app.get('/trades/stats', async (req, reply) => {
  const q = (req.query || {}) as any;
  const symbol = q.symbol ? String(q.symbol) : undefined;
  const timeframe = q.timeframe ? String(q.timeframe) : undefined;
  const from = q.from ? new Date(String(q.from)) : undefined;
  const to = q.to ? new Date(String(q.to)) : undefined;

  let list = tradeRecords.slice();
  if (symbol) list = list.filter(t => t.symbol === symbol);
  if (timeframe) list = list.filter(t => t.timeframe === timeframe);
  if (from && !isNaN(from.getTime())) list = list.filter(t => new Date(t.closedAt) >= from);
  if (to && !isNaN(to.getTime())) list = list.filter(t => new Date(t.closedAt) <= to);

  const total = list.length;
  const wins = list.filter(t => t.outcome === 'win').length;
  const losses = list.filter(t => t.outcome === 'loss').length;
  const breakevens = list.filter(t => t.outcome === 'breakeven').length;
  const winrate = total > 0 ? wins / total : 0;

  const rrVals = list.map(t => t.rr).filter(v => Number.isFinite(v));
  const maeVals = list.map(t => t.maeR).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const mfeVals = list.map(t => t.mfeR).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a + b, 0) / arr.length : 0;
  const avgRR = avg(rrVals);
  const avgMaeR = avg(maeVals);
  const avgMfeR = avg(mfeVals);

  const sumPnLUsd = list.reduce((a, t) => a + t.realizedPnlUsd, 0);
  const pnlWins = list.filter(t => t.outcome === 'win').reduce((a, t) => a + t.realizedPnlUsd, 0);
  const pnlLosses = list.filter(t => t.outcome === 'loss').reduce((a, t) => a + t.realizedPnlUsd, 0);

  // PnL por dia (YYYY-MM-DD)
  const pnlByDay: Record<string, number> = {};
  for (const t of list) {
    const d = new Date(t.closedAt);
    if (isNaN(d.getTime())) continue;
    const day = d.toISOString().slice(0, 10);
    pnlByDay[day] = (pnlByDay[day] || 0) + t.realizedPnlUsd;
  }

  return {
    ok: true,
    filters: { symbol, timeframe, from: from?.toISOString(), to: to?.toISOString() },
    total,
    wins,
    losses,
    breakevens,
    winrate,
    avgRR,
    avgMaeR,
    avgMfeR,
    sumPnLUsd,
    byOutcome: { win: pnlWins, loss: pnlLosses, breakeven: sumPnLUsd - pnlWins - pnlLosses },
    pnlByDay
  };
});

// Resumo JSON de métricas para dashboards
app.get('/metrics/summary', async (_req, _reply) => {
  // REMOVIDO: import dinâmico de prom-client para evitar múltiplas instâncias do Registry
  // const client = await import('prom-client');
  const {
    signalsEnqueued,
    signalsProcessed,
    queueReady,
    redisReady,
    queueJobsGauge,
    riskKillSwitch,
    riskDailyDrawdownUsd,
    riskDailyDrawdownLimitUsd,
    riskDailyDrawdownBySymbolUsd,
    riskDailyDrawdownLimitBySymbolUsd,
    tradesCount,
    tradesRealizedPnlWinsUsd,
    tradesRealizedPnlLossesUsd,
  } = await import('./modules/observability/metrics.js');

  // Usa o Registry singleton importado no topo do arquivo para garantir a mesma instância
  const registry = register;

  // Helper to read counters directly from the registry to avoid module-instance mismatches
  function registryCounterTotal(name: string, labels?: Record<string,string>) {
    try {
      const metrics = (registry as any).getMetricsAsJSON?.() || [];
      const metric = metrics.find((m: any) => m.name === name);
      if (!metric) return 0;
      const values = metric.values || [];
      if (!labels) {
        return values.reduce((acc: number, v: any) => acc + (typeof v.value === 'number' ? v.value : Number(v.value) || 0), 0);
      }
      return values.reduce((acc: number, v: any) => {
        const lbls = v.labels || {};
        const match = Object.entries(labels).every(([k, val]) => lbls[k] === val);
        return acc + (match ? (typeof v.value === 'number' ? v.value : Number(v.value) || 0) : 0);
      }, 0);
    } catch {
      return 0;
    }
  }

  // Extract counters by name and labels (fallback to direct metric objects when helpful)
  function counterValue(counter: any, labels?: Record<string,string>) {
    try {
      const metric = counter.get();
      const values = metric.values || [];
      if (!labels) {
        const sum = values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
        return sum;
      }
      const match = values.find((v: any) => {
        const lbls = v.labels || {};
        return Object.entries(labels).every(([k, val]) => lbls[k] === val);
      });
      return match ? match.value || 0 : 0;
    } catch {
      return 0;
    }
  }

  function gaugeValue(g: any, labels?: Record<string,string>) {
    try {
      const metric = g.get();
      const values = metric.values || [];
      if (!labels) {
        const last = values[values.length - 1];
        return last ? last.value || 0 : 0;
      }
      const match = values.find((v: any) => {
        const lbls = v.labels || {};
        return Object.entries(labels).every(([k, val]) => lbls[k] === val);
      });
      return match ? match.value || 0 : 0;
    } catch {
      return 0;
    }
  }

  const processedOk = registryCounterTotal('signals_processed_total', { status: 'ok' }) || counterValue(signalsProcessed, { status: 'ok' });
  const processedDedup = registryCounterTotal('signals_processed_total', { status: 'dedup' }) || counterValue(signalsProcessed, { status: 'dedup' });
  const processedBlockedPrecedence = registryCounterTotal('signals_processed_total', { status: 'blocked_precedence' }) || counterValue(signalsProcessed, { status: 'blocked_precedence' });
  const processedCooldown = registryCounterTotal('signals_processed_total', { status: 'cooldown' }) || counterValue(signalsProcessed, { status: 'cooldown' });
  const processedKillSwitch = registryCounterTotal('signals_processed_total', { status: 'killswitch' }) || counterValue(signalsProcessed, { status: 'killswitch' });
  const processedRRMin = registryCounterTotal('signals_processed_total', { status: 'rr_min' }) || counterValue(signalsProcessed, { status: 'rr_min' });
  const processedMaxConcurrent = registryCounterTotal('signals_processed_total', { status: 'max_concurrent' }) || counterValue(signalsProcessed, { status: 'max_concurrent' });
  const processedMaxDaily = registryCounterTotal('signals_processed_total', { status: 'max_daily' }) || counterValue(signalsProcessed, { status: 'max_daily' });

  const summary = {
    queue: {
      ready: !!gaugeValue(queueReady),
      redisReady: !!gaugeValue(redisReady),
      jobs: {
        waiting: gaugeValue(queueJobsGauge, { state: 'waiting' }),
        active: gaugeValue(queueJobsGauge, { state: 'active' }),
        delayed: gaugeValue(queueJobsGauge, { state: 'delayed' }),
        completed: gaugeValue(queueJobsGauge, { state: 'completed' }),
        failed: gaugeValue(queueJobsGauge, { state: 'failed' }),
      }
    },
    signals: {
      enqueued_total: registryCounterTotal('signals_enqueued_total') || counterValue(signalsEnqueued),
      processed_total: registryCounterTotal('signals_processed_total') || counterValue(signalsProcessed),
      processed_breakdown: {
        ok: processedOk,
        dedup: processedDedup,
        blocked_precedence: processedBlockedPrecedence,
        cooldown: processedCooldown,
        killswitch: processedKillSwitch,
        rr_min: processedRRMin,
        max_concurrent: processedMaxConcurrent,
        max_daily: processedMaxDaily,
      }
    },
    risk: {
      kill_switch: !!gaugeValue(riskKillSwitch),
      daily_drawdown_usd: gaugeValue(riskDailyDrawdownUsd),
      daily_drawdown_limit_usd: gaugeValue(riskDailyDrawdownLimitUsd),
      daily_drawdown_by_symbol_usd: gaugeValue(riskDailyDrawdownBySymbolUsd),
      daily_drawdown_limit_by_symbol_usd: gaugeValue(riskDailyDrawdownLimitBySymbolUsd),
    },
    trades: {
      count_total: registryCounterTotal('trades_count_total') || counterValue(tradesCount),
      records_total: tradeRecords.length,
      realized_pnl_usd: {
        wins_total: registryCounterTotal('trades_realized_pnl_wins_usd_total') || counterValue(tradesRealizedPnlWinsUsd),
        losses_total: registryCounterTotal('trades_realized_pnl_losses_usd_total') || counterValue(tradesRealizedPnlLossesUsd)
      }
    }
  };

  return summary;
});

// Pré-carrega trades do JSONL antes de iniciar o servidor (para cálculo correto de drawdown do dia)
await preloadTradesFromJsonl();

// Removido: listen e inicializações aqui para evitar registrar rotas após o servidor iniciar
app.post('/signals/enqueue', async (req, reply) => {
  const body = req.body as any;
  const job = {
    symbol: body?.symbol ?? 'BTCUSDT',
    timeframe: body?.timeframe ?? '1m',
    closeTime: body?.closeTime ?? new Date().toISOString(),
    idempotencyKey: body?.idempotencyKey ?? `custom-${Date.now()}`,
    payload: body?.payload ?? {}
  };

  // Kill switch manual tem precedência
  if (runtimeKillSwitchManual) {
    try { riskBlocks.inc({ reason: 'manual_killswitch' }); } catch {}
    reply.code(429);
    return { ok: false, error: 'Bloqueado: kill switch manual ativo' };
  }

  // Gate global: drawdown diário
  updateRiskGauges();
  const { limitUsd } = getDailyDrawdownLimitUsd();
  const pnlToday = computeTodayPnlUsd();
  if (typeof limitUsd === 'number' && limitUsd > 0 && pnlToday <= -limitUsd) {
    try { riskBlocks.inc({ reason: 'daily_drawdown' }); } catch {}
    app.log?.info?.({ gate: 'daily_drawdown', pnlTodayUsd: pnlToday, limitUsd }, 'risk gate blocked');
    reply.code(429);
    return { ok: false, error: 'Bloqueado: limite de drawdown diário atingido', pnlTodayUsd: pnlToday, limitUsd };
  }

  // Gate por símbolo (se configurado)
  const symLimit = symbolLimits[job.symbol]?.maxDailyDrawdownUsd;
  if (typeof symLimit === 'number' && symLimit > 0) {
    const pnlSym = computeTodayPnlUsdBySymbol(job.symbol);
    try { riskDailyDrawdownBySymbolUsd.set({ symbol: job.symbol }, pnlSym); } catch {}
    try { riskDailyDrawdownLimitBySymbolUsd.set({ symbol: job.symbol }, symLimit); } catch {}
    try { riskGateBlockedBySymbol.set({ symbol: job.symbol }, pnlSym <= -symLimit ? 1 : 0); } catch {}
    if (pnlSym <= -symLimit) {
      try { riskBlocks.inc({ reason: `daily_drawdown_symbol_${job.symbol}` }); } catch {}
      app.log?.info?.({ gate: 'daily_drawdown_symbol', symbol: job.symbol, pnlTodayUsd: pnlSym, limitUsd: symLimit }, 'risk gate blocked');
      reply.code(429);
      return { ok: false, error: `Bloqueado: limite diário do símbolo ${job.symbol} atingido`, pnlTodayUsd: pnlSym, limitUsd: symLimit };
    }
  }

  try {
    await enqueueSignal(job, { jobId: body?.jobId });
    try { signalsEnqueued.inc({ symbol: job.symbol, timeframe: job.timeframe }); } catch {}
    return { ok: true };
  } catch (err: any) {
    if (err?.message?.includes('Redis/Queue not configured')) {
      reply.code(503);
      return { ok: false, error: 'Fila de sinais indisponível. Configure REDIS_URL e um servidor Redis.' };
    }
    throw err;
  }
});







// Runtime kill switch admin endpoints
// curl -s -X POST http://localhost:3000/risk/killswitch -H "Content-Type: application/json" -d '{"active": true}'
// curl -s -X POST http://localhost:3000/risk/killswitch -H "Content-Type: application/json" -d '{"active": false}'
app.post('/risk/killswitch', async (req, reply) => {
  const body = req.body as any;
  const active = body?.active === true || body?.active === 1 || body?.active === '1';
  runtimeKillSwitchManual = active;
  if (active) {
    try { riskBlocks.inc({ reason: 'manual_killswitch' }); } catch {}
  }
  updateRiskGauges();
  return { ok: true, active };
});

// Runtime update drawdown limits (USD or %)
// curl -s -X POST http://localhost:3000/risk/drawdown-limit -H "Content-Type: application/json" -d '{"usd": 20}'
// curl -s -X POST http://localhost:3000/risk/drawdown-limit -H "Content-Type: application/json" -d '{"pct": 1, "base": 1500}'
app.post('/risk/drawdown-limit', async (req, reply) => {
  const body = req.body as any;
  const usd = body?.usd !== undefined ? Number(body.usd) : undefined;
  const pct = body?.pct !== undefined ? Number(body.pct) : undefined;
  const base = body?.base !== undefined ? Number(body.base) : undefined;
  if (typeof usd === 'number' && isFinite(usd) && usd > 0) {
    process.env.MAX_DAILY_DRAWDOWN_USD = String(usd);
    delete process.env.MAX_DAILY_DRAWDOWN_PCT;
  } else if (typeof pct === 'number' && pct > 0 && typeof base === 'number' && base > 0) {
    delete process.env.MAX_DAILY_DRAWDOWN_USD;
    process.env.MAX_DAILY_DRAWDOWN_PCT = String(pct);
    process.env.BASE_EQUITY_USD = String(base);
  } else {
    reply.code(400);
    return { ok: false, error: 'Informe {usd} > 0 ou {pct} > 0 com {base} > 0' };
  }
  updateRiskGauges();
  const { limitUsd, mode } = getDailyDrawdownLimitUsd();
  try { riskDailyDrawdownLimitUsd.set(limitUsd || 0); } catch {}
  return { ok: true, mode, limitUsd };
});

// Per-symbol/per-strategy limits (basic stub storage in memory)
// curl -s -X POST http://localhost:3000/risk/symbol-limit -H "Content-Type: application/json" -d '{"symbol":"BTCUSDT","usd": 15}'
const symbolLimits: Record<string, { maxDailyDrawdownUsd?: number }> = {};
app.post('/risk/symbol-limit', async (req, reply) => {
  const body = req.body as any;
  const symbol = String(body?.symbol || '').trim();
  const usd = body?.usd !== undefined ? Number(body.usd) : undefined;
  if (!symbol) { reply.code(400); return { ok: false, error: 'symbol requerido' }; }
  if (!(typeof usd === 'number' && isFinite(usd) && usd > 0)) { reply.code(400); return { ok: false, error: 'usd > 0 requerido' }; }
  symbolLimits[symbol] = { maxDailyDrawdownUsd: usd };
  const limit = usd;
  const pnlSym = computeTodayPnlUsdBySymbol(symbol);
  const blocked = limit > 0 ? pnlSym <= -limit : false;
  try { riskDailyDrawdownBySymbolUsd.set({ symbol }, pnlSym); } catch {}
  try { riskDailyDrawdownLimitBySymbolUsd.set({ symbol }, limit); } catch {}
  try { riskGateBlockedBySymbol.set({ symbol }, blocked ? 1 : 0); } catch {}
  // Auditoria de transição por símbolo (on demand)
  const prev = !!prevSymbolBlocked[symbol];
  if (prev !== blocked) {
    recordAudit('symbol_drawdown', blocked ? 'activated' : 'deactivated', symbol, { pnl_today_usd: pnlSym, limit_usd: limit });
    prevSymbolBlocked[symbol] = blocked;
  }
  updateRiskGauges();
  return { ok: true, symbol, limit_usd: limit, pnl_today_usd: pnlSym, blocked };
});

// GET global drawdown limit and current status
app.get('/risk/drawdown-limit', async (req, reply) => {
  updateRiskGauges();
  const pnlToday = computeTodayPnlUsd();
  const { limitUsd, mode } = getDailyDrawdownLimitUsd();
  const breached = typeof limitUsd === 'number' && isFinite(limitUsd) && limitUsd > 0 ? pnlToday <= -limitUsd : false;
  try { riskDailyDrawdownUsd.set(pnlToday); } catch {}
  try { riskDailyDrawdownLimitUsd.set(limitUsd || 0); } catch {}
  try { riskGateBlocked.set({ type: 'daily_drawdown' }, breached ? 1 : 0); } catch {}
  return { ok: true, mode, limitUsd: limitUsd || 0, pnl_today_usd: pnlToday, breached };
});

// GET per-symbol drawdown limit and current status
app.get('/risk/symbol-limit/:symbol', async (req, reply) => {
  const symbol = String((req.params as any)?.symbol || '').trim();
  if (!symbol) { reply.code(400); return { ok: false, error: 'symbol requerido' }; }
  const cfg = symbolLimits[symbol];
  const limit = (cfg?.maxDailyDrawdownUsd || 0);
  const pnlSym = computeTodayPnlUsdBySymbol(symbol);
  const blocked = limit > 0 ? pnlSym <= -limit : false;
  try { riskDailyDrawdownBySymbolUsd.set({ symbol }, pnlSym); } catch {}
  try { riskDailyDrawdownLimitBySymbolUsd.set({ symbol }, limit); } catch {}
  try { riskGateBlockedBySymbol.set({ symbol }, blocked ? 1 : 0); } catch {}
  // Auditoria de transição por símbolo (on demand)
  const prev = !!prevSymbolBlocked[symbol];
  if (prev !== blocked) {
    recordAudit('symbol_drawdown', blocked ? 'activated' : 'deactivated', symbol, { pnl_today_usd: pnlSym, limit_usd: limit });
    prevSymbolBlocked[symbol] = blocked;
  }
  updateRiskGauges();
  return { ok: true, symbol, limit_usd: limit, pnl_today_usd: pnlSym, blocked };
});

// Inserir status entre drawdown-limit e symbol-limit
app.get('/risk/status', async () => {
  updateRiskGauges();
  const pnlToday = computeTodayPnlUsd();
  const { limitUsd } = getDailyDrawdownLimitUsd();
  const dailyBreached = typeof limitUsd === 'number' && isFinite(limitUsd) && limitUsd > 0 ? pnlToday <= -limitUsd : false;
  const bySymbol: Record<string, { pnl_today_usd: number; limit_usd: number; blocked: boolean }> = {};
  for (const [symbol, cfg] of Object.entries(symbolLimits)) {
    const symLimit = (cfg?.maxDailyDrawdownUsd || 0);
    const pnlSym = computeTodayPnlUsdBySymbol(symbol);
    bySymbol[symbol] = {
      pnl_today_usd: pnlSym,
      limit_usd: symLimit,
      blocked: symLimit > 0 ? pnlSym <= -symLimit : false,
    };
  }
  return {
    ok: true,
    risk: {
      gates: {
        manual_killswitch_blocked: !!runtimeKillSwitchManual,
        daily_drawdown_blocked: !!dailyBreached,
      },
      global: {
        pnl_today_usd: pnlToday,
        limit_usd: limitUsd || 0,
        breached: !!dailyBreached,
      },
      bySymbol,
    }
  };
});



// Endpoint de auditoria
app.get('/risk/audit', async (req, reply) => {
  const q = (req.query as any) || {};
  const limitRaw = q.limit;
  const n = typeof limitRaw === 'string' ? Number(limitRaw) : typeof limitRaw === 'number' ? limitRaw : 50;
  const limit = !isFinite(n) || n <= 0 ? 50 : Math.min(n, MAX_AUDIT_BUFFER);
  return { ok: true, events: riskAuditBuffer.slice(-limit) };
});

// Exportar arquivo de auditoria como download
app.get('/risk/audit/export', async (req, reply) => {
  const file = path.resolve(process.cwd(), 'risk_audit.jsonl');
  try {
    await fs.promises.access(file);
    reply.header('Content-Type', 'application/jsonl; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="risk_audit.jsonl"');
    const stream = fs.createReadStream(file, { encoding: 'utf-8' });
    return reply.send(stream);
  } catch (e) {
    reply.code(404);
    return { ok: false, error: 'audit file not found' };
  }
});

// Configuração de credenciais Bybit (MVP: memória)
// Carregar de variáveis de ambiente se disponível
(() => {
  try {
    const k = process.env.BYBIT_API_KEY;
    const s = process.env.BYBIT_API_SECRET;
    const tRaw = (process.env.BYBIT_TESTNET || '').toLowerCase();
    if (k && s) {
      bybitCreds = { apiKey: k, apiSecret: s, testnet: tRaw === 'true' || tRaw === '1' || tRaw === 'yes' };
    }
  } catch {}
})();
app.post('/config/bybit', async (req, reply) => {
  try {
    const b = (req.body as any) || {};
    const apiKey = String(b.apiKey || '').trim();
    const apiSecret = String(b.apiSecret || '').trim();
    const testnet = !!b.testnet;
    if (!apiKey || !apiSecret) { reply.code(400); return { ok: false, error: 'apiKey/apiSecret requeridos' }; }
    bybitCreds = { apiKey, apiSecret, testnet };
    return { ok: true };
  } catch (e: any) {
    reply.code(500);
    return { ok: false, error: e?.message || String(e) };
  }
});
app.get('/config/bybit/status', async (req, reply) => {
  const configured = !!bybitCreds;
  const testnet = !!bybitCreds?.testnet;
  return { ok: true, configured, testnet };
});
app.get('/config/bybit/test', async (req, reply) => {
  try {
    const base = bybitCreds?.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    const t0 = Date.now();
    const res = await fetch(`${base}/v5/market/tickers?category=linear&symbol=BTCUSDT`);
    const latency_ms = Date.now() - t0;
    return { ok: res.ok, reachable: res.ok, latency_ms, network: bybitCreds?.testnet ? 'testnet' : 'mainnet' };
  } catch (e: any) {
    reply.code(502);
    return { ok: false, reachable: false, error: e?.message || String(e) };
  }
});

// Helpers de requisição assinada à Bybit (v5)
function signBybit(secret: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
async function bybitSignedGet(subPath: string, params: Record<string,string|number>) {
  if (!bybitCreds) throw new Error('Credenciais não configuradas');
  const base = bybitCreds.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  const ts = Date.now();
  const recvWindow = 5000;
  const qs = new URLSearchParams();
  for (const [k,v] of Object.entries(params)) qs.set(k, String(v));
  const query = qs.toString();
  const signStr = `${ts}${bybitCreds.apiKey}${recvWindow}${query}`;
  const sign = signBybit(bybitCreds.apiSecret, signStr);
  const url = `${base}${subPath}?${query}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': bybitCreds.apiKey,
      'X-BAPI-TIMESTAMP': String(ts),
      'X-BAPI-RECV-WINDOW': String(recvWindow),
      'X-BAPI-SIGN': sign,
    }
  });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: j };
}
async function bybitSignedPost(subPath: string, body: Record<string, any>) {
  if (!bybitCreds) throw new Error('Credenciais não configuradas');
  const base = bybitCreds.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  const ts = Date.now();
  const recvWindow = 5000;
  const payload = JSON.stringify(body ?? {});
  const signStr = `${ts}${bybitCreds.apiKey}${recvWindow}${payload}`;
  const sign = signBybit(bybitCreds.apiSecret, signStr);
  const url = `${base}${subPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': bybitCreds.apiKey,
      'X-BAPI-TIMESTAMP': String(ts),
      'X-BAPI-RECV-WINDOW': String(recvWindow),
      'X-BAPI-SIGN': sign,
    },
    body: payload,
  });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: j };
}

// Endpoints autenticados: wallet e posições (testnet/mainnet)
app.get('/bybit/wallet-balance', async (req, reply) => {
  try {
    if (!bybitCreds) { reply.code(400); return { ok: false, error: 'Credenciais Bybit não configuradas' }; }
    const cacheKey = 'bybit:wallet_balance:UNIFIED';
    const cached = getCache<any>(cacheKey, 15_000);
    if (cached) return cached;
    const r = await bybitSignedGet('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
    if (r?.ok) setCache(cacheKey, r);
    return r;
  } catch (e: any) {
    reply.code(502);
    return { ok: false, error: e?.message || String(e) };
  }
});
app.get('/bybit/positions', async (req, reply) => {
  try {
    if (!bybitCreds) { reply.code(400); return { ok: false, error: 'Credenciais Bybit não configuradas' }; }
    const q = (req.query as any) || {};
    const category = String(q.category || 'linear');
    const symbol = q.symbol ? String(q.symbol) : undefined;
    const params: Record<string,string|number> = { category };
    if (symbol) params.symbol = symbol;
    const cacheKey = `bybit:positions:${category}:${symbol || '*'}`;
    const cached = getCache<any>(cacheKey, 15_000);
    if (cached) return cached;
    const r = await bybitSignedGet('/v5/position/list', params);
    if (r?.ok) setCache(cacheKey, r);
    return r;
  } catch (e: any) {
    reply.code(502);
    return { ok: false, error: e?.message || String(e) };
  }
});

// Ações rápidas de posição
app.post('/bybit/position/close', async (req, reply) => {
  try {
    if (!bybitCreds) { reply.code(400); return { ok: false, error: 'Credenciais Bybit não configuradas' }; }
    const b = (req.body as any) || {};
    const category = String(b.category || 'linear');
    const symbol = String(b.symbol || '').trim();
    const closeSide = String(b.closeSide || '').toLowerCase(); // 'long' ou 'short'
    const qty = b.qty !== undefined ? Number(b.qty) : undefined;
    if (!symbol) { reply.code(400); return { ok: false, error: 'symbol requerido' }; }
    if (!(closeSide === 'long' || closeSide === 'short')) { reply.code(400); return { ok: false, error: 'closeSide deve ser "long" ou "short"' }; }
    if (!(typeof qty === 'number' && isFinite(qty) && qty > 0)) { reply.code(400); return { ok: false, error: 'qty > 0 requerido' }; }
    const side = closeSide === 'long' ? 'Sell' : 'Buy';
    const r = await bybitSignedPost('/v5/order/create', {
      category,
      symbol,
      side,
      orderType: 'Market',
      qty,
      reduceOnly: true,
    });
    return r;
  } catch (e: any) {
    reply.code(502);
    return { ok: false, error: e?.message || String(e) };
  }
});
app.post('/bybit/position/set-leverage', async (req, reply) => {
  try {
    if (!bybitCreds) { reply.code(400); return { ok: false, error: 'Credenciais Bybit não configuradas' }; }
    const b = (req.body as any) || {};
    const category = String(b.category || 'linear');
    const symbol = String(b.symbol || '').trim();
    const buyLeverage = b.buyLeverage !== undefined ? Number(b.buyLeverage) : undefined;
    const sellLeverage = b.sellLeverage !== undefined ? Number(b.sellLeverage) : undefined;
    if (!symbol) { reply.code(400); return { ok: false, error: 'symbol requerido' }; }
    if (!(typeof buyLeverage === 'number' && buyLeverage > 0) && !(typeof sellLeverage === 'number' && sellLeverage > 0)) {
      reply.code(400); return { ok: false, error: 'Informe buyLeverage e/ou sellLeverage > 0' };
    }
    const r = await bybitSignedPost('/v5/position/set-leverage', {
      category,
      symbol,
      buyLeverage,
      sellLeverage,
    });
    return r;
  } catch (e: any) {
    reply.code(502);
    return { ok: false, error: e?.message || String(e) };
  }
});
app.post('/bybit/position/set-trading-stop', async (req, reply) => {
  try {
    if (!bybitCreds) { reply.code(400); return { ok: false, error: 'Credenciais Bybit não configuradas' }; }
    const b = (req.body as any) || {};
    const category = String(b.category || 'linear');
    const symbol = String(b.symbol || '').trim();
    const takeProfit = b.takeProfit !== undefined ? String(b.takeProfit) : undefined;
    const stopLoss = b.stopLoss !== undefined ? String(b.stopLoss) : undefined;
    if (!symbol) { reply.code(400); return { ok: false, error: 'symbol requerido' }; }
    if (!takeProfit && !stopLoss) { reply.code(400); return { ok: false, error: 'Informe takeProfit e/ou stopLoss' }; }
    const r = await bybitSignedPost('/v5/position/set-trading-stop', {
      category,
      symbol,
      takeProfit,
      stopLoss,
    });
    return r;
  } catch (e: any) {
    reply.code(502);
    return { ok: false, error: e?.message || String(e) };
  }
});

// Validação de credenciais Bybit (assinada)
app.get('/config/bybit/validate', async (req, reply) => {
  try {
    const configured = !!bybitCreds;
    if (!configured) { return { ok: true, configured: false, network: null, reachable: false }; }
    const r = await bybitSignedGet('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
    return {
      ok: r.ok,
      configured: true,
      network: bybitCreds?.testnet ? 'testnet' : 'mainnet',
      reachable: !!r.ok,
      status: r.status,
    };
  } catch (e: any) {
    reply.code(502);
    return { ok: false, configured: !!bybitCreds, error: e?.message || String(e) };
  }
});

// Adiciona endpoints para controlar o serviço de exchanges
app.post('/exchanges/start', async (req, reply) => {
  try {
    const service = getExchangeService();
    if (!service) {
      return reply.code(503).send({ ok: false, error: 'Serviço de exchanges não inicializado' });
    }
    
    if (service.isActive()) {
      return { ok: true, message: 'Serviço de exchanges já está em execução' };
    }
    
    await service.start();
    return { ok: true, message: 'Serviço de exchanges iniciado com sucesso' };
  } catch (error) {
    app.log.error(error);
    reply.code(500);
    return { ok: false, error: 'Falha ao iniciar serviço de exchanges' };
  }
});

app.post('/exchanges/stop', async (req, reply) => {
  try {
    const service = getExchangeService();
    if (!service) {
      return reply.code(503).send({ ok: false, error: 'Serviço de exchanges não inicializado' });
    }
    
    if (!service.isActive()) {
      return { ok: true, message: 'Serviço de exchanges já está parado' };
    }
    
    service.stop();
    return { ok: true, message: 'Serviço de exchanges parado com sucesso' };
  } catch (error) {
    app.log.error(error);
    reply.code(500);
    return { ok: false, error: 'Falha ao parar serviço de exchanges' };
  }
});

app.get('/exchanges/status', async (req, reply) => {
  try {
    const service = getExchangeService();
    if (!service) {
      return reply.code(503).send({ ok: false, error: 'Serviço de exchanges não inicializado' });
    }
    
    return {
      ok: true,
      active: service.isActive(),
      bybitConnector: !!service.getBybitConnector()
    };
  } catch (error) {
    app.log.error(error);
    reply.code(500);
    return { ok: false, error: 'Falha ao obter status do serviço de exchanges' };
  }
});

// Adiciona endpoint para verificar status do Redis
app.get('/redis/status', async (req, reply) => {
  const redis = getRedisClient();
  if (!redis) {
    return { ok: false, error: 'Redis client not initialized' };
  }

  try {
    const isConnected = redis.isConnected();
    const memoryUsage = await persistenceService.getMemoryUsage();
    
    return {
      ok: true,
      connected: isConnected,
      memory: memoryUsage
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Adiciona endpoint para limpar dados antigos
app.post('/redis/cleanup', async (req, reply) => {
  try {
    await persistenceService.cleanupOldData();
    return { ok: true, message: 'Cleanup completed' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Agora, somente após todas as rotas estarem registradas, iniciamos o servidor e workers
const port = Number(process.env.PORT || 3000);
await app.listen({ port, host: '0.0.0.0' });
// Log amigável com URL base e total de trades pré-carregados
app.log.info({ baseUrl: `http://localhost:${port}`, port, preloadedTrades: tradeRecords.length }, `HTTP listening on http://localhost:${port}`);
startScheduler({ symbols: ['BTCUSDT','ETHUSDT'], timeframes: ['1m','3m'] });
startSignalsWorker();