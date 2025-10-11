const axios = require('axios');
const crypto = require('crypto');
const Investment = require('../models/Investment');
const Robot = require('../models/Robot');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NotificationService = require('./NotificationService');

class RealTradingService {
  constructor() {
    this.exchanges = {
      binance: {
        baseUrl: process.env.BINANCE_API_URL || 'https://api.binance.com',
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET
      },
      bitget: {
        baseUrl: process.env.BITGET_API_URL || 'https://api.bitget.com',
        apiKey: process.env.BITGET_API_KEY,
        secret: process.env.BITGET_API_SECRET,
        passphrase: process.env.BITGET_API_PASSPHRASE
      }
    };
    
    this.tradingStrategies = new Map();
    this.activeTrades = new Map();
  }

  /**
   * Inicializar conexões com exchanges
   */
  async initialize() {
    console.log('🚀 Inicializando Real Trading Service...');
    
    // Verificar credenciais
    await this.validateExchangeCredentials();
    
    // Carregar estratégias ativas
    await this.loadActiveStrategies();
    
    console.log('✅ Real Trading Service inicializado com sucesso');
  }

  /**
   * Validar credenciais das exchanges
   */
  async validateExchangeCredentials() {
    const results = {};
    
    for (const [exchange, config] of Object.entries(this.exchanges)) {
      if (config.apiKey && config.secret) {
        try {
          const isValid = await this.testExchangeConnection(exchange);
          results[exchange] = { valid: isValid, message: isValid ? 'Credenciais válidas' : 'Credenciais inválidas' };
        } catch (error) {
          results[exchange] = { valid: false, message: `Erro: ${error.message}` };
        }
      } else {
        results[exchange] = { valid: false, message: 'Credenciais não configuradas' };
      }
    }
    
    console.log('🔐 Status das credenciais:', results);
    return results;
  }

  /**
   * Testar conexão com exchange
   */
  async testExchangeConnection(exchange) {
    switch (exchange) {
      case 'binance':
        return await this.testBinanceConnection();
      case 'bitget':
        return await this.testBitgetConnection();
      default:
        throw new Error(`Exchange não suportada: ${exchange}`);
    }
  }

  /**
   * Testar conexão com Binance
   */
  async testBinanceConnection() {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', this.exchanges.binance.secret)
        .update(queryString)
        .digest('hex');

      const response = await axios.get(
        `${this.exchanges.binance.baseUrl}/api/v3/account?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.exchanges.binance.apiKey
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Erro ao conectar com Binance:', error.message);
      return false;
    }
  }

  /**
   * Testar conexão com Bitget
   */
  async testBitgetConnection() {
    try {
      const timestamp = Date.now();
      const method = 'GET';
      const requestPath = '/api/spot/v1/account/assets';
      
      const sign = this.generateBitgetSignature(
        method, 
        requestPath, 
        {}, 
        timestamp
      );

      const response = await axios.get(
        `${this.exchanges.bitget.baseUrl}${requestPath}`,
        {
          headers: {
            'ACCESS-KEY': this.exchanges.bitget.apiKey,
            'ACCESS-SIGN': sign,
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': this.exchanges.bitget.passphrase,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Erro ao conectar com Bitget:', error.message);
      return false;
    }
  }

  /**
   * Gerar assinatura Bitget
   */
  generateBitgetSignature(method, requestPath, body, timestamp) {
    const message = timestamp + method + requestPath + 
                   (method === 'GET' ? '' : JSON.stringify(body));
    
    return crypto
      .createHmac('sha256', this.exchanges.bitget.secret)
      .update(message)
      .digest('base64');
  }

  /**
   * Carregar estratégias ativas dos robôs
   */
  async loadActiveStrategies() {
    try {
      const activeRobots = await Robot.find({ 
        status: 'active', 
        'tradingConfig.exchange': { $exists: true } 
      });

      for (const robot of activeRobots) {
        if (robot.tradingConfig && robot.tradingConfig.exchange) {
          this.tradingStrategies.set(robot._id.toString(), {
            robotId: robot._id,
            exchange: robot.tradingConfig.exchange,
            symbol: robot.tradingConfig.symbol || 'BTCUSDT',
            strategy: robot.tradingConfig.strategy || 'conservative',
            allocation: robot.tradingConfig.allocation || 0.1 // 10% do capital
          });
        }
      }

      console.log(`📊 ${this.tradingStrategies.size} estratégias de trading carregadas`);
    } catch (error) {
      console.error('Erro ao carregar estratégias:', error);
    }
  }

  /**
   * Executar estratégia de trading para um robô
   */
  async executeTradingStrategy(robotId, investmentAmount) {
    const strategy = this.tradingStrategies.get(robotId);
    if (!strategy) {
      throw new Error(`Estratégia não encontrada para o robô: ${robotId}`);
    }

    try {
      const exchange = strategy.exchange;
      const symbol = strategy.symbol;
      const amountToTrade = investmentAmount * strategy.allocation;

      console.log(`🎯 Executando estratégia para robô ${robotId}: ${amountToTrade} USD em ${symbol}`);

      // Obter preço atual
      const currentPrice = await this.getCurrentPrice(exchange, symbol);
      
      // Calcular quantidade
      const quantity = amountToTrade / currentPrice;

      // Executar ordem de compra
      const orderResult = await this.placeOrder(
        exchange,
        symbol,
        'buy',
        quantity,
        currentPrice
      );

      // Registrar trade ativo
      this.activeTrades.set(orderResult.orderId, {
        robotId,
        exchange,
        symbol,
        quantity,
        entryPrice: currentPrice,
        orderId: orderResult.orderId,
        timestamp: Date.now()
      });

      return {
        success: true,
        orderId: orderResult.orderId,
        symbol,
        quantity,
        entryPrice: currentPrice,
        amount: amountToTrade
      };

    } catch (error) {
      console.error(`Erro ao executar estratégia para robô ${robotId}:`, error);
      throw error;
    }
  }

  /**
   * Obter preço atual de um símbolo
   */
  async getCurrentPrice(exchange, symbol) {
    switch (exchange) {
      case 'binance':
        return await this.getBinancePrice(symbol);
      case 'bitget':
        return await this.getBitgetPrice(symbol);
      default:
        throw new Error(`Exchange não suportada: ${exchange}`);
    }
  }

  /**
   * Obter preço da Binance
   */
  async getBinancePrice(symbol) {
    try {
      const response = await axios.get(
        `${this.exchanges.binance.baseUrl}/api/v3/ticker/price?symbol=${symbol}`
      );
      return parseFloat(response.data.price);
    } catch (error) {
      throw new Error(`Erro ao obter preço da Binance: ${error.message}`);
    }
  }

  /**
   * Obter preço da Bitget
   */
  async getBitgetPrice(symbol) {
    try {
      const response = await axios.get(
        `${this.exchanges.bitget.baseUrl}/api/spot/v1/market/ticker?symbol=${symbol}`
      );
      
      if (response.data.code === '00000' && response.data.data) {
        return parseFloat(response.data.data[0].lastPr);
      } else {
        throw new Error(`Resposta inválida da Bitget: ${response.data.msg}`);
      }
    } catch (error) {
      throw new Error(`Erro ao obter preço da Bitget: ${error.message}`);
    }
  }

  /**
   * Colocar ordem na exchange
   */
  async placeOrder(exchange, symbol, side, quantity, price) {
    switch (exchange) {
      case 'binance':
        return await this.placeBinanceOrder(symbol, side, quantity, price);
      case 'bitget':
        return await this.placeBitgetOrder(symbol, side, quantity, price);
      default:
        throw new Error(`Exchange não suportada: ${exchange}`);
    }
  }

  /**
   * Colocar ordem na Binance
   */
  async placeBinanceOrder(symbol, side, quantity, price) {
    try {
      const timestamp = Date.now();
      const orderData = {
        symbol,
        side: side.toUpperCase(),
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: quantity.toFixed(8),
        price: price.toFixed(2),
        timestamp
      };

      const queryString = Object.keys(orderData)
        .map(key => `${key}=${encodeURIComponent(orderData[key])}`)
        .join('&');

      const signature = crypto
        .createHmac('sha256', this.exchanges.binance.secret)
        .update(queryString)
        .digest('hex');

      const response = await axios.post(
        `${this.exchanges.binance.baseUrl}/api/v3/order?${queryString}&signature=${signature}`,
        null,
        {
          headers: {
            'X-MBX-APIKEY': this.exchanges.binance.apiKey
          }
        }
      );

      return {
        orderId: response.data.orderId,
        symbol: response.data.symbol,
        status: response.data.status,
        executedQty: parseFloat(response.data.executedQty || 0)
      };

    } catch (error) {
      throw new Error(`Erro ao colocar ordem na Binance: ${error.message}`);
    }
  }

  /**
   * Colocar ordem na Bitget
   */
  async placeBitgetOrder(symbol, side, quantity, price) {
    try {
      const timestamp = Date.now();
      const method = 'POST';
      const requestPath = '/api/spot/v1/trade/orders';
      
      const orderData = {
        symbol,
        side: side.toLowerCase(),
        orderType: 'limit',
        force: 'gtc',
        price: price.toString(),
        quantity: quantity.toString(),
        clientOrderId: `order_${timestamp}`
      };

      const sign = this.generateBitgetSignature(
        method, 
        requestPath, 
        orderData, 
        timestamp
      );

      const response = await axios.post(
        `${this.exchanges.bitget.baseUrl}${requestPath}`,
        orderData,
        {
          headers: {
            'ACCESS-KEY': this.exchanges.bitget.apiKey,
            'ACCESS-SIGN': sign,
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': this.exchanges.bitget.passphrase,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === '00000') {
        return {
          orderId: response.data.data.orderId,
          symbol: response.data.data.symbol,
          status: response.data.data.status,
          executedQty: parseFloat(response.data.data.executedQty || 0)
        };
      } else {
        throw new Error(`Erro Bitget: ${response.data.msg}`);
      }

    } catch (error) {
      throw new Error(`Erro ao colocar ordem na Bitget: ${error.message}`);
    }
  }

  /**
   * Monitorar trades ativos e calcular lucros
   */
  async monitorActiveTrades() {
    for (const [orderId, trade] of this.activeTrades.entries()) {
      try {
        const currentPrice = await this.getCurrentPrice(trade.exchange, trade.symbol);
        const profitLoss = (currentPrice - trade.entryPrice) * trade.quantity;
        const profitPercentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

        // Atualizar lucro do investimento
        await this.updateInvestmentProfit(trade.robotId, profitLoss, profitPercentage);

        console.log(`📈 Trade ${orderId}: ${profitPercentage.toFixed(2)}% (${profitLoss.toFixed(2)} USD)`);

        // Verificar se deve fechar a posição (exemplo: +5% ou -3%)
        if (profitPercentage >= 5 || profitPercentage <= -3) {
          await this.closePosition(trade, currentPrice);
          this.activeTrades.delete(orderId);
        }

      } catch (error) {
        console.error(`Erro ao monitorar trade ${orderId}:`, error);
      }
    }
  }

  /**
   * Atualizar lucro do investimento
   */
  async updateInvestmentProfit(robotId, profitAmount, profitPercentage) {
    try {
      const investment = await Investment.findOne({ 
        robot: robotId, 
        status: 'active' 
      });

      if (investment) {
        investment.totalProfit += profitAmount;
        investment.dailyProfit = (profitAmount / investment.amount) * 100;
        
        // Adicionar ao histórico de lucros
        investment.profitHistory.push({
          date: new Date(),
          amount: profitAmount,
          percentage: profitPercentage
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
          description: `Lucro de trading - Robô ${robotId}`,
          status: 'completed',
          investment: investment._id,
          robot: robotId
        });

        await transaction.save();

        // Notificar usuário
        await NotificationService.createProfitNotification(
          investment.user,
          profitAmount,
          investment.robot.name
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar lucro do investimento:', error);
    }
  }

  /**
   * Fechar posição
   */
  async closePosition(trade, currentPrice) {
    try {
      console.log(`🔒 Fechando posição ${trade.orderId} a ${currentPrice} USD`);

      // Colocar ordem de venda
      const sellResult = await this.placeOrder(
        trade.exchange,
        trade.symbol,
        'sell',
        trade.quantity,
        currentPrice
      );

      // Calcular lucro final
      const finalProfit = (currentPrice - trade.entryPrice) * trade.quantity;
      
      // Atualizar investimento com lucro final
      await this.updateInvestmentProfit(trade.robotId, finalProfit, 0);

      console.log(`✅ Posição fechada: ${finalProfit.toFixed(2)} USD de lucro`);

    } catch (error) {
      console.error('Erro ao fechar posição:', error);
    }
  }

  /**
   * Obter estatísticas de trading em tempo real
   */
  async getLiveTradingStats() {
    const stats = {
      totalActiveTrades: this.activeTrades.size,
      totalInvested: 0,
      totalProfit: 0,
      exchanges: {},
      byRobot: {}
    };

    for (const trade of this.activeTrades.values()) {
      try {
        const currentPrice = await this.getCurrentPrice(trade.exchange, trade.symbol);
        const marketValue = trade.quantity * currentPrice;
        const profit = (currentPrice - trade.entryPrice) * trade.quantity;

        stats.totalInvested += marketValue;
        stats.totalProfit += profit;

        // Estatísticas por exchange
        if (!stats.exchanges[trade.exchange]) {
          stats.exchanges[trade.exchange] = { count: 0, invested: 0, profit: 0 };
        }
        stats.exchanges[trade.exchange].count++;
        stats.exchanges[trade.exchange].invested += marketValue;
        stats.exchanges[trade.exchange].profit += profit;

        // Estatísticas por robô
        if (!stats.byRobot[trade.robotId]) {
          stats.byRobot[trade.robotId] = { count: 0, invested: 0, profit: 0 };
        }
        stats.byRobot[trade.robotId].count++;
        stats.byRobot[trade.robotId].invested += marketValue;
        stats.byRobot[trade.robotId].profit += profit;

      } catch (error) {
        console.error('Erro ao calcular estatísticas do trade:', error);
      }
    }

    return stats;
  }

  /**
   * Iniciar monitoramento contínuo
   */
  startMonitoring(intervalMs = 300000) { // 5 minutos
    this.monitoringInterval = setInterval(() => {
      this.monitorActiveTrades();
    }, intervalMs);

    console.log(`👀 Monitoramento de trades iniciado (intervalo: ${intervalMs/1000}s)`);
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('⏹️ Monitoramento de trades parado');
    }
  }
}

module.exports = new RealTradingService();