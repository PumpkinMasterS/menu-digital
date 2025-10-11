const Robot = require('../models/Robot');
const Investment = require('../models/Investment');
const RealTradingService = require('../services/RealTradingService');

class TradingController {
  /**
   * Configurar trading para um robô
   */
  static async configureTrading(req, res) {
    try {
      const { robotId } = req.params;
      const {
        enabled,
        exchange,
        symbol,
        strategy,
        allocation,
        apiKey,
        apiSecret
      } = req.body;

      // Validar robô
      const robot = await Robot.findById(robotId);
      if (!robot) {
        return res.status(404).json({
          success: false,
          message: 'Robô não encontrado'
        });
      }

      // Validar alocação
      if (allocation && (allocation < 0.01 || allocation > 1.0)) {
        return res.status(400).json({
          success: false,
          message: 'Alocação deve estar entre 1% e 100%'
        });
      }

      // Atualizar configurações
      robot.tradingConfig = {
        enabled: enabled !== undefined ? enabled : robot.tradingConfig.enabled,
        exchange: exchange || robot.tradingConfig.exchange,
        symbol: symbol || robot.tradingConfig.symbol,
        strategy: strategy || robot.tradingConfig.strategy,
        allocation: allocation || robot.tradingConfig.allocation,
        apiKey: apiKey || robot.tradingConfig.apiKey,
        apiSecret: apiSecret || robot.tradingConfig.apiSecret,
        lastTradeDate: robot.tradingConfig.lastTradeDate,
        tradingStats: robot.tradingConfig.tradingStats
      };

      await robot.save();

      // Se ativado, inicializar serviço
      if (robot.tradingConfig.enabled) {
        await RealTradingService.initialize();
      }

      res.json({
        success: true,
        message: 'Configurações de trading atualizadas',
        data: robot.tradingConfig
      });

    } catch (error) {
      console.error('Erro ao configurar trading:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter configurações de trading de um robô
   */
  static async getTradingConfig(req, res) {
    try {
      const { robotId } = req.params;

      const robot = await Robot.findById(robotId);
      if (!robot) {
        return res.status(404).json({
          success: false,
          message: 'Robô não encontrado'
        });
      }

      res.json({
        success: true,
        data: robot.tradingConfig
      });

    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Executar trade manual para um robô
   */
  static async executeManualTrade(req, res) {
    try {
      const { robotId } = req.params;
      const { amount, symbol, side = 'buy' } = req.body;

      // Validar robô
      const robot = await Robot.findById(robotId);
      if (!robot) {
        return res.status(404).json({
          success: false,
          message: 'Robô não encontrado'
        });
      }

      if (!robot.tradingConfig.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Trading não está ativado para este robô'
        });
      }

      // Validar amount
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor para trade é obrigatório'
        });
      }

      // Executar trade
      const tradeResult = await RealTradingService.executeTradingStrategy(
        robotId,
        amount,
        symbol || robot.tradingConfig.symbol
      );

      // Atualizar estatísticas do robô
      robot.tradingConfig.lastTradeDate = new Date();
      robot.tradingConfig.tradingStats.totalTrades += 1;
      robot.tradingConfig.tradingStats.successfulTrades += 1;
      robot.tradingConfig.tradingStats.totalProfit += tradeResult.amount || 0;
      
      await robot.save();

      res.json({
        success: true,
        message: 'Trade executado com sucesso',
        data: tradeResult
      });

    } catch (error) {
      console.error('Erro ao executar trade:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter estatísticas de trading em tempo real
   */
  static async getTradingStats(req, res) {
    try {
      const stats = await RealTradingService.getLiveTradingStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter histórico de trades de um robô
   */
  static async getTradeHistory(req, res) {
    try {
      const { robotId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const robot = await Robot.findById(robotId);
      if (!robot) {
        return res.status(404).json({
          success: false,
          message: 'Robô não encontrado'
        });
      }

      // Buscar investimentos do robô com informações de trading
      const investments = await Investment.find({ robot: robotId })
        .select('amount totalProfit profitHistory createdAt')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user', 'name email');

      // Formatar histórico de trades
      const tradeHistory = investments.flatMap(investment => 
        investment.profitHistory.map(profit => ({
          investmentId: investment._id,
          userId: investment.user._id,
          userName: investment.user.name,
          amount: investment.amount,
          profit: profit.amount,
          percentage: profit.percentage,
          date: profit.date,
          type: 'auto_trade'
        }))
      );

      // Ordenar por data
      tradeHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json({
        success: true,
        data: tradeHistory.slice(0, limit),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tradeHistory.length
        }
      });

    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Testar conexão com exchange
   */
  static async testExchangeConnection(req, res) {
    try {
      const { exchange, apiKey, apiSecret, passphrase } = req.body;

      if (!exchange) {
        return res.status(400).json({
          success: false,
          message: 'Exchange é obrigatória'
        });
      }

      // Configurar temporariamente
      if (apiKey && apiSecret) {
        RealTradingService.exchanges[exchange] = {
          ...RealTradingService.exchanges[exchange],
          apiKey,
          apiSecret,
          passphrase
        };
      }

      // Testar conexão
      const isValid = await RealTradingService.testExchangeConnection(exchange);

      res.json({
        success: true,
        data: {
          exchange,
          connected: isValid,
          message: isValid ? 'Conexão bem-sucedida' : 'Falha na conexão'
        }
      });

    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter preço atual de um símbolo
   */
  static async getCurrentPrice(req, res) {
    try {
      const { exchange, symbol } = req.query;

      if (!exchange || !symbol) {
        return res.status(400).json({
          success: false,
          message: 'Exchange e símbolo são obrigatórios'
        });
      }

      const price = await RealTradingService.getCurrentPrice(exchange, symbol);

      res.json({
        success: true,
        data: {
          exchange,
          symbol,
          price,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro ao obter preço:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  /**
   * Iniciar/parar monitoramento
   */
  static async toggleMonitoring(req, res) {
    try {
      const { action } = req.body;

      if (action === 'start') {
        RealTradingService.startMonitoring();
        res.json({
          success: true,
          message: 'Monitoramento iniciado'
        });
      } else if (action === 'stop') {
        RealTradingService.stopMonitoring();
        res.json({
          success: true,
          message: 'Monitoramento parado'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Ação inválida. Use "start" ou "stop"'
        });
      }

    } catch (error) {
      console.error('Erro ao controlar monitoramento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = TradingController;