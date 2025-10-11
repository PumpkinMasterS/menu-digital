import type { TF } from '../../config/defaults.js';

export interface Candle {
  symbol: string;
  timeframe: TF;
  openTime: string; // ISO
  closeTime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}