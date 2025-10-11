import { TF } from '../../config/defaults.js';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  rsi?: number;
  ema?: {
    short?: number;
    long?: number;
  };
  atr?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

export class TechnicalIndicators {
  // Buffer para armazenar candles por símbolo/timeframe
  private buffers: Map<string, CandleData[]> = new Map();
  
  // Configurações padrão para indicadores
  private readonly defaultConfig = {
    rsi: { period: 14 },
    ema: { short: 50, long: 200 },
    atr: { period: 14 },
    macd: { fast: 12, slow: 26, signal: 9 }
  };

  /**
   * Adiciona um candle ao buffer e calcula indicadores
   */
  addCandle(symbol: string, timeframe: TF, candle: CandleData): IndicatorValues {
    const key = `${symbol}:${timeframe}`;
    const buffer = this.buffers.get(key) || [];
    
    // Adiciona o novo candle
    buffer.push(candle);
    
    // Mantém apenas os candles necessários para cálculo (baseado no maior período)
    const maxPeriod = Math.max(
      this.defaultConfig.rsi.period,
      this.defaultConfig.ema.long,
      this.defaultConfig.atr.period,
      this.defaultConfig.macd.slow + this.defaultConfig.macd.signal
    );
    
    if (buffer.length > maxPeriod + 100) { // Mantém um pouco extra para cálculos
      buffer.splice(0, buffer.length - maxPeriod - 100);
    }
    
    this.buffers.set(key, buffer);
    
    // Calcula todos os indicadores
    return this.calculateIndicators(buffer);
  }

  /**
   * Obtém o buffer atual de candles para um símbolo/timeframe
   */
  getCandles(symbol: string, timeframe: TF, limit?: number): CandleData[] {
    const key = `${symbol}:${timeframe}`;
    const buffer = this.buffers.get(key) || [];
    
    if (limit && limit > 0) {
      return buffer.slice(-limit);
    }
    
    return [...buffer];
  }

  /**
   * Calcula RSI (Relative Strength Index)
   */
  private calculateRSI(candles: CandleData[], period: number = 14): number | undefined {
    if (candles.length < period + 1) return undefined;
    
    let gains = 0;
    let losses = 0;
    
    // Calcula ganhos e perdas iniciais
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calcula RSI usando média exponencial
    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calcula EMA (Exponential Moving Average)
   */
  private calculateEMA(candles: CandleData[], period: number): number | undefined {
    if (candles.length < period) return undefined;
    
    // Calcula SMA inicial
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }
    let ema = sum / period;
    
    // Calcula EMA para o restante
    const multiplier = 2 / (period + 1);
    for (let i = period; i < candles.length; i++) {
      ema = (candles[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * Calcula ATR (Average True Range)
   */
  private calculateATR(candles: CandleData[], period: number = 14): number | undefined {
    if (candles.length < period + 1) return undefined;
    
    let trSum = 0;
    
    // Calcula True Range para cada candle
    for (let i = 1; i <= period; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trSum += tr;
    }
    
    return trSum / period;
  }

  /**
   * Calcula MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(candles: CandleData[]): { macd: number; signal: number; histogram: number } | undefined {
    if (candles.length < this.defaultConfig.macd.slow + this.defaultConfig.macd.signal) return undefined;
    
    const fastEMA = this.calculateEMA(candles, this.defaultConfig.macd.fast);
    const slowEMA = this.calculateEMA(candles, this.defaultConfig.macd.slow);
    
    if (!fastEMA || !slowEMA) return undefined;
    
    const macdLine = fastEMA - slowEMA;
    
    // Para calcular a linha de sinal, precisaríamos de um buffer de valores MACD anteriores
    // Simplificação: usamos uma aproximação baseada nos candles recentes
    let signalSum = 0;
    let count = 0;
    
    for (let i = this.defaultConfig.macd.signal; i > 0; i--) {
      if (candles.length > this.defaultConfig.macd.slow + i) {
        const subCandles = candles.slice(0, candles.length - i);
        const subFastEMA = this.calculateEMA(subCandles, this.defaultConfig.macd.fast);
        const subSlowEMA = this.calculateEMA(subCandles, this.defaultConfig.macd.slow);
        
        if (subFastEMA && subSlowEMA) {
          signalSum += (subFastEMA - subSlowEMA);
          count++;
        }
      }
    }
    
    const signalLine = count > 0 ? signalSum / count : macdLine;
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram
    };
  }

  /**
   * Calcula todos os indicadores para um buffer de candles
   */
  private calculateIndicators(candles: CandleData[]): IndicatorValues {
    const result: IndicatorValues = {};
    
    // RSI
    result.rsi = this.calculateRSI(candles, this.defaultConfig.rsi.period);
    
    // EMAs
    result.ema = {
      short: this.calculateEMA(candles, this.defaultConfig.ema.short),
      long: this.calculateEMA(candles, this.defaultConfig.ema.long)
    };
    
    // ATR
    result.atr = this.calculateATR(candles, this.defaultConfig.atr.period);
    
    // MACD
    result.macd = this.calculateMACD(candles);
    
    return result;
  }

  /**
   * Obtém os indicadores mais recentes para um símbolo/timeframe
   */
  getLatestIndicators(symbol: string, timeframe: TF): IndicatorValues | undefined {
    const key = `${symbol}:${timeframe}`;
    const buffer = this.buffers.get(key);
    
    if (!buffer || buffer.length === 0) return undefined;
    
    return this.calculateIndicators(buffer);
  }

  /**
   * Limpa o buffer de um símbolo/timeframe específico
   */
  clearBuffer(symbol: string, timeframe: TF): void {
    const key = `${symbol}:${timeframe}`;
    this.buffers.delete(key);
  }

  /**
   * Limpa todos os buffers
   */
  clearAllBuffers(): void {
    this.buffers.clear();
  }
}

// Exporta uma instância singleton para uso em todo o sistema
export const technicalIndicators = new TechnicalIndicators();
