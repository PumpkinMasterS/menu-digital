import { Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { signalsProcessed, postCloseLatencyMs } from '../observability/metrics.js';
import { getActiveRuleConfig } from '../rules/rule-config.store.js';
import type { SignalJobData } from './queue.js';
import { DEDUP_WINDOW_SECONDS, PRECEDENCE_DEFAULT, TF, tfToMs } from '../../config/defaults.js';

const processedKeys = new Map<string, number>(); // idempotency + dedup window guard
const lastProcessedPerSymbolTf = new Map<string, number>();
// Controle de limite de concorrência por timeframe (timestamps de processados recentes)
const processedTimestampsPerTf = new Map<TF, number[]>();
// Limite diário por símbolo/timeframe
const processedCountPerSymbolTfDay = new Map<string, number>(); // key: symbol:tf:YYYY-MM-DD

function withinDedupWindow(tf: TF, key: string): boolean {
  const last = processedKeys.get(key);
  if (!last) return false;
  const windowMs = DEDUP_WINDOW_SECONDS[tf] * 1000;
  return Date.now() - last < windowMs;
}

function nowMs() { return Date.now(); }

function purgeOldTimestamps(tf: TF, windowMs: number) {
  const list = processedTimestampsPerTf.get(tf) || [];
  const cutoff = nowMs() - windowMs;
  const filtered = list.filter(ts => ts >= cutoff);
  processedTimestampsPerTf.set(tf, filtered);
}

function getUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startSignalsWorker() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('[signals-worker] skipped (no REDIS_URL)');
    return undefined;
  }
  try {
    const connection = new IORedis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      retryStrategy: (times) => Math.min(times * 1000, 15_000),
    });

    connection.on('error', (err) => {
      console.warn('[signals-worker][redis] error:', err?.message);
    });

    const worker = new Worker<SignalJobData>(
      'signals',
      async job => {
        const cfg = getActiveRuleConfig();
        const tf = job.data.timeframe as TF;
        const symbol = job.data.symbol;

        // idempotency + dedup
        const dedupKey = job.data.idempotencyKey;
        if (withinDedupWindow(tf, dedupKey)) {
          job.log(`Dedup drop for ${dedupKey}`);
          signalsProcessed.inc({ timeframe: tf, status: 'dedup' });
          return { dedup: true };
        }

        // precedence: only allow if this tf is not lower priority than allowed
        const precedence = cfg.precedence && cfg.precedence.length > 0 ? cfg.precedence as TF[] : PRECEDENCE_DEFAULT;
        if (!precedence.includes(tf)) {
          job.log(`TF ${tf} not allowed by precedence; dropping`);
          signalsProcessed.inc({ timeframe: tf, status: 'blocked_precedence' });
          return { blocked: 'precedence' };
        }

        // cooldown gate (por símbolo/timeframe)
        const cooldownSec = cfg.risk.cooldownSeconds ?? 0;
        if (cooldownSec > 0) {
          const symbolTfKey = `${symbol}:${tf}`;
          const lastAt = lastProcessedPerSymbolTf.get(symbolTfKey);
          if (lastAt && (nowMs() - lastAt) < cooldownSec * 1000) {
            job.log(`Cooldown (seconds) active for ${symbolTfKey}; dropping`);
            signalsProcessed.inc({ timeframe: tf, status: 'cooldown' });
            return { blocked: 'cooldown' };
          }
        }

        // cooldown gate (candles) por símbolo/timeframe
        const cooldownCandles = cfg.risk.cooldownCandles ?? 0;
        if (cooldownCandles > 0) {
          const symbolTfKey = `${symbol}:${tf}`;
          const lastAt = lastProcessedPerSymbolTf.get(symbolTfKey);
          const windowMs = cooldownCandles * tfToMs(tf);
          if (lastAt && (nowMs() - lastAt) < windowMs) {
            job.log(`Cooldown (candles=${cooldownCandles}) active for ${symbolTfKey}; dropping`);
            signalsProcessed.inc({ timeframe: tf, status: 'cooldown' });
            return { blocked: 'cooldown' };
          }
        }

        // risk gate: simples kill-switch + maxConcurrentSignals por janela de cooldown
        if (cfg.risk.killSwitch) {
          job.log(`KillSwitch active; dropping`);
          signalsProcessed.inc({ timeframe: tf, status: 'killswitch' });
          return { blocked: 'killswitch' };
        }

        // rrMin gate (usa expectedRR no payload do job quando informado)
        const rrMin = Number(cfg.risk.rrMin ?? 0);
        if (rrMin > 0) {
          const expectedRR = (job.data as any)?.payload?.expectedRR;
          if (typeof expectedRR === 'number' && Number.isFinite(expectedRR) && expectedRR < rrMin) {
            job.log(`RR gate: expectedRR=${expectedRR} < rrMin=${rrMin}; dropping`);
            signalsProcessed.inc({ timeframe: tf, status: 'rr_min' });
            return { blocked: 'rr_min' };
          }
        }

        const maxConc = cfg.risk.maxConcurrentSignals;
        if (maxConc && maxConc > 0) {
          const windowMs = Math.max(1, (cfg.risk.cooldownSeconds ?? 0)) * 1000;
          if (windowMs > 0) {
            purgeOldTimestamps(tf, windowMs);
            const current = processedTimestampsPerTf.get(tf) || [];
            if (current.length >= maxConc) {
              job.log(`Max concurrent (${maxConc}) reached for ${tf}; dropping`);
              signalsProcessed.inc({ timeframe: tf, status: 'max_concurrent' });
              return { blocked: 'max_concurrent' };
            }
          }
        }

        // Max signals per day per symbol/timeframe (UTC day)
        const maxPerDay = cfg.risk.maxSignalsPerDay ?? 0;
        if (maxPerDay > 0) {
          const dayKey = getUtcDayKey(new Date(job.data.closeTime));
          const key = `${symbol}:${tf}:${dayKey}`;
          const current = processedCountPerSymbolTfDay.get(key) || 0;
          if (current >= maxPerDay) {
            job.log(`Daily limit reached for ${key} (max=${maxPerDay}); dropping`);
            signalsProcessed.inc({ timeframe: tf, status: 'max_daily' });
            return { blocked: 'max_daily' };
          }
        }

        // mark as processed for dedup window e cooldown/concorrência
        processedKeys.set(dedupKey, nowMs());
        lastProcessedPerSymbolTf.set(`${symbol}:${tf}`, nowMs());
        const arr = processedTimestampsPerTf.get(tf) || [];
        arr.push(nowMs());
        processedTimestampsPerTf.set(tf, arr);

        // increment per-day counter
        if ((cfg.risk.maxSignalsPerDay ?? 0) > 0) {
          const dayKey = getUtcDayKey(new Date(job.data.closeTime));
          const mapKey = `${symbol}:${tf}:${dayKey}`;
          processedCountPerSymbolTfDay.set(mapKey, (processedCountPerSymbolTfDay.get(mapKey) || 0) + 1);
        }

        // latency metric
        const closed = new Date(job.data.closeTime).getTime();
        const latency = Date.now() - closed;
        if (!Number.isNaN(latency)) {
          postCloseLatencyMs.labels(tf).observe(latency);
        }

        signalsProcessed.inc({ timeframe: tf, status: 'ok' });
        job.log(`Processed ${dedupKey}`);
        return { ok: true, processedAt: new Date().toISOString() };
      },
      { connection, concurrency: 2, autorun: true }
    );

    worker.on('ready', () => {
      console.log('[signals-worker] ready');
    });

    worker.on('error', err => {
      console.error('[signals-worker] error', err?.message);
    });

    worker.on('completed', job => {
      console.log(`[signals-worker] completed jobId=${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[signals-worker] failed jobId=${job?.id}`, err?.message);
    });

    return worker;
  } catch (err: any) {
    console.error('[signals-worker] failed to start:', err?.message);
    return undefined;
  }
}