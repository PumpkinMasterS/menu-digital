import { FastifyPluginAsync } from 'fastify';
import { backtestingEngine, BacktestConfig, BacktestResult } from './backtesting-engine.js';
import { TF } from '../../config/defaults.js';

const backtestingPlugin: FastifyPluginAsync = async (fastify) => {
  // Endpoint para executar um backtest
  fastify.post('/backtesting/run', async (request, reply) => {
    const config = request.body as BacktestConfig;
    
    try {
      // Validação básica
      if (!config.strategy || !config.symbol || !config.timeframe || !config.startDate || !config.endDate) {
        reply.code(400);
        return { ok: false, error: 'Configuração incompleta para backtest' };
      }
      
      if (config.initialBalance <= 0 || config.positionSize <= 0) {
        reply.code(400);
        return { ok: false, error: 'Balance e position size devem ser maiores que zero' };
      }
      
      // Executa o backtest
      const result = await backtestingEngine.runBacktest(config);
      
      return { ok: true, data: result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Endpoint para obter resultados de backtests anteriores (mockado por enquanto)
  fastify.get('/backtesting/results', async (request, reply) => {
    try {
      // Por enquanto, retorna uma lista vazia
      // Em uma implementação completa, buscaria do banco de dados
      return { ok: true, data: [] };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch backtest results' };
    }
  });

  // Endpoint para obter configurações de exemplo
  fastify.get('/backtesting/examples', async (request, reply) => {
    try {
      const examples = [
        {
          name: 'Estratégia RSI Simples',
          config: {
            strategy: {
              id: 'rsi-example',
              name: 'RSI Oversold/Bought',
              enabled: true,
              symbols: ['BTCUSDT'],
              conditions: [
                {
                  id: '1',
                  indicator: 'rsi',
                  operator: 'less_than',
                  value: '30',
                  timeframe: '1h'
                }
              ],
              stopLoss: {
                mode: 'percent',
                value: '2'
              },
              takeProfit: {
                mode: 'percent',
                value: '4'
              },
              riskManagement: {
                maxDailyDrawdown: '5',
                maxConcurrentSignals: '1',
                rrMin: '1.5'
              }
            },
            symbol: 'BTCUSDT',
            timeframe: '1h',
            startDate: '2023-09-01T00:00:00Z',
            endDate: '2023-10-01T00:00:00Z',
            initialBalance: 10000,
            positionSize: 1000,
            commission: 0.1,
            slippage: 0.05
          }
        },
        {
          name: 'Estratégia de Cruzamento EMA',
          config: {
            strategy: {
              id: 'ema-crossover',
              name: 'EMA 50/200 Crossover',
              enabled: true,
              symbols: ['ETHUSDT'],
              conditions: [
                {
                  id: '1',
                  indicator: 'ema_short',
                  operator: 'crosses_above',
                  value: 'ema_long',
                  timeframe: '4h'
                }
              ],
              stopLoss: {
                mode: 'atrMultiple',
                value: '1.5'
              },
              takeProfit: {
                mode: 'atrMultiple',
                value: '3'
              },
              riskManagement: {
                maxDailyDrawdown: '3',
                maxConcurrentSignals: '1',
                rrMin: '2'
              }
            },
            symbol: 'ETHUSDT',
            timeframe: '4h',
            startDate: '2023-08-01T00:00:00Z',
            endDate: '2023-10-01T00:00:00Z',
            initialBalance: 15000,
            positionSize: 1500,
            commission: 0.1,
            slippage: 0.05
          }
        },
        {
          name: 'Estratégia MACD',
          config: {
            strategy: {
              id: 'macd-strategy',
              name: 'MACD Signal Cross',
              enabled: true,
              symbols: ['SOLUSDT'],
              conditions: [
                {
                  id: '1',
                  indicator: 'macd',
                  operator: 'crosses_above',
                  value: 'macd_signal',
                  timeframe: '1h'
                }
              ],
              stopLoss: {
                mode: 'percent',
                value: '1.5'
              },
              takeProfit: {
                mode: 'percent',
                value: '3'
              },
              riskManagement: {
                maxDailyDrawdown: '4',
                maxConcurrentSignals: '2',
                rrMin: '2'
              }
            },
            symbol: 'SOLUSDT',
            timeframe: '1h',
            startDate: '2023-09-01T00:00:00Z',
            endDate: '2023-10-01T00:00:00Z',
            initialBalance: 8000,
            positionSize: 800,
            commission: 0.1,
            slippage: 0.05
          }
        }
      ];
      
      return { ok: true, data: examples };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch backtest examples' };
    }
  });

  // Endpoint para validar configuração de backtest
  fastify.post('/backtesting/validate', async (request, reply) => {
    const config = request.body as BacktestConfig;
    
    try {
      const errors: string[] = [];
      
      // Validações básicas
      if (!config.strategy?.id) errors.push('ID da estratégia é obrigatório');
      if (!config.strategy?.name) errors.push('Nome da estratégia é obrigatório');
      if (!config.symbol) errors.push('Símbolo é obrigatório');
      if (!config.timeframe) errors.push('Timeframe é obrigatório');
      if (!config.startDate) errors.push('Data de início é obrigatória');
      if (!config.endDate) errors.push('Data de fim é obrigatória');
      
      if (config.initialBalance <= 0) errors.push('Balance inicial deve ser maior que zero');
      if (config.positionSize <= 0) errors.push('Tamanho da posição deve ser maior que zero');
      if (config.commission < 0) errors.push('Comissão não pode ser negativa');
      if (config.slippage < 0) errors.push('Slippage não pode ser negativo');
      
      // Validação de datas
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.push('Datas inválidas');
      } else if (start >= end) {
        errors.push('Data de início deve ser anterior à data de fim');
      }
      
      // Validação de timeframe
      const validTimeframes: TF[] = ['1m', '3m', '5m', '10m', '15m', '1h', '4h'];
      if (!validTimeframes.includes(config.timeframe)) {
        errors.push('Timeframe inválido');
      }
      
      // Validação da estratégia
      if (config.strategy) {
        if (!Array.isArray(config.strategy.conditions) || config.strategy.conditions.length === 0) {
          errors.push('A estratégia deve ter pelo menos uma condição');
        }
        
        if (config.strategy.stopLoss.mode && !['percent', 'absolute', 'atrMultiple'].includes(config.strategy.stopLoss.mode)) {
          errors.push('Modo de stop loss inválido');
        }
        
        if (config.strategy.takeProfit.mode && !['percent', 'absolute', 'atrMultiple'].includes(config.strategy.takeProfit.mode)) {
          errors.push('Modo de take profit inválido');
        }
      }
      
      if (errors.length > 0) {
        reply.code(400);
        return { ok: false, errors };
      }
      
      return { ok: true, valid: true };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to validate backtest config' };
    }
  });
};

export default backtestingPlugin;

