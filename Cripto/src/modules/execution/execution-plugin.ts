import { FastifyPluginAsync } from 'fastify';
import { getOrderExecutor, OrderResponse, Position, WalletBalance } from './order-executor.js';

const executionPlugin: FastifyPluginAsync = async (fastify) => {
  // Endpoint para obter posições abertas
  fastify.get('/execution/positions', async (request, reply) => {
    try {
      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      const positions = executor.getOpenPositions();
      const positionsArray = Array.from(positions.values());

      return { ok: true, data: positionsArray };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch positions' };
    }
  });

  // Endpoint para obter saldo da carteira
  fastify.get('/execution/wallet-balance', async (request, reply) => {
    try {
      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      const balance = await executor.getWalletBalance();
      return { ok: true, data: balance };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch wallet balance' };
    }
  });

  // Endpoint para obter estatísticas diárias
  fastify.get('/execution/daily-stats', async (request, reply) => {
    try {
      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      const stats = executor.getDailyStats();
      return { ok: true, data: stats };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch daily stats' };
    }
  });

  // Endpoint para obter histórico de ordens
  fastify.get('/execution/orders', async (request, reply) => {
    try {
      const { limit = 100, symbol } = request.query as { limit?: number; symbol?: string };
      
      // Por enquanto, retorna um array vazio
      // Em uma implementação completa, buscaria do Redis
      return { ok: true, data: [] };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch orders' };
    }
  });

  // Endpoint para executar uma ordem manual
  fastify.post('/execution/order', async (request, reply) => {
    try {
      const { symbol, side, orderType, quantity, price, stopPrice } = request.body as {
        symbol: string;
        side: 'Buy' | 'Sell';
        orderType: 'Market' | 'Limit' | 'Stop';
        quantity: number;
        price?: number;
        stopPrice?: number;
      };

      // Validação básica
      if (!symbol || !side || !orderType || !quantity) {
        reply.code(400);
        return { ok: false, error: 'Missing required fields' };
      }

      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      // Por enquanto, retorna uma resposta simulada
      // Em uma implementação completa, executaria a ordem real
      const mockOrder: OrderResponse = {
        orderId: `manual_${Date.now()}`,
        symbol,
        side,
        orderType,
        orderStatus: 'Filled',
        orderQty: quantity.toString(),
        leavesQty: '0',
        cumExecQty: quantity.toString(),
        cumExecValue: (quantity * (price || 0)).toString(),
        orderCreatedTime: new Date().toISOString(),
        orderUpdatedTime: new Date().toISOString()
      };

      return { ok: true, data: mockOrder };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to execute order' };
    }
  });

  // Endpoint para fechar uma posição
  fastify.post('/execution/close-position', async (request, reply) => {
    try {
      const { symbol } = request.body as { symbol: string };

      if (!symbol) {
        reply.code(400);
        return { ok: false, error: 'Symbol is required' };
      }

      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      const positions = executor.getOpenPositions();
      const position = positions.get(symbol);

      if (!position) {
        reply.code(404);
        return { ok: false, error: 'Position not found' };
      }

      // Por enquanto, retorna uma resposta simulada
      // Em uma implementação completa, executaria a ordem real
      const mockOrder: OrderResponse = {
        orderId: `close_${Date.now()}`,
        symbol,
        side: position.side === 'Buy' ? 'Sell' : 'Buy',
        orderType: 'Market',
        orderStatus: 'Filled',
        orderQty: position.size.toString(),
        leavesQty: '0',
        cumExecQty: position.size.toString(),
        cumExecValue: position.positionValue.toString(),
        orderCreatedTime: new Date().toISOString(),
        orderUpdatedTime: new Date().toISOString()
      };

      return { ok: true, data: mockOrder };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to close position' };
    }
  });

  // Endpoint para obter configuração de execução
  fastify.get('/execution/config', async (request, reply) => {
    try {
      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      // Por enquanto, retorna uma configuração simulada
      // Em uma implementação completa, retornaria a configuração real
      const config = {
        enableBybit: process.env.BYBIT_API_KEY ? true : false,
        enableBinance: false,
        enablePaperTrading: process.env.ENABLE_PAPER_TRADING === 'true',
        maxPositionSize: 1000,
        maxDailyLoss: 500,
        maxOpenPositions: 5,
        defaultLeverage: 10,
        commissionRate: 0.1,
        slippageRate: 0.05
      };

      return { ok: true, data: config };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to fetch execution config' };
    }
  });

  // Endpoint para atualizar configuração de execução
  fastify.post('/execution/config', async (request, reply) => {
    try {
      const config = request.body as {
        enableBybit?: boolean;
        enableBinance?: boolean;
        enablePaperTrading?: boolean;
        maxPositionSize?: number;
        maxDailyLoss?: number;
        maxOpenPositions?: number;
        defaultLeverage?: number;
        commissionRate?: number;
        slippageRate?: number;
      };

      // Por enquanto, apenas retorna sucesso
      // Em uma implementação completa, atualizaria a configuração real
      return { ok: true, message: 'Configuration updated' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to update execution config' };
    }
  });

  // Endpoint para iniciar/parar o executor de ordens
  fastify.post('/execution/toggle', async (request, reply) => {
    try {
      const { action } = request.body as { action: 'start' | 'stop' };

      if (!action || !['start', 'stop'].includes(action)) {
        reply.code(400);
        return { ok: false, error: 'Invalid action' };
      }

      const executor = getOrderExecutor();
      if (!executor) {
        reply.code(503);
        return { ok: false, error: 'Order executor not initialized' };
      }

      if (action === 'start') {
        await executor.start();
        return { ok: true, message: 'Order executor started' };
      } else {
        await executor.stop();
        return { ok: true, message: 'Order executor stopped' };
      }
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { ok: false, error: 'Failed to toggle order executor' };
    }
  });
};

export default executionPlugin;



