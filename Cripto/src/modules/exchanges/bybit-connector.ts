import WebSocket from 'ws';
import { technicalIndicators, CandleData } from '../indicators/indicators.js';
import { signalEngine } from '../signals/signal-engine.js';
import { TF } from '../../config/defaults.js';

export interface BybitCredentials {
  apiKey: string;
  apiSecret: string;
  testnet: boolean;
}

export interface BybitConnectorOptions {
  credentials?: BybitCredentials;
  symbols: string[];
  timeframes: TF[];
  onCandle?: (symbol: string, timeframe: TF, candle: CandleData) => void;
  onSignal?: (signal: any) => void;
  onError?: (error: Error) => void;
}

export class BybitConnector {
  private options: BybitConnectorOptions;
  private wsConnections: Map<string, WebSocket> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(options: BybitConnectorOptions) {
    this.options = options;
  }

  /**
   * Inicia as conexões WebSocket para todos os símbolos e timeframes
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Iniciando conector Bybit...');
    
    // Para cada símbolo e timeframe, cria uma conexão WebSocket
    for (const symbol of this.options.symbols) {
      for (const timeframe of this.options.timeframes) {
        this.connectWebSocket(symbol, timeframe);
      }
    }
  }

  /**
   * Para todas as conexões WebSocket
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('Parando conector Bybit...');
    
    // Fecha todas as conexões
    for (const [key, ws] of this.wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    
    // Limpa todos os intervalos de reconexão
    for (const [key, interval] of this.reconnectIntervals) {
      clearInterval(interval);
    }
    
    this.wsConnections.clear();
    this.reconnectIntervals.clear();
  }

  /**
   * Cria uma conexão WebSocket para um símbolo e timeframe específicos
   */
  private connectWebSocket(symbol: string, timeframe: TF): void {
    const key = `${symbol}:${timeframe}`;
    
    // Se já existe uma conexão, não cria outra
    if (this.wsConnections.has(key)) {
      return;
    }
    
    const isTestnet = this.options.credentials?.testnet ?? true;
    const wsUrl = isTestnet 
      ? 'wss://stream-testnet.bybit.com/v5/public/linear'
      : 'wss://stream.bybit.com/v5/public/linear';
    
    console.log(`Conectando ao WebSocket para ${symbol} ${timeframe}...`);
    
    const ws = new WebSocket(wsUrl);
    this.wsConnections.set(key, ws);
    
    ws.on('open', () => {
      console.log(`Conectado ao WebSocket para ${symbol} ${timeframe}`);
      
      // Inscreve-se aos dados do símbolo
      const subscribeMsg = {
        op: 'subscribe',
        args: [`kline.${timeframe}.${symbol}`]
      };
      
      ws.send(JSON.stringify(subscribeMsg));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Verifica se é uma mensagem de candle (kline)
        if (message.topic && message.topic.startsWith('kline.') && message.data) {
          const candleData = message.data;
          
          // Converte para o formato CandleData
          const candle: CandleData = {
            timestamp: candleData.start,
            open: parseFloat(candleData.open),
            high: parseFloat(candleData.high),
            low: parseFloat(candleData.low),
            close: parseFloat(candleData.close),
            volume: parseFloat(candleData.volume)
          };
          
          // Adiciona o candle ao motor de indicadores
          const indicators = technicalIndicators.addCandle(symbol, timeframe, candle);
          
          // Notifica o callback de candle, se fornecido
          if (this.options.onCandle) {
            this.options.onCandle(symbol, timeframe, candle);
          }
          
          // Avalia estratégias para gerar sinais
          const signals = signalEngine.evaluateStrategies(symbol, timeframe);
          
          // Notifica o callback de sinal, se fornecido e houver sinais
          if (this.options.onSignal && signals.length > 0) {
            signals.forEach(signal => {
              this.options.onSignal!(signal);
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao processar mensagem do WebSocket para ${symbol} ${timeframe}:`, error);
        if (this.options.onError) {
          this.options.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error(`Erro na conexão WebSocket para ${symbol} ${timeframe}:`, error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`Conexão WebSocket fechada para ${symbol} ${timeframe}: ${code} ${reason}`);
      this.wsConnections.delete(key);
      
      // Se o conector ainda estiver em execução, tenta reconectar
      if (this.isRunning) {
        this.scheduleReconnect(symbol, timeframe);
      }
    });
  }

  /**
   * Agenda uma reconexão para um símbolo e timeframe específicos
   */
  private scheduleReconnect(symbol: string, timeframe: TF): void {
    const key = `${symbol}:${timeframe}`;
    
    // Se já existe um intervalo de reconexão, não cria outro
    if (this.reconnectIntervals.has(key)) {
      return;
    }
    
    console.log(`Agendando reconexão para ${symbol} ${timeframe} em 5 segundos...`);
    
    const interval = setTimeout(() => {
      this.reconnectIntervals.delete(key);
      
      // Se o conector ainda estiver em execução, tenta reconectar
      if (this.isRunning) {
        this.connectWebSocket(symbol, timeframe);
      }
    }, 5000);
    
    this.reconnectIntervals.set(key, interval);
  }

  /**
   * Busca dados históricos de candles para preencher o buffer
   */
  async fetchHistoricalCandles(symbol: string, timeframe: TF, limit: number = 200): Promise<void> {
    try {
      const isTestnet = this.options.credentials?.testnet ?? true;
      const baseUrl = isTestnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com';
      
      const endpoint = '/v5/market/kline';
      const category = 'linear';
      const params = new URLSearchParams({
        category,
        symbol,
        interval: timeframe,
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
        // Precisamos inverter para adicionar em ordem crescente
        const candles = data.result.list.reverse();
        
        for (const candle of candles) {
          const candleData: CandleData = {
            timestamp: parseInt(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          };
          
          // Adiciona o candle ao motor de indicadores
          technicalIndicators.addCandle(symbol, timeframe, candleData);
        }
        
        console.log(`Carregados ${candles.length} candles históricos para ${symbol} ${timeframe}`);
      }
    } catch (error) {
      console.error(`Erro ao buscar candles históricos para ${symbol} ${timeframe}:`, error);
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

// Exporta uma função para criar uma instância do conector
export function createBybitConnector(options: BybitConnectorOptions): BybitConnector {
  return new BybitConnector(options);
}
