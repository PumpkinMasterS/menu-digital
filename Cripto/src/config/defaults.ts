export type TF = '1m'|'3m'|'5m'|'10m'|'15m'|'1h'|'4h';

export const PRECEDENCE_DEFAULT: TF[] = ['4h','1h','15m','10m','5m','3m','1m'];

export const DEDUP_WINDOW_SECONDS: Record<TF, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
};

export const SLO_POST_CLOSE_MS_P95: Record<TF, number> = {
  '1m': 500,
  '3m': 600,
  '5m': 700,
  '10m': 800,
  '15m': 900,
  '1h': 2000,
  '4h': 3000,
};

export function tfToMs(tf: TF): number {
  switch (tf) {
    case '1m': return 60_000;
    case '3m': return 180_000;
    case '5m': return 300_000;
    case '10m': return 600_000;
    case '15m': return 900_000;
    case '1h': return 3_600_000;
    case '4h': return 14_400_000;
  }
}