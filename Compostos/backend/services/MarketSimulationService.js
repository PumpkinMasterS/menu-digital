const axios = require('axios');
const Investment = require('../models/Investment');
const Robot = require('../models/Robot');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NotificationService = require('./NotificationService');

class MarketSimulationService {
  constructor() {
    this.marketData = new Map();
    this.simulationInterval = null;
    this.isSimulating = false;
  }

  /**
   * Inicializar simulação de mercado
   */
  async initialize() {
    console.log('🎮 Inicializando Simulação de Mercado...');
    
    // Carregar dados iniciais do mercado
    await this.loadInitialMarketData();
    
    // Iniciar simulação
    this.startSimulation();
    
    console.log('✅ Simulação de Mercado inicializada');
  }

  /**
   * Carregar dados iniciais do mercado
   */
  async loadInitialMarketData() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'SOLUSDT', 'DOTUSDT'];
    
    for (const symbol of symbols) {
      // Preços iniciais baseados em valores realistas
      const basePrice = this.getBasePrice(symbol);
      const volatility = this.getVolatility(symbol);
      
      this.marketData.set(symbol, {
        symbol,
        price: basePrice,
        basePrice,
        volatility,
        lastUpdate: new Date(),
        history: [],
        trend: Math.random() > 0.5 ? 'up' : 'down',
        trendStrength: Math.random() * 0.1 + 0.05 // 5-15%
      });
    }

    console.log(`📊 ${symbols.length} símbolos carregados para simulação`);
  }

  /**
   * Obter preço base para um símbolo
   */
  getBasePrice(symbol) {
    const basePrices = {
      'BTCUSDT': 45000,
      'ETHUSDT': 2500,
      'BNBUSDT': 350,
      'ADAUSDT': 0.55,
      'XRPUSDT': 0.60,
      'SOLUSDT': 100,
      'DOTUSDT': 7.5
    };
    
    return basePrices[symbol] || 100;
  }

  /**
   * Obter volatilidade para um símbolo
   */
  getVolatility(symbol) {
    const volatilities = {
      'BTCUSDT': 0.02,  // 2%
      'ETHUSDT': 0.025, // 2.5%
      'BNBUSDT': 0.03,  // 3%
      'ADAUSDT': 0.04,  // 4%
      'XRPUSDT': 0.035, // 3.5%
      'SOLUSDT': 0.045, // 4.5%
      'DOTUSDT': 0.038 // 3.8%
    };
    
    return volatilities[symbol] || 0.03;
  }

  /**
   * Iniciar simulação de mercado
   */
  startSimulation(intervalMs = 30000) { // 30 segundos
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    this.simulationInterval = setInterval(() => {
      this.updateMarketPrices();
      this.simulateTradingActivity();
    }, intervalMs);

    this.isSimulating = true;
    console.log(`📈 Simulação de mercado iniciada (intervalo: ${intervalMs/1000}s)`);
  }

  /**
   * Parar simulação
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    this.isSimulating = false;
    console.log('⏹️ Simulação de mercado parada');
  }

  /**
   * Atualizar preços do mercado
   */
  updateMarketPrices() {
    for (const [symbol, data] of this.marketData.entries()) {
      // Gerar mudança de preço baseada em volatilidade e tendência
      const randomChange = (Math.random() - 0.5) * 2 * data.volatility * data.price;
      const trendChange = data.trend === 'up' 
        ? data.trendStrength * data.price 
        : -data.trendStrength * data.price;
      
      const totalChange = randomChange + trendChange;
      const newPrice = Math.max(0.01, data.price + totalChange);

      // Atualizar dados
      data.price = newPrice;
      data.lastUpdate = new Date();
      
      // Manter histórico (últimas 100 atualizações)
      data.history.push({
        price: newPrice,
        timestamp: new Date(),
        change: totalChange,
        changePercent: (totalChange / data.price) * 100
      });

      if (data.history.length > 100) {
        data.history = data.history.slice(-100);
      }

      // Ocasionalmente mudar tendência (10% de chance)
      if (Math.random() < 0.1) {
        data.trend = data.trend === 'up' ? 'down' : 'up';
        data.trendStrength = Math.random() * 0.1 + 0.03; // 3-13%
      }
    }

    console.log('📊 Preços de mercado atualizados:', 
      Array.from(this.marketData.entries())
        .map(([symbol, data]) => `${symbol}: $${data.price.toFixed(2)}`)
        .join(', ')
    );
  }

  /**
   * Simular atividade de trading
   */
  async simulateTradingActivity() {
    try {
      // Buscar robôs com trading ativo
      const activeRobots = await Robot.find({ 
        'tradingConfig.enabled': true,
        status: 'active'
      });

      for (const robot of activeRobots) {
        // Buscar investimentos ativos deste robô
        const activeInvestments = await Investment.find({
          robot: robot._id,
          status: 'active'
        });

        for (const investment of activeInvestments) {
          await this.simulateInvestmentTrading(investment, robot);
        }
      }

    } catch (error) {
      console.error('Erro na simulação de trading:', error);
    }
  }

  /**
   * Simular trading para um investimento
   */
  async simulateInvestmentTrading(investment, robot) {
    try {
      const symbol = robot.tradingConfig.symbol || 'BTCUSDT';
      const marketData = this.marketData.get(symbol);
      
      if (!marketData) {
        console.warn(`Símbolo não encontrado na simulação: ${symbol}`);
        return;
      }

      // Calcular lucro baseado na mudança de preço
      const priceChangePercent = ((marketData.price - marketData.basePrice) / marketData.basePrice) * 100;
      
      // Ajustar lucro baseado na estratégia do robô
      const strategyMultiplier = this.getStrategyMultiplier(robot.tradingConfig.strategy);
      const dailyProfit = (priceChangePercent * strategyMultiplier) / 30; // Lucro diário aproximado

      // Garantir lucro mínimo baseado na configuração do robô
      const minDailyProfit = robot.dailyProfit || 0.5;
      const actualProfit = Math.max(dailyProfit, minDailyProfit);

      // Calcular valor do lucro
      const profitAmount = (investment.amount * actualProfit) / 100;

      if (profitAmount > 0) {
        // Atualizar investimento
        investment.totalProfit += profitAmount;
        investment.dailyProfit = actualProfit;
        
        // Adicionar ao histórico de lucros
        investment.profitHistory.push({
          date: new Date(),
          amount: profitAmount,
          percentage: actualProfit,
          type: 'simulated_trade',
          symbol: symbol,
          marketPrice: marketData.price
        });

        await investment.save();

        // Atualizar saldo do usuário
        await User.findByIdAndUpdate(
          investment.user,
          { $inc: { balance: profitAmount } }
        );

        // Criar transação de lucro
        const transaction = new Transaction({
          user: investment.user,
          type: 'earning',
          amount: profitAmount,
          description: `Lucro simulado - ${robot.name} (${symbol})`,
          status: 'completed',
          investment: investment._id,
          robot: robot._id,
          details: {
            symbol,
            marketPrice: marketData.price,
            profitPercentage: actualProfit,
            simulation: true
          }
        });

        await transaction.save();

        // Notificar usuário se lucro significativo
        if (profitAmount >= 1) { // Lucro de pelo menos $1
          await NotificationService.createProfitNotification(
            investment.user,
            profitAmount,
            robot.name,
            true // simulated
          );
        }

        console.log(`💰 Lucro simulado para investimento ${investment._id}: $${profitAmount.toFixed(2)} (${actualProfit.toFixed(2)}%)`);
      }

    } catch (error) {
      console.error('Erro ao simular trading para investimento:', error);
    }
  }

  /**
   * Obter multiplicador de estratégia
   */
  getStrategyMultiplier(strategy) {
    const multipliers = {
      'conservative': 0.5,
      'moderate': 1.0,
      'aggressive': 1.8
    };
    
    return multipliers[strategy] || 1.0;
  }

  /**
   * Obter dados de mercado em tempo real
   */
  getMarketData(symbol = null) {
    if (symbol) {
      return this.marketData.get(symbol) || null;
    }
    
    return Array.from(this.marketData.entries()).map(([symbol, data]) => ({
      symbol: data.symbol,
      price: data.price,
      change: data.price - data.basePrice,
      changePercent: ((data.price - data.basePrice) / data.basePrice) * 100,
      lastUpdate: data.lastUpdate,
      trend: data.trend,
      history: data.history.slice(-20) // Últimas 20 entradas
    }));
  }

  /**
   * Obter histórico de preços
   */
  getPriceHistory(symbol, limit = 50) {
    const data = this.marketData.get(symbol);
    if (!data) return [];
    
    return data.history.slice(-limit).map(entry => ({
      price: entry.price,
      timestamp: entry.timestamp,
      change: entry.change,
      changePercent: entry.changePercent
    }));
  }

  /**
   * Forçar mudança de tendência
   */
  forceTrendChange(symbol, newTrend, strength = null) {
    const data = this.marketData.get(symbol);
    if (data) {
      data.trend = newTrend;
      data.trendStrength = strength !== null ? strength : Math.random() * 0.1 + 0.03;
      
      console.log(`🔄 Tendência forçada para ${symbol}: ${newTrend} (força: ${(data.trendStrength * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Resetar simulação
   */
  resetSimulation() {
    this.marketData.clear();
    this.loadInitialMarketData();
    console.log('🔄 Simulação resetada');
  }

  /**
   * Obter status da simulação
   */
  getStatus() {
    return {
      isSimulating: this.isSimulating,
      symbols: Array.from(this.marketData.keys()),
      lastUpdate: new Date(),
      marketData: this.getMarketData()
    };
  }
}

module.exports = new MarketSimulationService();