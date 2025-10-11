const MarketSimulationService = require('../services/MarketSimulationService');

class SimulationController {
  /**
   * Obter status da simulação
   */
  static async getSimulationStatus(req, res) {
    try {
      const status = MarketSimulationService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status da simulação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obter dados de mercado
   */
  static async getMarketData(req, res) {
    try {
      const { symbol } = req.query;
      
      let marketData;
      if (symbol) {
        marketData = MarketSimulationService.getMarketData(symbol);
        if (!marketData) {
          return res.status(404).json({ error: 'Símbolo não encontrado' });
        }
      } else {
        marketData = MarketSimulationService.getMarketData();
      }
      
      res.json(marketData);
    } catch (error) {
      console.error('Erro ao obter dados de mercado:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obter histórico de preços
   */
  static async getPriceHistory(req, res) {
    try {
      const { symbol, limit = 50 } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Parâmetro symbol é obrigatório' });
      }
      
      const history = MarketSimulationService.getPriceHistory(symbol, parseInt(limit));
      
      if (history.length === 0) {
        return res.status(404).json({ error: 'Histórico não encontrado para o símbolo' });
      }
      
      res.json(history);
    } catch (error) {
      console.error('Erro ao obter histórico de preços:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Controlar simulação
   */
  static async controlSimulation(req, res) {
    try {
      const { action, interval } = req.body;
      
      switch (action) {
        case 'start':
          MarketSimulationService.startSimulation(interval);
          break;
        case 'stop':
          MarketSimulationService.stopSimulation();
          break;
        case 'reset':
          MarketSimulationService.resetSimulation();
          break;
        default:
          return res.status(400).json({ error: 'Ação inválida' });
      }
      
      res.json({ 
        message: `Simulação ${action === 'start' ? 'iniciada' : action === 'stop' ? 'parada' : 'resetada'}`,
        status: MarketSimulationService.getStatus()
      });
    } catch (error) {
      console.error('Erro ao controlar simulação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Forçar mudança de tendência
   */
  static async forceTrendChange(req, res) {
    try {
      const { symbol, trend, strength } = req.body;
      
      if (!symbol || !trend) {
        return res.status(400).json({ 
          error: 'Parâmetros symbol e trend são obrigatórios' 
        });
      }
      
      if (!['up', 'down'].includes(trend)) {
        return res.status(400).json({ 
          error: 'Trend deve ser "up" ou "down"' 
        });
      }
      
      MarketSimulationService.forceTrendChange(symbol, trend, strength);
      
      res.json({ 
        message: `Tendência forçada para ${symbol}: ${trend}`,
        marketData: MarketSimulationService.getMarketData(symbol)
      });
    } catch (error) {
      console.error('Erro ao forçar mudança de tendência:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Simular trade manual
   */
  static async simulateManualTrade(req, res) {
    try {
      const { symbol, priceChange, duration } = req.body;
      
      // Esta função seria implementada para simular trades manuais
      // Por enquanto retornamos um placeholder
      
      res.json({
        message: 'Funcionalidade de trade manual em desenvolvimento',
        symbol,
        priceChange,
        duration
      });
    } catch (error) {
      console.error('Erro ao simular trade manual:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = SimulationController;