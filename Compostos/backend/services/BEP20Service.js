const { Web3 } = require('web3');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const NotificationService = require('./NotificationService');
const bep20Config = require('../config/bep20');

class BEP20Service {
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
    
    // Taxas de rede e saque
    this.fees = bep20Config.fees;
    
    console.log(`🔗 BEP20 Service inicializado na rede: ${this.networkName}`);
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
   * Gerar endereço de depósito para o usuário
   */
  async generateDepositAddress(userId, currency = 'USDT') {
    try {
      // Em produção, você pode usar HD Wallets para gerar endereços únicos
      // Por ora, vamos usar um endereço da empresa e identificar pelo memo
      const memo = `DEP_${userId}_${Date.now()}`;
      
      return {
        address: this.companyAddress,
        currency: currency,
        network: `BEP20 (${this.networkName})`,
        memo: memo,
        qrCode: `binance:${this.companyAddress}?memo=${memo}`,
        instructions: `
          Envie ${currency} para o endereço acima na rede ${this.networkName}.
          Importante: Inclua o memo ${memo} para identificarmos seu depósito.
          Tempo de confirmação: 5-30 minutos.
          ${this.isTestnet ? '\n\n⚠️ Você está usando a TESTNET. Use tokens de teste.' : ''}
        `
      };
    } catch (error) {
      console.error('Erro ao gerar endereço de depósito:', error);
      throw new Error('Falha ao gerar endereço de depósito');
    }
  }

  /**
   * Verificar se uma transação foi confirmada na blockchain
   */
  async verifyTransaction(txHash, expectedAmount, fromAddress, toAddress, tokenSymbol = 'USDT') {
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
      console.error('Erro ao verificar transação:', error);
      return { confirmed: false, message: 'Erro na verificação' };
    }
  }

  /**
   * Processar saque para carteira BEP20
   */
  async processWithdrawal(userId, amount, toAddress, tokenSymbol = 'USDT') {
    try {
      // Verificar se o usuário tem saldo suficiente
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const tokenInfo = this.tokens[tokenSymbol];
      if (!tokenInfo) {
        throw new Error('Token não suportado');
      }

      const withdrawalFee = this.fees.withdrawal[tokenSymbol] || 1.0;
      const totalAmount = amount + withdrawalFee;

      if (user.balance < totalAmount) {
        throw new Error(`Saldo insuficiente. Necessário: ${totalAmount} ${tokenSymbol}`);
      }

      // Em produção, aqui você implementaria a chamada real para a blockchain
      // Por ora, vamos simular a criação da transação
      const txHash = '0x' + Math.random().toString(16).substr(2, 64);

      // Criar registro de transação
      const transaction = new Transaction({
        user: userId,
        type: 'withdrawal',
        amount: -amount,
        fee: withdrawalFee,
        totalAmount: -totalAmount,
        currency: tokenSymbol,
        network: 'BEP20',
        toAddress: toAddress,
        txHash: txHash,
        status: 'pending',
        description: `Saque de ${amount} ${tokenSymbol} para ${toAddress}`,
        metadata: {
          tokenAddress: tokenInfo.address,
          decimals: tokenInfo.decimals,
          network: this.networkName,
          explorerUrl: `${this.isTestnet ? bep20Config.explorers.bscTestnet : bep20Config.explorers.bsc}/tx/${txHash}`
        }
      });

      await transaction.save();

      // Atualizar saldo do usuário (em produção, só após confirmação)
      user.balance -= totalAmount;
      await user.save();

      return {
        success: true,
        transactionId: transaction._id,
        txHash: txHash,
        amount: amount,
        fee: withdrawalFee,
        totalAmount: totalAmount,
        currency: tokenSymbol,
        toAddress: toAddress,
        explorerUrl: `${this.isTestnet ? bep20Config.explorers.bscTestnet : bep20Config.explorers.bsc}/tx/${txHash}`,
        status: 'pending',
        message: 'Saque solicitado com sucesso. Aguardando confirmação na rede.',
        network: this.networkName
      };
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      throw error;
    }
  }

  /**
   * Verificar status de transações pendentes
   */
  async checkPendingTransactions() {
    try {
      const pendingTransactions = await Transaction.find({ 
        status: 'pending',
        type: { $in: ['deposit', 'withdrawal'] }
      });

      const results = [];
      for (const tx of pendingTransactions) {
        if (tx.txHash) {
          const verification = await this.verifyTransaction(
            tx.txHash,
            Math.abs(tx.amount),
            tx.fromAddress,
            tx.toAddress,
            tx.currency
          );

          if (verification.confirmed) {
            tx.status = 'completed';
            tx.completedAt = new Date();
            await tx.save();

            // Se for depósito, creditar saldo do usuário
            if (tx.type === 'deposit') {
              await User.findByIdAndUpdate(tx.user, {
                $inc: { balance: Math.abs(tx.amount) }
              });

              // Enviar notificação de depósito confirmado
              await NotificationService.notifyDepositConfirmed(
                tx.user,
                Math.abs(tx.amount),
                tx.currency,
                tx.txHash
              );
            } else if (tx.type === 'withdrawal') {
              // Enviar notificação de saque processado
              await NotificationService.notifyWithdrawalProcessed(
                tx.user,
                Math.abs(tx.amount),
                tx.currency,
                tx.txHash,
                'completed'
              );
            }

            results.push({
              transactionId: tx._id,
              status: 'completed',
              message: 'Transação confirmada com sucesso'
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Erro ao verificar transações pendentes:', error);
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
   * Obter taxas de saque
   */
  getWithdrawalFees() {
    return this.fees.withdrawal;
  }

  /**
   * Obter informações da rede atual
   */
  getNetworkInfo() {
    return {
      name: this.networkName,
      chainId: this.chainId,
      isTestnet: this.isTestnet,
      explorerUrl: this.isTestnet ? bep20Config.explorers.bscTestnet : bep20Config.explorers.bsc
    };
  }
}

module.exports = BEP20Service;
