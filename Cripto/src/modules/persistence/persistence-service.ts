import { getRedisClient } from './redis-client.js';
import { CandleData, IndicatorValues } from '../indicators/indicators.js';
import { SignalResult } from '../signals/signal-engine.js';
import { TF } from '../../config/defaults.js';

export interface PersistenceConfig {
  candlesRetentionDays: number;
  indicatorsRetentionDays: number;
  signalsRetentionDays: number;
  maxCandlesPerSymbol: number;
}

export class PersistenceService {
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;
  }

  /**
   * Salva um candle no Redis
   */
  async saveCandle(symbol: string, timeframe: TF, candle: CandleData): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping candle persistence');
      return;
    }

    try {
      const key = `candles:${symbol}:${timeframe}`;
      
      // Adiciona o candle à lista
      await redis.listPush(key, candle);
      
      // Limita o tamanho da lista
      await redis.getClient().ltrim(key, 0, this.config.maxCandlesPerSymbol - 1);
      
      // Define TTL para a lista inteira
      const ttlSeconds = this.config.candlesRetentionDays * 24 * 60 * 60;
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Failed to save candle for ${symbol} ${timeframe}:`, error);
    }
  }

  /**
   * Obtém candles do Redis
   */
  async getCandles(symbol: string, timeframe: TF, limit?: number): Promise<CandleData[]> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, returning empty candles array');
      return [];
    }

    try {
      const key = `candles:${symbol}:${timeframe}`;
      const start = limit ? -limit : 0;
      const stop = -1;
      
      return await redis.listRange<CandleData>(key, start, stop);
    } catch (error) {
      console.error(`Failed to get candles for ${symbol} ${timeframe}:`, error);
      return [];
    }
  }

  /**
   * Salva valores de indicadores no Redis
   */
  async saveIndicators(symbol: string, timeframe: TF, indicators: IndicatorValues): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping indicators persistence');
      return;
    }

    try {
      const key = `indicators:${symbol}:${timeframe}`;
      
      // Salva os indicadores como um hash
      for (const [indicator, value] of Object.entries(indicators)) {
        if (value !== undefined) {
          await redis.hashSet(key, indicator, value);
        }
      }
      
      // Define TTL para o hash
      const ttlSeconds = this.config.indicatorsRetentionDays * 24 * 60 * 60;
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Failed to save indicators for ${symbol} ${timeframe}:`, error);
    }
  }

  /**
   * Obtém valores de indicadores do Redis
   */
  async getIndicators(symbol: string, timeframe: TF): Promise<IndicatorValues | null> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, returning null indicators');
      return null;
    }

    try {
      const key = `indicators:${symbol}:${timeframe}`;
      return await redis.hashGetAll<number>(key);
    } catch (error) {
      console.error(`Failed to get indicators for ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Salva um sinal no Redis
   */
  async saveSignal(signal: SignalResult): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping signal persistence');
      return;
    }

    try {
      const key = `signals:${signal.symbol}:${signal.timeframe}`;
      
      // Adiciona o sinal à lista
      await redis.listPush(key, signal);
      
      // Limita o tamanho da lista (mantém apenas os sinais mais recentes)
      await redis.getClient().ltrim(key, 0, 1000);
      
      // Define TTL para a lista inteira
      const ttlSeconds = this.config.signalsRetentionDays * 24 * 60 * 60;
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Failed to save signal for ${signal.symbol} ${signal.timeframe}:`, error);
    }
  }

  /**
   * Obtém sinais do Redis
   */
  async getSignals(symbol: string, timeframe: TF, limit?: number): Promise<SignalResult[]> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, returning empty signals array');
      return [];
    }

    try {
      const key = `signals:${symbol}:${timeframe}`;
      const start = limit ? -limit : 0;
      const stop = -1;
      
      return await redis.listRange<SignalResult>(key, start, stop);
    } catch (error) {
      console.error(`Failed to get signals for ${symbol} ${timeframe}:`, error);
      return [];
    }
  }

  /**
   * Salva o último sinal para um símbolo/timeframe
   */
  async saveLastSignal(signal: SignalResult): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping last signal persistence');
      return;
    }

    try {
      const key = `last_signal:${signal.symbol}:${signal.timeframe}`;
      await redis.set(key, signal);
      
      // Define TTL
      const ttlSeconds = this.config.signalsRetentionDays * 24 * 60 * 60;
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Failed to save last signal for ${signal.symbol} ${signal.timeframe}:`, error);
    }
  }

  /**
   * Obtém o último sinal para um símbolo/timeframe
   */
  async getLastSignal(symbol: string, timeframe: TF): Promise<SignalResult | null> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, returning null last signal');
      return null;
    }

    try {
      const key = `last_signal:${symbol}:${timeframe}`;
      return await redis.get<SignalResult>(key);
    } catch (error) {
      console.error(`Failed to get last signal for ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Salva o resultado de um backtest
   */
  async saveBacktestResult(id: string, result: any): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping backtest result persistence');
      return;
    }

    try {
      const key = `backtest:${id}`;
      await redis.set(key, result);
      
      // Define TTL (30 dias)
      const ttlSeconds = 30 * 24 * 60 * 60;
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Failed to save backtest result ${id}:`, error);
    }
  }

  /**
   * Obtém o resultado de um backtest
   */
  async getBacktestResult(id: string): Promise<any | null> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, returning null backtest result');
      return null;
    }

    try {
      const key = `backtest:${id}`;
      return await redis.get<any>(key);
    } catch (error) {
      console.error(`Failed to get backtest result ${id}:`, error);
      return null;
    }
  }

  /**
   * Salva estatísticas de trades
   */
  async saveTradeStats(stats: any): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping trade stats persistence');
      return;
    }

    try {
      const key = 'trade_stats';
      
      // Salva as estatísticas como um hash
      for (const [field, value] of Object.entries(stats)) {
        await redis.hashSet(key, field, value);
      }
      
      // Define TTL (7 dias)
      const ttlSeconds = 7 * 24 * 60 * 60;
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error('Failed to save trade stats:', error);
    }
  }

  /**
   * Obtém estatísticas de trades
   */
  async getTradeStats(): Promise<any | null> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, returning null trade stats');
      return null;
    }

    try {
      const key = 'trade_stats';
      return await redis.hashGetAll<any>(key);
    } catch (error) {
      console.error('Failed to get trade stats:', error);
      return null;
    }
  }

  /**
   * Limpa dados antigos
   */
  async cleanupOldData(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('Redis client not available, skipping cleanup');
      return;
    }

    try {
      // Esta é uma implementação simplificada
      // Em um ambiente de produção, você pode querer implementar uma lógica mais sofisticada
      console.log('Cleaning up old data...');
      
      // O Redis já expira automaticamente as chaves com TTL
      // Esta função pode ser expandida para limpar dados específicos se necessário
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Obtém informações sobre o uso de memória
   */
  async getMemoryUsage(): Promise<any> {
    const redis = getRedisClient();
    if (!redis) {
      return null;
    }

    try {
      const client = redis.getClient();
      const info = await client.info('memory');
      
      // Parse the memory info
      const memoryInfo: Record<string, string> = {};
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryInfo[key] = value;
        }
      }
      
      return memoryInfo;
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return null;
    }
  }
}

// Instância singleton
let persistenceService: PersistenceService | null = null;

/**
 * Inicializa o serviço de persistência
 */
export function initializePersistenceService(config: PersistenceConfig): PersistenceService {
  if (persistenceService) {
    return persistenceService;
  }

  persistenceService = new PersistenceService(config);
  return persistenceService;
}

/**
 * Obtém a instância do serviço de persistência
 */
export function getPersistenceService(): PersistenceService | null {
  return persistenceService;
}



