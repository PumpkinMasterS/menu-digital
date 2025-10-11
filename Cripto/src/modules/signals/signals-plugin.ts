import { FastifyPluginAsync } from 'fastify';
import { signalEngine, StrategyConfig, SignalResult } from './signal-engine.js';
import { TF } from '../../config/defaults.js';

const signalsPlugin: FastifyPluginAsync = async (fastify) => {
  // Endpoint para obter todas as estratégias
  fastify.get('/signals/strategies', async (request, reply) => {
    try {
      const strategies = signalEngine.getAllStrategies();
      return { ok: true, data: strategies };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch strategies' };
    }
  });

  // Endpoint para obter uma estratégia específica
  fastify.get('/signals/strategies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const strategy = signalEngine.getStrategy(id);
      if (!strategy) {
        reply.code(404);
        return { ok: false, error: 'Strategy not found' };
      }
      return { ok: true, data: strategy };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch strategy' };
    }
  });

  // Endpoint para adicionar ou atualizar uma estratégia
  fastify.post('/signals/strategies', async (request, reply) => {
    const strategy = request.body as StrategyConfig;
    
    try {
      // Validação básica
      if (!strategy.id || !strategy.name) {
        reply.code(400);
        return { ok: false, error: 'Strategy ID and name are required' };
      }
      
      signalEngine.addOrUpdateStrategy(strategy);
      return { ok: true, data: strategy };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to save strategy' };
    }
  });

  // Endpoint para remover uma estratégia
  fastify.delete('/signals/strategies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const strategy = signalEngine.getStrategy(id);
      if (!strategy) {
        reply.code(404);
        return { ok: false, error: 'Strategy not found' };
      }
      
      signalEngine.removeStrategy(id);
      return { ok: true };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to delete strategy' };
    }
  });

  // Endpoint para avaliar estratégias para um símbolo/timeframe
  fastify.get('/signals/evaluate/:symbol/:timeframe', async (request, reply) => {
    const { symbol, timeframe } = request.params as { symbol: string; timeframe: TF };
    
    try {
      const signals = signalEngine.evaluateStrategies(symbol, timeframe);
      return { ok: true, data: signals };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to evaluate strategies' };
    }
  });

  // Endpoint para obter o último sinal para um símbolo/timeframe
  fastify.get('/signals/latest/:symbol/:timeframe', async (request, reply) => {
    const { symbol, timeframe } = request.params as { symbol: string; timeframe: TF };
    
    try {
      const signal = signalEngine.getLastSignal(symbol, timeframe);
      return { ok: true, data: signal };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch latest signal' };
    }
  });

  // Endpoint para calcular stop loss e take profit
  fastify.post('/signals/calculate-sl-tp', async (request, reply) => {
    const { strategyId, entryPrice, atr } = request.body as {
      strategyId: string;
      entryPrice: number;
      atr?: number;
    };
    
    try {
      if (!strategyId || !entryPrice) {
        reply.code(400);
        return { ok: false, error: 'Strategy ID and entry price are required' };
      }
      
      const strategy = signalEngine.getStrategy(strategyId);
      if (!strategy) {
        reply.code(404);
        return { ok: false, error: 'Strategy not found' };
      }
      
      const result = signalEngine.calculateStopLossAndTakeProfit(strategy, entryPrice, atr);
      if (!result) {
        reply.code(400);
        return { ok: false, error: 'Failed to calculate stop loss and take profit' };
      }
      
      return { ok: true, data: result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to calculate stop loss and take profit' };
    }
  });
};

export default signalsPlugin;
