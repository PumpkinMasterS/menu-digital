const { Web3 } = require('web3');
const Robot = require('../models/Robot');
const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NotificationService = require('./NotificationService');
const bep20Config = require('../config/bep20');

class CryptoTransferService {
  constructor() {
    // Verificar se estamos em modo de teste
    this.isTestnet = process.env.NODE_ENV === 'test' || process.env.USE_BSC_TESTNET === 'true';
    
    // Configurar a rede apropriada
    const networkConfig = this.isTestnet ? bep20Config.bsc.testnet : bep20Config.bsc.mainnet;
    this.bscUrl = networkConfig.rpcUrl;
    this.web3 = new Web3(this.bscUrl);
    this.chainId = networkConfig.chainId;
    this.networkName = networkConfig.name;
    
    // Endereço da empresa para depósitos
    this.companyAddress = process.env.COMPANY_BSC_ADDRESS || bep20Config.companyAddress;
    
    // Tokens suportados (usando endereços da testnet se estiver em modo de teste)
    this.tokens = this.isTestnet ? this.getTestnetTokens() : bep20Config.tokens;
    
    console.log(`🔗 CryptoTransferService inicializado na rede: ${this.networkName}`);
    console.log(`📍 Endereço da empresa: ${this.companyAddress}`);
  }
  
  /**
   * Retorna os tokens da testnet
   */
  getTestnetTokens() {
    return {
      USDT: {
        address: '0xaB1a4d4f1D656d2450692d237fdD6C7f9146e814', // USDT na BSC Testnet
        decimals: 18,
        symbol: 'USDT',
        name: 'Tether USD'
      },
      USDC: {
        address: '0x2610601C2362C247b68c6CE6F7d70c099e22128A', // USDC na BSC Testnet
        decimals: 18,
        symbol: 'USDC',
        name: 'USD Coin'
      },
      BUSD: {
        address: '0xeD24FC36d8Ee4a9837a5335A771429E6c1c1d8A6', // BUSD na BSC Testnet
        decimals: 18,
        symbol: 'BUSD',
        name: 'Binance USD'
      },
      BNB: {
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB na BSC Testnet
        decimals: 18,
        symbol: 'BNB',
        name: 'Binance Coin'
      }
    };
  }

  /**
   * Verificar se uma transferência foi confirmada na blockchain
   */
  async verifyTransfer(txHash, expectedAmount, fromAddress, toAddress, tokenSymbol = 'USDT') {
    try {
      // Obter detalhes da transação
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      if (!receipt) {
        return { confirmed: false, message: 'Transação não encontrada' };
      }

      // Verificar se a transação foi bem-sucedida
      if (!receipt.status) {
        return { confirmed: false, message: 'Transação falhou' };
      }

      // Para transações BEP20, precisamos verificar o evento Transfer
      const tokenInfo = this.tokens[tokenSymbol];
      if (!tokenInfo) {
        return { confirmed: false, message: 'Token não suportado' };
      }

      // Obter logs da transação
      const transferLog = receipt.logs.find(log => 
        log.address.toLowerCase() === tokenInfo.address.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
      );

      if (!transferLog) {
        return { confirmed: false, message: 'Transação BEP20 não encontrada' };
      }

      // Decodificar o log para obter valores
      const from = '0x' + transferLog.topics[1].slice(26);
      const to = '0x' + transferLog.topics[2].slice(26);
      const amount = this.web3.utils.hexToNumberString(transferLog.data);

      // Converter para valor decimal
      const amountInToken = parseFloat(amount) / Math.pow(10, tokenInfo.decimals);

      // Verificar se a transação corresponde ao esperado
      const isValidAmount = Math.abs(amountInToken - expectedAmount) < 0.01; // Tolerância de 0.01
      const isValidTo = to.toLowerCase() === toAddress.toLowerCase();

      if (isValidAmount && isValidTo) {
        return {
          confirmed: true,
          amount: amountInToken,
          from: from,
          to: to,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          transactionHash: txHash
        };
      } else {
        return {
          confirmed: false,
          message: 'Valores ou endereço não correspondem'
        };
      }
    } catch (error) {
      console.error('Erro ao verificar transferência:', error);
      return { confirmed: false, message: 'Erro na verificação' };
    }
  }

  /**
   * Processar investimento baseado em transferência confirmada
   */
  async processInvestmentFromTransfer(userId, robotId, amount, currency, txHash) {
    try {
      // Verificar se o usuário existe
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se o robô existe
      const robot = await Robot.findById(robotId);
      if (!robot) {
        throw new Error('Robô não encontrado');
      }

      // Verificar se o valor atende ao mínimo do robô
      if (amount < robot.minInvestment) {
        throw new Error(`Valor mínimo para este robô é ${robot.minInvestment} ${currency}`);
      }

      // Verificar se o usuário já tem um investimento ativo neste robô
      const existingInvestment = await Investment.findOne({
        user: userId,
        robot: robotId,
        status: 'active'
      });

      if (existingInvestment) {
        throw new Error('Você já tem um investimento ativo neste robô');
      }

      // Calcular data de término
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + robot.duration);

      // Calcular lucro total esperado
      const dailyProfit = amount * (robot.dailyProfit / 100);
      const totalProfit = dailyProfit * robot.duration;

      // Criar novo investimento
      const investment = new Investment({
        user: userId,
        robot: robotId,
        amount: amount,
        currency: currency,
        dailyProfit: robot.dailyProfit,
        duration: robot.duration,
        expectedTotalProfit: totalProfit,
        startDate: new Date(),
        endDate: endDate,
        status: 'active',
        txHash: txHash,
        description: `Investimento em ${robot.name} - ${amount} ${currency}`
      });

      await investment.save();

      // Atualizar estatísticas do robô
      robot.totalInvestors += 1;
      robot.totalInvested += amount;
      await robot.save();

      // Criar transação de investimento
      const transaction = new Transaction({
        user: userId,
        type: 'investment',
        amount: -amount,
        currency: currency,
        network: 'BEP20',
        status: 'completed',
        description: `Investimento em ${robot.name}`,
        relatedEntity: investment._id,
        relatedEntityType: 'Investment',
        metadata: {
          robotId: robotId,
          robotName: robot.name,
          txHash: txHash,
          network: this.networkName
        }
      });

      await transaction.save();

      // Enviar notificação ao usuário
      await NotificationService.createNotification(
        userId,
        'Investimento Confirmado',
        `Seu investimento de ${amount} ${currency} em ${robot.name} foi confirmado com sucesso!`,
        'success',
        {
          type: 'investment',
          robotId: robotId,
          amount: amount,
          currency: currency
        }
      );

      return {
        success: true,
        investment: investment,
        message: 'Investimento confirmado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao processar investimento:', error);
      throw error;
    }
  }

  /**
   * Verificar transferências pendentes de investimento
   */
  async checkPendingInvestmentTransfers() {
    try {
      // Buscar transações pendentes do tipo 'investment'
      const pendingTransactions = await Transaction.find({
        type: 'investment',
        status: 'pending',
        txHash: { $exists: true }
      });

      const results = [];
      for (const tx of pendingTransactions) {
        if (tx.txHash && tx.metadata && tx.metadata.robotId) {
          const verification = await this.verifyTransfer(
            tx.txHash,
            Math.abs(tx.amount),
            null, // fromAddress não é necessário para verificação
            this.companyAddress,
            tx.currency
          );

          if (verification.confirmed) {
            // Processar o investimento
            const result = await this.processInvestmentFromTransfer(
              tx.user,
              tx.metadata.robotId,
              Math.abs(tx.amount),
              tx.currency,
              tx.txHash
            );

            // Atualizar status da transação
            tx.status = 'completed';
            tx.completedAt = new Date();
            await tx.save();

            results.push({
              transactionId: tx._id,
              investmentId: result.investment._id,
              status: 'completed',
              message: 'Investimento confirmado e processado'
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Erro ao verificar transferências pendentes:', error);
      throw error;
    }
  }

  /**
   * Calcular retornos diários para todos os investimentos ativos
   */
  async calculateDailyReturns() {
    try {
      // Buscar todos os investimentos ativos
      const activeInvestments = await Investment.find({
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('robot user');

      const results = [];
      for (const investment of activeInvestments) {
        // Calcular lucro diário
        const dailyProfit = investment.amount * (investment.dailyProfit / 100);

        // Criar transação de lucro
        const profitTransaction = new Transaction({
          user: investment.user._id,
          type: 'profit',
          amount: dailyProfit,
          currency: investment.currency,
          network: 'INTERNAL',
          status: 'completed',
          description: `Lucro diário de ${investment.robot.name}`,
          relatedEntity: investment._id,
          relatedEntityType: 'Investment',
          metadata: {
            robotId: investment.robot._id,
            robotName: investment.robot.name,
            investmentId: investment._id
          }
        });

        await profitTransaction.save();

        // Atualizar saldo do usuário
        await User.findByIdAndUpdate(investment.user._id, {
          $inc: { 
            balance: dailyProfit,
            totalEarnings: dailyProfit
          }
        });

        // Atualizar investimento
        investment.totalProfit += dailyProfit;
        investment.lastProfitDate = new Date();
        await investment.save();

        results.push({
          investmentId: investment._id,
          userId: investment.user._id,
          dailyProfit: dailyProfit,
          totalProfit: investment.totalProfit
        });
      }

      return results;
    } catch (error) {
      console.error('Erro ao calcular retornos diários:', error);
      throw error;
    }
  }

  /**
   * Obter informações de um token
   */
  getTokenInfo(tokenSymbol) {
    return this.tokens[tokenSymbol] || null;
  }

  /**
   * Obter endereço da empresa para depósitos
   */
  getCompanyAddress() {
    return this.companyAddress;
  }

  /**
   * Obter informações da rede atual
   */
  getNetworkInfo() {
    return {
      name: this.networkName,
      chainId: this.chainId,
      isTestnet: this.isTestnet,
      companyAddress: this.companyAddress,
      explorerUrl: this.isTestnet ? bep20Config.explorers.bscTestnet : bep20Config.explorers.bsc
    };
  }
}

module.exports = CryptoTransferService;
