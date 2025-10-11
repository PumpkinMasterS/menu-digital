import { technicalIndicators, IndicatorValues } from '../indicators/indicators.js';
import { TF } from '../../config/defaults.js';
import { getOrderExecutor } from '../execution/order-executor.js';
import { getPersistenceService } from '../persistence/persistence-service.js';

export interface SignalCondition {
  id: string;
  indicator: string;
  operator: string;
  value: string;
  timeframe: TF;
}

export interface StrategyConfig {
  id: string;
  name: string;
  enabled: boolean;
  symbols: string[];
  conditions: SignalCondition[];
  stopLoss: {
    mode: 'percent' | 'absolute' | 'atrMultiple';
    value: string;
  };
  takeProfit: {
    mode: 'percent' | 'absolute' | 'atrMultiple';
    value: string;
  };
  riskManagement: {
    maxDailyDrawdown: string;
    maxConcurrentSignals: string;
    rrMin: string;
  };
}

export interface SignalResult {
  symbol: string;
  timeframe: TF;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasons: string[];
  timestamp: number;
  strategyId: string;
  strategyName: string;
}

export class SignalEngine {
  private strategies: Map<string, StrategyConfig> = new Map();
  private lastSignals: Map<string, SignalResult> = new Map();

  /**
   * Adiciona ou atualiza uma estratégia
   */
  addOrUpdateStrategy(strategy: StrategyConfig): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Remove uma estratégia
   */
  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  /**
   * Obtém todas as estratégias
   */
  getAllStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Obtém uma estratégia pelo ID
   */
  getStrategy(strategyId: string): StrategyConfig | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Avalia todas as estratégias para um símbolo e timeframe
   */
  evaluateStrategies(symbol: string, timeframe: TF): SignalResult[] {
    const indicators = technicalIndicators.getLatestIndicators(symbol, timeframe);
    if (!indicators) {
      return [];
    }

    const results: SignalResult[] = [];
    const activeStrategies = Array.from(this.strategies.values()).filter(s => s.enabled);

    for (const strategy of activeStrategies) {
      if (strategy.symbols.includes(symbol)) {
        const result = this.evaluateStrategy(strategy, symbol, timeframe, indicators);
        if (result) {
          results.push(result);
          
          // Salva o sinal no Redis
          this.saveSignal(result);
          
          // Executa o sinal automaticamente se o executor de ordens estiver disponível
          this.executeSignal(result);
        }
      }
    }

    return results;
  }

  /**
   * Avalia uma estratégia específica para um símbolo e timeframe
   */
  private evaluateStrategy(strategy: StrategyConfig, symbol: string, timeframe: TF, indicators: IndicatorValues): SignalResult | null {
    const buyConditions: string[] = [];
    const sellConditions: string[] = [];
    const holdConditions: string[] = [];

    // Avalia cada condição da estratégia
    for (const condition of strategy.conditions) {
      if (condition.timeframe !== timeframe) {
        // Pula condições de outros timeframes (poderia ser implementado no futuro)
        continue;
      }

      const conditionResult = this.evaluateCondition(condition, indicators);
      if (conditionResult.signal === 'BUY') {
        buyConditions.push(conditionResult.reason);
      } else if (conditionResult.signal === 'SELL') {
        sellConditions.push(conditionResult.reason);
      } else {
        holdConditions.push(conditionResult.reason);
      }
    }

    // Determina o sinal final baseado nas condições
    let finalSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    const reasons: string[] = [];

    if (buyConditions.length > 0 && sellConditions.length === 0) {
      finalSignal = 'BUY';
      confidence = Math.min(buyConditions.length / strategy.conditions.length, 1);
      reasons.push(...buyConditions);
    } else if (sellConditions.length > 0 && buyConditions.length === 0) {
      finalSignal = 'SELL';
      confidence = Math.min(sellConditions.length / strategy.conditions.length, 1);
      reasons.push(...sellConditions);
    } else {
      finalSignal = 'HOLD';
      confidence = 0.5;
      reasons.push('Conflito de sinais ou condições neutras');
    }

    return {
      symbol,
      timeframe,
      signal: finalSignal,
      confidence,
      reasons,
      timestamp: Date.now(),
      strategyId: strategy.id,
      strategyName: strategy.name
    };
  }

  /**
   * Avalia uma condição individual
   */
  private evaluateCondition(condition: SignalCondition, indicators: IndicatorValues): { signal: 'BUY' | 'SELL' | 'HOLD', reason: string } {
    const { indicator, operator, value } = condition;
    
    // Obtém o valor do indicador
    let indicatorValue: number | undefined;
    let indicatorName = '';
    
    switch (indicator) {
      case 'rsi':
        indicatorValue = indicators.rsi;
        indicatorName = 'RSI';
        break;
      case 'ema_short':
        indicatorValue = indicators.ema?.short;
        indicatorName = 'EMA Curta';
        break;
      case 'ema_long':
        indicatorValue = indicators.ema?.long;
        indicatorName = 'EMA Longa';
        break;
      case 'atr':
        indicatorValue = indicators.atr;
        indicatorName = 'ATR';
        break;
      case 'macd':
        indicatorValue = indicators.macd?.macd;
        indicatorName = 'MACD';
        break;
      case 'macd_signal':
        indicatorValue = indicators.macd?.signal;
        indicatorName = 'MACD Signal';
        break;
      case 'macd_histogram':
        indicatorValue = indicators.macd?.histogram;
        indicatorName = 'MACD Histogram';
        break;
      default:
        return { signal: 'HOLD', reason: `Indicador desconhecido: ${indicator}` };
    }

    if (indicatorValue === undefined) {
      return { signal: 'HOLD', reason: `Valor do indicador ${indicatorName} indisponível` };
    }

    // Converte o valor de comparação para número
    let compareValue: number;
    if (value.startsWith('ema_long') && indicators.ema?.long) {
      compareValue = indicators.ema.long;
    } else if (value.startsWith('ema_short') && indicators.ema?.short) {
      compareValue = indicators.ema.short;
    } else {
      compareValue = parseFloat(value);
      if (isNaN(compareValue)) {
        return { signal: 'HOLD', reason: `Valor de comparação inválido: ${value}` };
      }
    }

    // Avalia a condição
    let conditionMet = false;
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    switch (operator) {
      case 'greater_than':
        conditionMet = indicatorValue > compareValue;
        signalType = indicator === 'rsi' ? 'SELL' : 'BUY'; // RSI alto é sobrecompra (sinal de venda)
        break;
      case 'less_than':
        conditionMet = indicatorValue < compareValue;
        signalType = indicator === 'rsi' ? 'BUY' : 'SELL'; // RSI baixo é sobrevenda (sinal de compra)
        break;
      case 'equals':
        conditionMet = Math.abs(indicatorValue - compareValue) < 0.001;
        signalType = 'HOLD';
        break;
      case 'crosses_above':
        // Simplificação: verifica se está acima (cruzamento precisaria de histórico)
        conditionMet = indicatorValue > compareValue;
        signalType = 'BUY';
        break;
      case 'crosses_below':
        // Simplificação: verifica se está abaixo (cruzamento precisaria de histórico)
        conditionMet = indicatorValue < compareValue;
        signalType = 'SELL';
        break;
      default:
        return { signal: 'HOLD', reason: `Operador desconhecido: ${operator}` };
    }

    if (conditionMet) {
      return {
        signal: signalType,
        reason: `${indicatorName} (${indicatorValue.toFixed(2)}) ${operator.replace('_', ' ')} ${compareValue.toFixed(2)}`
      };
    } else {
      return {
        signal: 'HOLD',
        reason: `${indicatorName} (${indicatorValue.toFixed(2)}) não atende à condição`
      };
    }
  }

  /**
   * Obtém o último sinal para um símbolo/timeframe
   */
  getLastSignal(symbol: string, timeframe: TF): SignalResult | undefined {
    const key = `${symbol}:${timeframe}`;
    return this.lastSignals.get(key);
  }

  /**
   * Armazena o último sinal para um símbolo/timeframe
   */
  setLastSignal(signal: SignalResult): void {
    const key = `${signal.symbol}:${signal.timeframe}`;
    this.lastSignals.set(key, signal);
  }

  /**
   * Calcula stop loss e take profit com base na estratégia
   */
  calculateStopLossAndTakeProfit(
    strategy: StrategyConfig,
    entryPrice: number,
    atr?: number
  ): { stopLoss: number; takeProfit: number } | null {
    if (!atr && (strategy.stopLoss.mode === 'atrMultiple' || strategy.takeProfit.mode === 'atrMultiple')) {
      return null;
    }

    let stopLoss: number;
    let takeProfit: number;

    // Calcula Stop Loss
    switch (strategy.stopLoss.mode) {
      case 'percent':
        const stopLossPercent = parseFloat(strategy.stopLoss.value) / 100;
        stopLoss = entryPrice * (1 - stopLossPercent);
        break;
      case 'absolute':
        stopLoss = entryPrice - parseFloat(strategy.stopLoss.value);
        break;
      case 'atrMultiple':
        if (!atr) return null;
        stopLoss = entryPrice - (parseFloat(strategy.stopLoss.value) * atr);
        break;
      default:
        return null;
    }

    // Calcula Take Profit
    switch (strategy.takeProfit.mode) {
      case 'percent':
        const takeProfitPercent = parseFloat(strategy.takeProfit.value) / 100;
        takeProfit = entryPrice * (1 + takeProfitPercent);
        break;
      case 'absolute':
        takeProfit = entryPrice + parseFloat(strategy.takeProfit.value);
        break;
      case 'atrMultiple':
        if (!atr) return null;
        takeProfit = entryPrice + (parseFloat(strategy.takeProfit.value) * atr);
        break;
      default:
        return null;
    }

    return { stopLoss, takeProfit };
  }

  /**
   * Salva um sinal no Redis
   */
  private async saveSignal(signal: SignalResult): Promise<void> {
    const persistence = getPersistenceService();
    if (!persistence) {
      return;
    }

    try {
      await persistence.saveSignal(signal);
      await persistence.saveLastSignal(signal);
    } catch (error) {
      console.error('Failed to save signal:', error);
    }
  }

  /**
   * Executa um sinal usando o executor de ordens
   */
  private async executeSignal(signal: SignalResult): Promise<void> {
    const executor = getOrderExecutor();
    if (!executor) {
      console.warn('Order executor not available, signal not executed');
      return;
    }

    try {
      await executor.executeSignal(signal);
    } catch (error) {
      console.error('Failed to execute signal:', error);
    }
  }
}

// Exporta uma instância singleton para uso em todo o sistema
export const signalEngine = new SignalEngine();
