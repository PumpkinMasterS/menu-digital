import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { signalsEnqueued, queueReady, redisReady } from '../observability/metrics.js';

let connection: IORedis | undefined;
let signalsQueue: Queue | undefined;

export function getRedis(): IORedis | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;
  if (!connection) {
    connection = new IORedis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      retryStrategy: (times) => Math.min(times * 1000, 15_000),
    });
    connection.on('error', (err) => {
      console.warn('[redis] connection error:', err?.message);
      redisReady.set(0);
    });
    connection.on('ready', () => {
      console.log('[redis] ready');
      redisReady.set(1);
    });
  }
  return connection;
}

export function getSignalsQueue(): Queue | undefined {
  if (!signalsQueue) {
    const conn = getRedis();
    if (!conn) return undefined;
    signalsQueue = new Queue('signals', { connection: conn });
    queueReady.set(1);
  }
  return signalsQueue;
}

export interface SignalJobData {
  symbol: string;
  timeframe: string; // use TF type after wiring
  closeTime: string; // ISO
  idempotencyKey: string; // symbol+tf+closeTime
  payload: Record<string, unknown>;
}

export async function enqueueSignal(job: SignalJobData, opts?: { jobId?: string }) {
  const queue = getSignalsQueue();
  if (!queue) {
    queueReady.set(0);
    throw new Error('Redis/Queue not configured. Set REDIS_URL to enable signal queue.');
  }
  const jobId = opts?.jobId ?? job.idempotencyKey;
  const res = await queue.add(job.idempotencyKey, job, {
    jobId,
    removeOnComplete: 1000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  signalsEnqueued.inc({ symbol: job.symbol, timeframe: job.timeframe });
  return res;
}