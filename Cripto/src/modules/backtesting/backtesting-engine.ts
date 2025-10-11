import { technicalIndicators, CandleData } from '../indicators/indicators.js';
import { signalEngine, StrategyConfig, SignalResult } from '../signals/signal-engine.js';
import { TF } from '../../config/defaults.js';

export interface BacktestConfig {
  strategy: StrategyConfig;
  symbol: string;
  timeframe: TF;
  startDate: string;
  endDate: string;
  initialBalance: number;
  positionSize: number;
  commission: number; // percentual
  slippage: number; // percentual
}

export interface BacktestTrade {
  timestamp: number;
  symbol: string;
  timeframe: TF;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  commission: number;
  slippage: number;
  balance: number;
  equity: number;
  drawdown: number;
  maxDrawdown: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    avgRR: number;
    calmarRatio: number;
  };
  equity: Array<{ timestamp: number; value: number }>;
}

export class BacktestingEngine {
  /**
   * Executa um backtest completo para uma estratégia
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    console.log(`Iniciando backtest para ${config.symbol} ${config.timeframe}`);
    
    // 1. Busca dados históricos de candles
    const candles = await this.fetchHistoricalCandles(
      config.symbol,
      config.timeframe,
      config.startDate,
      config.endDate
    );
    
    if (candles.length === 0) {
      throw new Error('Nenhum candle encontrado para o período especificado');
    }
    
    console.log(`Carregados ${candles.length} candles para backtest`);
    
    // 2. Prepara o motor de indicadores
    technicalIndicators.clearAllBuffers();
    
    // 3. Adiciona todos os candles ao buffer
    for (const candle of candles) {
      technicalIndicators.addCandle(config.symbol, config.timeframe, candle);
    }
    
    // 4. Configura a estratégia no motor de sinais
    signalEngine.addOrUpdateStrategy(config.strategy);
    
    // 5. Executa o backtest
    const result = await this.executeBacktest(config, candles);
    
    console.log(`Backtest concluído: ${result.trades.length} trades, Retorno: ${result.metrics.totalReturnPercent.toFixed(2)}%`);
    
    return result;
  }

  /**
   * Busca dados históricos de candles da Bybit
   */
  private async fetchHistoricalCandles(
    symbol: string,
    timeframe: TF,
    startDate: string,
    endDate: string
  ): Promise<CandleData[]> {
    try {
      const isTestnet = true; // Por enquanto, usar testnet
      const baseUrl = isTestnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com';
      
      const endpoint = '/v5/market/kline';
      const category = 'linear';
      
      // Calcula o número de candles necessários
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const limit = Math.min(daysDiff * 24 * 60, 200); // Máximo 200 candles por requisição
      
      const params = new URLSearchParams({
        category,
        symbol,
        interval: timeframe,
        start: startDate,
        end: endDate,
        limit: limit.toString()
      });
      
      const url = `${baseUrl}${endpoint}?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical candles: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.retCode !== 0) {
        throw new Error(`API error: ${data.retMsg}`);
      }
      
      if (data.result && data.result.list) {
        // A API retorna os candles em ordem decrescente (mais recente primeiro)
        // Precisamos inverter para ordem crescente
        const candles = data.result.list.reverse();
        
        return candles.map((candle: any[]) => ({
          timestamp: parseInt(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar candles históricos:', error);
      throw error;
    }
  }

  /**
   * Executa a lógica de backtest com os candles carregados
   */
  private async executeBacktest(
    config: BacktestConfig,
    candles: CandleData[]
  ): Promise<BacktestResult> {
    const trades: BacktestTrade[] = [];
    const equity: Array<{ timestamp: number; value: number }> = [];
    
    let balance = config.initialBalance;
    let position = null;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peakBalance = balance;
    
    // Processa cada candle em ordem cronológica
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const timestamp = candle.timestamp;
      
      // Avalia sinais para este candle
      const signals = signalEngine.evaluateStrategies(config.symbol, config.timeframe);
      
      // Processa sinais de BUY e SELL
      for (const signal of signals) {
        if (signal.signal === 'BUY' && !position) {
          // Abre posição long
          position = await this.openPosition(config, candle, 'BUY', balance);
          balance = position.balance;
        } else if (signal.signal === 'SELL' && position && position.type === 'BUY') {
          // Fecha posição long
          const closedPosition = await this.closePosition(config, candle, position, balance);
          trades.push(closedPosition.trade);
          balance = closedPosition.balance;
          position = null;
        } else if (signal.signal === 'SELL' && !position) {
          // Abre posição short
          position = await this.openPosition(config, candle, 'SELL', balance);
          balance = position.balance;
        } else if (signal.signal === 'BUY' && position && position.type === 'SELL') {
          // Fecha posição short
          const closedPosition = await this.closePosition(config, candle, position, balance);
          trades.push(closedPosition.trade);
          balance = closedPosition.balance;
          position = null;
        }
      }
      
      // Atualiza equity (inclui PnL não realizado de posições abertas)
      let currentEquity = balance;
      if (position) {
        const unrealizedPnl = this.calculateUnrealizedPnl(position, candle.close);
        currentEquity += unrealizedPnl;
      }
      
      equity.push({ timestamp, value: currentEquity });
      
      // Calcula drawdown
      if (currentEquity > peakBalance) {
        peakBalance = currentEquity;
      }
      
      const drawdown = peakBalance - currentEquity;
      const drawdownPercent = (drawdown / peakBalance) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
      
      if (drawdownPercent > maxDrawdownPercent) {
        maxDrawdownPercent = drawdownPercent;
      }
    }
    
    // Fecha qualquer posição restante no último candle
    if (position) {
      const lastCandle = candles[candles.length - 1];
      const closedPosition = await this.closePosition(config, lastCandle, position, balance);
      trades.push(closedPosition.trade);
      balance = closedPosition.balance;
    }
    
    // Calcula métricas finais
    const metrics = this.calculateMetrics(trades, config.initialBalance, maxDrawdown, maxDrawdownPercent);
    
    return {
      config,
      trades,
      metrics,
      equity
    };
  }

  /**
   * Abre uma nova posição
   */
  private async openPosition(
    config: BacktestConfig,
    candle: CandleData,
    type: 'BUY' | 'SELL',
    balance: number
  ): Promise<{
    type: 'BUY' | 'SELL';
    entryPrice: number;
    quantity: number;
    balance: number;
  }> {
    const price = type === 'BUY' ? candle.close : candle.close;
    const commission = config.positionSize * (config.commission / 100);
    const slippage = config.positionSize * (config.slippage / 100);
    const totalCost = config.positionSize + commission + slippage;
    
    if (balance < totalCost) {
      throw new Error('Saldo insuficiente para abrir posição');
    }
    
    const quantity = config.positionSize / price;
    const newBalance = balance - totalCost;
    
    return {
      type,
      entryPrice: price,
      quantity,
      balance: newBalance
    };
  }

  /**
   * Fecha uma posição existente
   */
  private async closePosition(
    config: BacktestConfig,
    candle: CandleData,
    position: any,
    balance: number
  ): Promise<{
    trade: BacktestTrade;
    balance: number;
  }> {
    const price = position.type === 'BUY' ? candle.close : candle.close;
    const commission = position.quantity * price * (config.commission / 100);
    const slippage = position.quantity * price * (config.slippage / 100);
    
    let pnl = 0;
    if (position.type === 'BUY') {
      pnl = (price - position.entryPrice) * position.quantity;
    } else {
      pnl = (position.entryPrice - price) * position.quantity;
    }
    
    const totalValue = position.quantity * price;
    const totalCost = commission + slippage;
    const netPnl = pnl - totalCost;
    
    const newBalance = balance + totalValue + netPnl;
    
    const trade: BacktestTrade = {
      timestamp: candle.timestamp,
      symbol: config.symbol,
      timeframe: config.timeframe,
      type: position.type === 'BUY' ? 'SELL' : 'BUY', // Operação inversa para fechar
      price,
      quantity: position.quantity,
      commission,
      slippage,
      balance: newBalance,
      equity: newBalance,
      drawdown: 0, // Calculado posteriormente
      maxDrawdown: 0 // Calculado posteriormente
    };
    
    return {
      trade,
      balance: newBalance
    };
  }

  /**
   * Calcula PnL não realizado de uma posição aberta
   */
  private calculateUnrealizedPnl(position: any, currentPrice: number): number {
    if (position.type === 'BUY') {
      return (currentPrice - position.entryPrice) * position.quantity;
    } else {
      return (position.entryPrice - currentPrice) * position.quantity;
    }
  }

  /**
   * Calcula métricas de desempenho do backtest
   */
  private calculateMetrics(
    trades: BacktestTrade[],
    initialBalance: number,
    maxDrawdown: number,
    maxDrawdownPercent: number
  ): BacktestResult['metrics'] {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.balance > initialBalance).length;
    const losingTrades = trades.filter(t => t.balance < initialBalance).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const finalBalance = trades.length > 0 ? trades[trades.length - 1].balance : initialBalance;
    const totalReturn = finalBalance - initialBalance;
    const totalReturnPercent = (totalReturn / initialBalance) * 100;
    
    const wins = trades.filter(t => {
      const pnl = t.balance - (t.trade.commission + t.trade.slippage);
      return pnl > 0;
    });
    
    const losses = trades.filter(t => {
      const pnl = t.balance - (t.trade.commission + t.trade.slippage);
      return pnl < 0;
    });
    
    const totalWins = wins.reduce((sum, t) => {
      const pnl = t.balance - (t.trade.commission + t.trade.slippage);
      return sum + pnl;
    }, 0);
    
    const totalLosses = Math.abs(losses.reduce((sum, t) => {
      const pnl = t.balance - (t.trade.commission + t.trade.slippage);
      return sum + pnl;
    }, 0));
    
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    // Cálculo simplificado do Sharpe Ratio (assumindo risk-free rate de 0)
    const returns = trades.map(t => {
      const pnl = t.balance - (t.trade.commission + t.trade.slippage);
      return pnl / initialBalance;
    });
    
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnStdDev = Math.sqrt(
      returns.length > 0 
        ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length 
        : 0
    );
    
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Cálculo do Calmar Ratio
    const calmarRatio = maxDrawdownPercent > 0 ? totalReturnPercent / Math.abs(maxDrawdownPercent) : 0;
    
    // Cálculo do R:R médio (simplificado)
    const avgRR = profitFactor > 0 ? profitFactor : 0;
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalReturn,
      totalReturnPercent,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      profitFactor,
      avgWin,
      avgLoss,
      avgRR,
      calmarRatio
    };
  }
}

// Exporta uma instância singleton para uso em todo o sistema
export const backtestingEngine = new BacktestingEngine();

