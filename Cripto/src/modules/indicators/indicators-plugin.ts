import { FastifyPluginAsync } from 'fastify';
import { technicalIndicators, CandleData, IndicatorValues } from './indicators.js';
import { TF } from '../../config/defaults.js';

const indicatorsPlugin: FastifyPluginAsync = async (fastify) => {
  // Endpoint para obter candles de um símbolo/timeframe
  fastify.get('/indicators/candles/:symbol/:timeframe', async (request, reply) => {
    const { symbol, timeframe } = request.params as { symbol: string; timeframe: TF };
    const { limit } = request.query as { limit?: string };
    
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    
    try {
      const candles = technicalIndicators.getCandles(symbol, timeframe, limitNum);
      return { ok: true, data: candles };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch candles' };
    }
  });

  // Endpoint para obter indicadores mais recentes
  fastify.get('/indicators/latest/:symbol/:timeframe', async (request, reply) => {
    const { symbol, timeframe } = request.params as { symbol: string; timeframe: TF };
    
    try {
      const indicators = technicalIndicators.getLatestIndicators(symbol, timeframe);
      return { ok: true, data: indicators };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch indicators' };
    }
  });

  // Endpoint para adicionar um candle (para testes)
  fastify.post('/indicators/candle/:symbol/:timeframe', async (request, reply) => {
    const { symbol, timeframe } = request.params as { symbol: string; timeframe: TF };
    const candle = request.body as CandleData;
    
    try {
      const indicators = technicalIndicators.addCandle(symbol, timeframe, candle);
      return { ok: true, data: indicators };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to add candle' };
    }
  });

  // Endpoint para limpar buffer de um símbolo/timeframe
  fastify.delete('/indicators/buffer/:symbol/:timeframe', async (request, reply) => {
    const { symbol, timeframe } = request.params as { symbol: string; timeframe: TF };
    
    try {
      technicalIndicators.clearBuffer(symbol, timeframe);
      return { ok: true };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to clear buffer' };
    }
  });

  // Endpoint para limpar todos os buffers
  fastify.delete('/indicators/buffers', async (request, reply) => {
    try {
      technicalIndicators.clearAllBuffers();
      return { ok: true };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to clear all buffers' };
    }
  });
};

export default indicatorsPlugin;
