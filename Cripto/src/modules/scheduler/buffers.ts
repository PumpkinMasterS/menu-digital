import type { Candle } from './types.js';

export class CandleBuffer {
  private byKey = new Map<string, Candle>(); // key = symbol|timeframe|closeTime

  private key(c: Candle) { return `${c.symbol}|${c.timeframe}|${c.closeTime}`; }

  upsert(candle: Candle) {
    this.byKey.set(this.key(candle), candle);
  }

  get(symbol: string, timeframe: Candle['timeframe'], closeTime: string) {
    return this.byKey.get(`${symbol}|${timeframe}|${closeTime}`);
  }
}