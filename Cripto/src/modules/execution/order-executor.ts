import { getRedisClient } from '../persistence/redis-client.js';
import { getPersistenceService } from '../persistence/persistence-service.js';
import { SignalResult } from '../signals/signal-engine.js';

export interface OrderRequest {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'Day';
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
  orderLinkId?: string;
  takeProfit?: number;
  stopLoss?: number;
  trailingStop?: number;
}

export interface OrderResponse {
  orderId: string;
  orderLinkId?: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  orderStatus: 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected' | 'PartiallyFilledCanceled';
  orderPrice?: string;
  orderQty: string;
  leavesQty: string;
  cumExecQty: string;
  cumExecValue: string;
  avgPrice?: string;
  timeInForce?: string;
  orderCreatedTime: string;
  orderUpdatedTime: string;
  takeProfit?: number;
  stopLoss?: number;
  trailingStop?: number;
}

export interface Position {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number;
  positionValue: number;
  entryPrice: number;
  markPrice: number;
  unrealisedPnl: number;
  percentage: number;
  leverage: string;
  positionMargin: number;
  liqPrice?: number;
  bustPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  trailingStop?: number;
  createdTime: string;
  updatedTime: string;
  tpslMode: 'Full' | 'Partial';
  tpOrderType?: string;
  slOrderType?: string;
  tpLimitPrice?: string;
  slLimitPrice?: string;
  tpTriggerBy?: string;
  slTriggerBy?: string;
  triggerDirection?: number;
  isReduceOnly: boolean;
  autoAddMargin: number;
  leverageSysUpdatedTime: string;
  riskId: number;
  riskLimitValue: number;
  trailingStop: number;
}

export interface WalletBalance {
  accountType: string;
  accountLTV: string;
  accountIMRate: string;
  accountMMR: string;
  totalEquity: string;
  accountTypeMMR: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  totalAvailableBalance: string;
  totalPerpUPL: string;
  totalWalletBalance: string;
  accountInfo: {
    [key: string]: {
      coin: string;
      equity: string;
      usdValue: string;
      spotBalance: string;
      availableToBorrow: string;
      bonus: string;
      accruedInterest: string;
      availableToWithdraw: string;
      totalOrderIM: string;
      totalPositionIM: string;
      totalPositionMM: string;
      unclearedInsuranceFund: string;
      walletBalance: string;
      collateralSwitch: boolean;
      collateralMargin: string;
      cumRealisedPnl: string;
      cashBalance: string;
    };
  };
  coin: Array<{
    availableToBorrow: string;
    bonus: string;
    accruedInterest: string;
    availableToWithdraw: string;
    totalOrderIM: string;
    equity: string;
    totalPositionMM: string;
    usdValue: string;
    unrealisedPnl: string;
    collateralSwitch: boolean;
    borrowAmount: string;
    totalPositionIM: string;
    totalInitialMargin: string;
    walletBalance: string;
    cumRealisedPnl: string;
    collateralMargin: string;
    spotBalance: string;
    coin: string;
  }>;
}

export interface ExecutionConfig {
  enableBybit: boolean;
  enableBinance: boolean;
  enablePaperTrading: boolean;
  paperTradingBalance: number;
  maxPositionSize: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  defaultLeverage: number;
  commissionRate: number;
  slippageRate: number;
}

export class OrderExecutor {
  private config: ExecutionConfig;
  private isRunning = false;
  private dailyPnl = 0;
  private openPositions = new Map<string, Position>();
  private dailyTrades = 0;
  private lastResetDate = new Date().toDateString();

  constructor(config: ExecutionConfig) {
    this.config = config;
  }

  /**
   * Inicia o serviço de execução de ordens
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Order executor already running');
      return;
    }

    console.log('Starting order executor...');
    this.isRunning = true;

    // Reseta contadores diários se necessário
    this.resetDailyCounters();

    // Carrega posições abertas existentes
    await this.loadOpenPositions();

    console.log('Order executor started');
  }

  /**
   * Para o serviço de execução de ordens
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Order executor not running');
      return;
    }

    console.log('Stopping order executor...');
    this.isRunning = false;
    console.log('Order executor stopped');
  }

  /**
   * Executa uma ordem baseada em um sinal
   */
  async executeSignal(signal: SignalResult): Promise<OrderResponse | null> {
    if (!this.isRunning) {
      console.warn('Order executor not running, ignoring signal');
      return null;
    }

    // Reseta contadores diários se necessário
    this.resetDailyCounters();

    // Verifica limites de risco
    if (!this.checkRiskLimits(signal)) {
      console.warn(`Signal rejected due to risk limits: ${signal.signal} ${signal.symbol}`);
      return null;
    }

    try {
      // Determina o tamanho da posição
      const positionSize = this.calculatePositionSize(signal);
      
      // Cria a requisição de ordem
      const orderRequest: OrderRequest = {
        id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        symbol: signal.symbol,
        side: signal.signal === 'BUY' ? 'Buy' : 'Sell',
        orderType: 'Market', // Por enquanto, apenas ordens de mercado
        quantity: positionSize,
        orderLinkId: signal.strategyId,
        takeProfit: signal.takeProfit,
        stopLoss: signal.stopLoss
      };

      // Executa a ordem
      let orderResponse: OrderResponse | null = null;

      if (this.config.enablePaperTrading) {
        orderResponse = await this.executePaperOrder(orderRequest, signal);
      } else if (this.config.enableBybit) {
        orderResponse = await this.executeBybitOrder(orderRequest);
      } else if (this.config.enableBinance) {
        orderResponse = await this.executeBinanceOrder(orderRequest);
      }

      if (orderResponse) {
        // Atualiza estatísticas
        this.updateStatistics(orderResponse);
        
        // Salva a ordem no Redis
        await this.saveOrder(orderResponse, signal);
        
        // Atualiza posições
        await this.updatePositions();
        
        console.log(`Order executed: ${orderResponse.side} ${orderResponse.symbol} ${orderResponse.orderQty}`);
      }

      return orderResponse;
    } catch (error) {
      console.error(`Failed to execute signal: ${signal.signal} ${signal.symbol}`, error);
      return null;
    }
  }

  /**
   * Executa uma ordem no modo paper trading
   */
  private async executePaperOrder(orderRequest: OrderRequest, signal: SignalResult): Promise<OrderResponse> {
    // Simula uma ordem de mercado com slippage
    const slippage = this.config.slippageRate / 100;
    const priceAdjustment = orderRequest.side === 'Buy' ? (1 + slippage) : (1 - slippage);
    
    // Obtém o preço atual (simulado)
    const currentPrice = await this.getCurrentPrice(orderRequest.symbol);
    const executionPrice = currentPrice * priceAdjustment;
    
    // Calcula comissão
    const commission = orderRequest.quantity * executionPrice * (this.config.commissionRate / 100);
    
    // Cria a resposta da ordem
    const orderResponse: OrderResponse = {
      orderId: orderRequest.id,
      orderLinkId: orderRequest.orderLinkId,
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      orderType: orderRequest.orderType,
      orderStatus: 'Filled',
      orderPrice: executionPrice.toString(),
      orderQty: orderRequest.quantity.toString(),
      leavesQty: '0',
      cumExecQty: orderRequest.quantity.toString(),
      cumExecValue: (orderRequest.quantity * executionPrice).toString(),
      avgPrice: executionPrice.toString(),
      timeInForce: 'IOC',
      orderCreatedTime: new Date().toISOString(),
      orderUpdatedTime: new Date().toISOString(),
      takeProfit: orderRequest.takeProfit,
      stopLoss: orderRequest.stopLoss
    };

    // Atualiza o PnL diário
    const pnl = orderRequest.side === 'Buy' 
      ? (currentPrice - executionPrice) * orderRequest.quantity - commission
      : (executionPrice - currentPrice) * orderRequest.quantity - commission;
    
    this.dailyPnl += pnl;
    this.dailyTrades++;

    return orderResponse;
  }

  /**
   * Executa uma ordem na Bybit
   */
  private async executeBybitOrder(orderRequest: OrderRequest): Promise<OrderResponse | null> {
    try {
      // Obtém credenciais da Bybit
      const bybitCreds = {
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || '',
        testnet: process.env.BYBIT_TESTNET === 'true'
      };

      if (!bybitCreds.apiKey || !bybitCreds.apiSecret) {
        throw new Error('Bybit credentials not configured');
      }

      const baseUrl = bybitCreds.testnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com';

      const endpoint = '/v5/order/create';
      const url = `${baseUrl}${endpoint}`;

      // Prepara o corpo da requisição
      const body = {
        category: 'linear',
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        orderType: orderRequest.orderType,
        qty: orderRequest.quantity.toString(),
        orderLinkId: orderRequest.orderLinkId,
        timeInForce: orderRequest.timeInForce || 'IOC'
      };

      if (orderRequest.price) {
        body.price = orderRequest.price.toString();
      }

      if (orderRequest.stopPrice) {
        body.triggerPrice = orderRequest.stopPrice.toString();
      }

      if (orderRequest.takeProfit) {
        body.takeProfit = orderRequest.takeProfit.toString();
      }

      if (orderRequest.stopLoss) {
        body.stopLoss = orderRequest.stopLoss.toString();
      }

      // Gera assinatura
      const timestamp = Date.now().toString();
      const recvWindow = '5000';
      const queryString = `${timestamp}${bybitCreds.apiKey}${recvWindow}`;
      const signature = this.generateSignature(queryString, bybitCreds.apiSecret);

      // Faz a requisição
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': bybitCreds.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`Bybit API error: ${data.retMsg}`);
      }

      // Converte a resposta para o formato OrderResponse
      const result = data.result;
      const orderResponse: OrderResponse = {
        orderId: result.orderId,
        orderLinkId: result.orderLinkId,
        symbol: result.symbol,
        side: result.side,
        orderType: result.orderType,
        orderStatus: result.orderStatus,
        orderPrice: result.price,
        orderQty: result.qty,
        leavesQty: result.leavesQty,
        cumExecQty: result.cumExecQty,
        cumExecValue: result.cumExecValue,
        avgPrice: result.avgPrice,
        timeInForce: result.timeInForce,
        orderCreatedTime: result.createdTime,
        orderUpdatedTime: result.updatedTime,
        takeProfit: orderRequest.takeProfit,
        stopLoss: orderRequest.stopLoss
      };

      return orderResponse;
    } catch (error) {
      console.error('Failed to execute Bybit order:', error);
      return null;
    }
  }

  /**
   * Executa uma ordem na Binance
   */
  private async executeBinanceOrder(orderRequest: OrderRequest): Promise<OrderResponse | null> {
    // Implementação futura para Binance
    console.warn('Binance integration not implemented yet');
    return null;
  }

  /**
   * Obtém o preço atual de um símbolo
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Tenta obter do cache primeiro
      const redis = getRedisClient();
      if (redis) {
        const cachedPrice = await redis.get<number>(`price:${symbol}`);
        if (cachedPrice) {
          return cachedPrice;
        }
      }

      // Se não estiver no cache, busca da API
      const isTestnet = process.env.BYBIT_TESTNET === 'true';
      const baseUrl = isTestnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com';

      const endpoint = '/v5/market/tickers';
      const params = new URLSearchParams({
        category: 'linear',
        symbol
      });

      const url = `${baseUrl}${endpoint}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`API error: ${data.retMsg}`);
      }

      if (data.result && data.result.list && data.result.list.length > 0) {
        const ticker = data.result.list[0];
        const price = parseFloat(ticker.lastPrice);
        
        // Salva no cache por 5 segundos
        if (redis) {
          await redis.set(`price:${symbol}`, price, 5);
        }
        
        return price;
      }

      throw new Error('No price data available');
    } catch (error) {
      console.error(`Failed to get current price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Calcula o tamanho da posição baseado no risco
   */
  private calculatePositionSize(signal: SignalResult): number {
    // Implementação simples - pode ser expandida com gestão de risco mais sofisticada
    const baseSize = 100; // Tamanho base em USD
    
    // Ajusta baseado no risco
    const riskMultiplier = signal.confidence / 100;
    
    // Limita ao tamanho máximo
    const maxSize = this.config.maxPositionSize;
    
    return Math.min(baseSize * riskMultiplier, maxSize);
  }

  /**
   * Verifica os limites de risco
   */
  private checkRiskLimits(signal: SignalResult): boolean {
    // Verifica perda diária máxima
    if (this.dailyPnl < -this.config.maxDailyLoss) {
      console.warn(`Daily loss limit exceeded: ${this.dailyPnl} < -${this.config.maxDailyLoss}`);
      return false;
    }

    // Verifica número máximo de posições abertas
    if (this.openPositions.size >= this.config.maxOpenPositions) {
      console.warn(`Maximum open positions exceeded: ${this.openPositions.size} >= ${this.config.maxOpenPositions}`);
      return false;
    }

    // Verifica se já existe uma posição para este símbolo
    const existingPosition = this.openPositions.get(signal.symbol);
    if (existingPosition) {
      // Se já existe uma posição, só permite se for na direção oposta
      const isOppositeDirection = 
        (existingPosition.side === 'Buy' && signal.signal === 'SELL') ||
        (existingPosition.side === 'Sell' && signal.signal === 'BUY');
      
      if (!isOppositeDirection) {
        console.warn(`Position already exists for ${signal.symbol} in the same direction`);
        return false;
      }
    }

    return true;
  }

  /**
   * Atualiza estatísticas após uma ordem
   */
  private updateStatistics(orderResponse: OrderResponse): void {
    // Atualiza o número de trades diários
    this.dailyTrades++;

    // Salva estatísticas no Redis
    const redis = getRedisClient();
    if (redis) {
      redis.incr('daily_trades');
      redis.incr('total_trades');
    }
  }

  /**
   * Salva uma ordem no Redis
   */
  private async saveOrder(orderResponse: OrderResponse, signal: SignalResult): Promise<void> {
    const persistence = getPersistenceService();
    if (!persistence) {
      return;
    }

    try {
      const orderData = {
        ...orderResponse,
        signal: {
          signal: signal.signal,
          confidence: signal.confidence,
          reason: signal.reason,
          strategyId: signal.strategyId,
          timestamp: signal.timestamp
        }
      };

      await persistence.listPush('orders', orderData);
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  }

  /**
   * Carrega posições abertas existentes
   */
  private async loadOpenPositions(): Promise<void> {
    if (!this.config.enableBybit && !this.config.enableBinance) {
      return;
    }

    try {
      let positions: Position[] = [];

      if (this.config.enableBybit) {
        positions = await this.getBybitPositions();
      } else if (this.config.enableBinance) {
        positions = await this.getBinancePositions();
      }

      // Atualiza o mapa de posições
      this.openPositions.clear();
      for (const position of positions) {
        if (parseFloat(position.size) !== 0) {
          this.openPositions.set(position.symbol, position);
        }
      }

      console.log(`Loaded ${this.openPositions.size} open positions`);
    } catch (error) {
      console.error('Failed to load open positions:', error);
    }
  }

  /**
   * Obtém posições da Bybit
   */
  private async getBybitPositions(): Promise<Position[]> {
    try {
      const bybitCreds = {
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || '',
        testnet: process.env.BYBIT_TESTNET === 'true'
      };

      if (!bybitCreds.apiKey || !bybitCreds.apiSecret) {
        return [];
      }

      const baseUrl = bybitCreds.testnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com';

      const endpoint = '/v5/position/list';
      const url = `${baseUrl}${endpoint}?category=linear`;

      // Gera assinatura
      const timestamp = Date.now().toString();
      const recvWindow = '5000';
      const queryString = `${timestamp}${bybitCreds.apiKey}${recvWindow}`;
      const signature = this.generateSignature(queryString, bybitCreds.apiSecret);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': bybitCreds.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`API error: ${data.retMsg}`);
      }

      return data.result.list || [];
    } catch (error) {
      console.error('Failed to get Bybit positions:', error);
      return [];
    }
  }

  /**
   * Obtém posições da Binance
   */
  private async getBinancePositions(): Promise<Position[]> {
    // Implementação futura para Binance
    return [];
  }

  /**
   * Atualiza as posições
   */
  private async updatePositions(): Promise<void> {
    if (!this.config.enableBybit && !this.config.enableBinance) {
      return;
    }

    try {
      await this.loadOpenPositions();
    } catch (error) {
      console.error('Failed to update positions:', error);
    }
  }

  /**
   * Reseta contadores diários
   */
  private resetDailyCounters(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyPnl = 0;
      this.dailyTrades = 0;
      this.lastResetDate = today;
      console.log('Daily counters reset');
    }
  }

  /**
   * Gera assinatura para API da Bybit
   */
  private generateSignature(queryString: string, apiSecret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
  }

  /**
   * Obtém posições abertas
   */
  getOpenPositions(): Map<string, Position> {
    return new Map(this.openPositions);
  }

  /**
   * Obtém estatísticas diárias
   */
  getDailyStats(): { pnl: number; trades: number } {
    this.resetDailyCounters();
    return {
      pnl: this.dailyPnl,
      trades: this.dailyTrades
    };
  }

  /**
   * Obtém o saldo da carteira
   */
  async getWalletBalance(): Promise<WalletBalance | null> {
    if (!this.config.enableBybit && !this.config.enableBinance) {
      return null;
    }

    try {
      if (this.config.enableBybit) {
        return await this.getBybitWalletBalance();
      } else if (this.config.enableBinance) {
        return await this.getBinanceWalletBalance();
      }
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
    }

    return null;
  }

  /**
   * Obtém saldo da carteira da Bybit
   */
  private async getBybitWalletBalance(): Promise<WalletBalance | null> {
    try {
      const bybitCreds = {
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || '',
        testnet: process.env.BYBIT_TESTNET === 'true'
      };

      if (!bybitCreds.apiKey || !bybitCreds.apiSecret) {
        return null;
      }

      const baseUrl = bybitCreds.testnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com';

      const endpoint = '/v5/account/wallet-balance';
      const url = `${baseUrl}${endpoint}?accountType=UNIFIED`;

      // Gera assinatura
      const timestamp = Date.now().toString();
      const recvWindow = '5000';
      const queryString = `${timestamp}${bybitCreds.apiKey}${recvWindow}`;
      const signature = this.generateSignature(queryString, bybitCreds.apiSecret);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': bybitCreds.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wallet balance: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`API error: ${data.retMsg}`);
      }

      return data.result.list[0] || null;
    } catch (error) {
      console.error('Failed to get Bybit wallet balance:', error);
      return null;
    }
  }

  /**
   * Obtém saldo da carteira da Binance
   */
  private async getBinanceWalletBalance(): Promise<WalletBalance | null> {
    // Implementação futura para Binance
    return null;
  }
}

// Instância singleton
let orderExecutor: OrderExecutor | null = null;

/**
 * Inicializa o executor de ordens
 */
export function initializeOrderExecutor(config: ExecutionConfig): OrderExecutor {
  if (orderExecutor) {
    return orderExecutor;
  }

  orderExecutor = new OrderExecutor(config);
  return orderExecutor;
}

/**
 * Obtém a instância do executor de ordens
 */
export function getOrderExecutor(): OrderExecutor | null {
  return orderExecutor;
}



