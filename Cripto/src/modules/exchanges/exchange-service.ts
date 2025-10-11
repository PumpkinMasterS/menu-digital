import { createBybitConnector, BybitConnector, BybitConnectorOptions } from './bybit-connector.js';
import { TF } from '../../config/defaults.js';

export interface ExchangeServiceOptions {
  symbols: string[];
  timeframes: TF[];
  enableBybit?: boolean;
  bybitCredentials?: {
    apiKey: string;
    apiSecret: string;
    testnet: boolean;
  };
}

export class ExchangeService {
  private options: ExchangeServiceOptions;
  private bybitConnector?: BybitConnector;
  private isRunning = false;

  constructor(options: ExchangeServiceOptions) {
    this.options = options;
  }

  /**
   * Inicia o serviço de exchanges
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Iniciando serviço de exchanges...');
    
    // Inicia o conector Bybit se habilitado
    if (this.options.enableBybit !== false) {
      await this.startBybitConnector();
    }
  }

  /**
   * Para o serviço de exchanges
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('Parando serviço de exchanges...');
    
    // Para o conector Bybit se estiver em execução
    if (this.bybitConnector) {
      this.bybitConnector.stop();
    }
  }

  /**
   * Inicia o conector da Bybit
   */
  private async startBybitConnector(): Promise<void> {
    const connectorOptions: BybitConnectorOptions = {
      credentials: this.options.bybitCredentials,
      symbols: this.options.symbols,
      timeframes: this.options.timeframes,
      onCandle: (symbol, timeframe, candle) => {
        console.log(`Novo candle recebido: ${symbol} ${timeframe} ${new Date(candle.timestamp).toISOString()}`);
      },
      onSignal: (signal) => {
        console.log(`Novo sinal gerado: ${signal.symbol} ${signal.timeframe} ${signal.signal} (${signal.strategyName})`);
      },
      onError: (error) => {
        console.error('Erro no conector Bybit:', error);
      }
    };

    this.bybitConnector = createBybitConnector(connectorOptions);
    
    // Busca dados históricos para preencher os buffers
    for (const symbol of this.options.symbols) {
      for (const timeframe of this.options.timeframes) {
        await this.bybitConnector.fetchHistoricalCandles(symbol, timeframe);
      }
    }
    
    // Inicia o conector para receber dados em tempo real
    this.bybitConnector.start();
  }

  /**
   * Verifica se o serviço está em execução
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Obtém o conector da Bybit
   */
  getBybitConnector(): BybitConnector | undefined {
    return this.bybitConnector;
  }
}

// Instância global do serviço
let exchangeService: ExchangeService | null = null;

/**
 * Inicializa o serviço de exchanges
 */
export function initializeExchangeService(options: ExchangeServiceOptions): ExchangeService {
  if (exchangeService) {
    exchangeService.stop();
  }
  
  exchangeService = new ExchangeService(options);
  return exchangeService;
}

/**
 * Obtém a instância do serviço de exchanges
 */
export function getExchangeService(): ExchangeService | null {
  return exchangeService;
}
