const express = require('express');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Configuração básica da API Bybit
const BYBIT_API_KEY = process.env.BYBIT_API_KEY || 'your_bybit_api_key';
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || 'your_bybit_api_secret';
const BYBIT_BASE_URL = process.env.BYBIT_BASE_URL || 'https://api.bybit.com';

// Simulação do serviço Bybit
class BybitService {
  static async createDepositAddress(userId, currency = 'BTC') {
    return {
      address: `bc1q${userId.substring(0, 20)}${Date.now().toString(16)}`,
      currency: currency,
      network: 'Bitcoin'
    };
  }

  static async createWithdrawal(address, amount, currency = 'BTC') {
    return {
      id: `withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      status: 'pending',
      address: address,
      amount: amount,
      currency: currency
    };
  }

  static async checkTransactionStatus(transactionId) {
    return {
      status: Math.random() > 0.2 ? 'completed' : 'pending',
      confirmations: Math.random() > 0.5 ? 6 : 2
    };
  }
}

// Rota para obter endereço de depósito
router.post('/deposit/address', protect, async (req, res) => {
  try {
    const { currency = 'BTC' } = req.body;
    
    const depositAddress = await BybitService.createDepositAddress(req.user._id, currency);
    
    res.json({
      success: true,
      data: depositAddress
    });
  } catch (error) {
    console.error('Erro ao criar endereço de depósito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para solicitar saque
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { address, amount, currency = 'BTC' } = req.body;
    
    // Validar dados
    if (!address || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Endereço e valor são obrigatórios'
      });
    }
    
    // Verificar se o usuário tem saldo suficiente
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Saldo insuficiente'
      });
    }

    // Criar solicitação de saque
    const withdrawal = await BybitService.createWithdrawal(address, amount, currency);
    
    // Criar transação no banco de dados
    const transaction = new Transaction({
      user: req.user._id,
      type: 'withdrawal',
      amount: -amount,
      currency: currency,
      status: 'pending',
      description: `Saque de ${amount} ${currency} para ${address}`,
      metadata: {
        withdrawalId: withdrawal.id,
        address: address
      }
    });

    await transaction.save();

    // Atualizar saldo do usuário (bloquear valor durante processamento)
    user.balance -= amount;
    user.pendingWithdrawals += amount;
    await user.save();

    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        withdrawalId: withdrawal.id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erro ao processar saque:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para verificar status da transação
router.get('/transaction/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      });
    }
    
    // Verificar se a transação pertence ao usuário
    if (transaction.user.toString() !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    // Se for uma transação de saque, verificar status na Bybit
    if (transaction.type === 'withdrawal' && transaction.status === 'pending') {
      const withdrawalId = transaction.metadata?.withdrawalId;
      if (withdrawalId) {
        const status = await BybitService.checkTransactionStatus(withdrawalId);
        
        // Se a transação foi concluída, atualizar no banco de dados
        if (status.status === 'completed') {
          transaction.status = 'completed';
          transaction.completedAt = new Date();
          await transaction.save();
          
          // Atualizar saldo do usuário
          const user = await User.findById(req.user._id);
          user.pendingWithdrawals -= transaction.amount;
          await user.save();
        }
        
        return res.json({
          success: true,
          data: {
            transaction,
            bybitStatus: status
          }
        });
      }
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Erro ao verificar status da transação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para obter histórico de transações
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    // Construir filtro
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao obter histórico de transações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;