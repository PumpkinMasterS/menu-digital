import { setInterval as setIntervalSafe } from 'timers';
import type { TF } from '../../config/defaults.js';
import type { Candle } from './types.js';
import { CandleBuffer } from './buffers.js';
import { enqueueSignal } from '../signals/queue.js';

const buffer = new CandleBuffer();

export type SchedulerOptions = {
  symbols: string[];
  timeframes: TF[]; // e.g. ['1m','3m']
};

export function startScheduler(opts: SchedulerOptions) {
  // 1m tick
  setIntervalSafe(async () => {
    const now = new Date();
    // Placeholder: aqui faríamos fetch de close de 1m da exchange (mock neste MVP)
    for (const symbol of opts.symbols) {
      const closeTime = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString();
      const candle: Candle = {
        symbol,
        timeframe: '1m',
        openTime: closeTime,
        closeTime,
        open: 0, high: 0, low: 0, close: 0, volume: 0,
      };
      buffer.upsert(candle);
      // Enfileira sinal para o fechamento de 1m
      const job = {
        symbol,
        timeframe: candle.timeframe as TF,
        closeTime,
        idempotencyKey: `${symbol}-${candle.timeframe}-${closeTime}`,
        payload: { candle }
      };
      try { await enqueueSignal(job); } catch (_) { /* fila indisponível ou erro: ignora no scheduler */ }
    }
  }, 60_000).unref();

  // 3m resampling tick determinístico alinhado ao relógio
  setIntervalSafe(async () => {
    const now = new Date();
    const aligned = Math.floor(now.getTime() / 180_000) * 180_000;
    if (now.getTime() - aligned < 1000) {
      for (const symbol of opts.symbols) {
        const closeTime = new Date(aligned).toISOString();
        const c1 = buffer.get(symbol, '1m', new Date(aligned - 120_000).toISOString());
        const c2 = buffer.get(symbol, '1m', new Date(aligned - 60_000).toISOString());
        const c3 = buffer.get(symbol, '1m', new Date(aligned).toISOString());
        if (c1 && c2 && c3) {
          const resampled: Candle = {
            symbol,
            timeframe: '3m',
            openTime: c1.openTime,
            closeTime,
            open: c1.open,
            high: Math.max(c1.high, c2.high, c3.high),
            low: Math.min(c1.low, c2.low, c3.low),
            close: c3.close,
            volume: c1.volume + c2.volume + c3.volume,
          };
          buffer.upsert(resampled);
          // Enfileira sinal para o fechamento de 3m
          const job = {
            symbol,
            timeframe: resampled.timeframe as TF,
            closeTime,
            idempotencyKey: `${symbol}-${resampled.timeframe}-${closeTime}`,
            payload: { candle: resampled }
          };
          try { await enqueueSignal(job); } catch (_) { /* fila indisponível ou erro: ignora no scheduler */ }
        }
      }
    }
  }, 1000).unref(); // checa a cada segundo para disparar exatamente no múltiplo de 3m
}