const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const BEP20Service = require('../services/BEP20Service');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Inicializar serviço
const bep20Service = new BEP20Service();

// @route   GET /api/bep20/tokens
// @desc    Obter tokens suportados
// @access  Private
router.get('/tokens', protect, async (req, res) => {
  try {
    const tokens = Object.keys(bep20Service.tokens).map(symbol => ({
      symbol,
      ...bep20Service.tokens[symbol]
    }));
    
    const fees = bep20Service.getWithdrawalFees();
    
    res.json({
      success: true,
      data: {
        tokens,
        fees,
        network: 'BEP20 (BSC)'
      }
    });
  } catch (error) {
    console.error('Erro ao obter tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/bep20/deposit/address
// @desc    Gerar endereço de depósito
// @access  Private
router.post('/deposit/address', protect, async (req, res) => {
  try {
    const { currency = 'USDT' } = req.body;
    
    // Verificar se o token é suportado
    const tokenInfo = bep20Service.getTokenInfo(currency);
    if (!tokenInfo) {
      return res.status(400).json({
        success: false,
        message: 'Token não suportado'
      });
    }
    
    // Gerar endereço de depósito
    const depositInfo = await bep20Service.generateDepositAddress(req.user._id, currency);
    
    res.json({
      success: true,
      data: depositInfo
    });
  } catch (error) {
    console.error('Erro ao gerar endereço de depósito:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/bep20/deposit/verify
// @desc    Verificar e processar depósito
// @access  Private
router.post('/deposit/verify', protect, async (req, res) => {
  try {
    const { txHash, amount, currency = 'USDT' } = req.body;
    
    if (!txHash || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Hash da transação e valor são obrigatórios'
      });
    }
    
    // Verificar se a transação já foi processada
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      return res.status(400).json({
        success: false,
        message: 'Transação já processada'
      });
    }
    
    // Obter informações do depósito
    const depositInfo = await bep20Service.generateDepositAddress(req.user._id, currency);
    
    // Verificar transação na blockchain
    const verification = await bep20Service.verifyTransaction(
      txHash,
      amount,
      null, // fromAddress não é necessário para verificação
      depositInfo.address,
      currency
    );
    
    if (!verification.confirmed) {
      return res.status(400).json({
        success: false,
        message: verification.message || 'Transação não confirmada'
      });
    }
    
    // Criar registro de transação
    const transaction = new Transaction({
      user: req.user._id,
      type: 'deposit',
      amount: amount,
      currency: currency,
      network: 'BEP20',
      txHash: txHash,
      status: 'completed',
      fromAddress: verification.from,
      toAddress: verification.to,
      description: `Depósito de ${amount} ${currency}`,
      metadata: {
        tokenAddress: bep20Service.tokens[currency].address,
        decimals: bep20Service.tokens[currency].decimals,
        network: 'BSC',
        blockNumber: verification.blockNumber,
        explorerUrl: `https://bscscan.com/tx/${txHash}`
      }
    });
    
    await transaction.save();
    
    // Atualizar saldo do usuário
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { balance: amount }
    });
    
    res.json({
      success: true,
      message: 'Depósito confirmado e creditado com sucesso',
      data: {
        transactionId: transaction._id,
        amount: amount,
        currency: currency,
        status: 'completed',
        explorerUrl: `https://bscscan.com/tx/${txHash}`
      }
    });
  } catch (error) {
    console.error('Erro ao verificar depósito:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/bep20/withdrawal
// @desc    Solicitar saque
// @access  Private
router.post('/withdrawal', protect, async (req, res) => {
  try {
    const { amount, toAddress, currency = 'USDT' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor de saque inválido'
      });
    }
    
    if (!toAddress) {
      return res.status(400).json({
        success: false,
        message: 'Endereço de destino é obrigatório'
      });
    }
    
    // Validar formato do endereço BEP20
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      return res.status(400).json({
        success: false,
        message: 'Endereço BEP20 inválido'
      });
    }
    
    // Verificar se o token é suportado
    const tokenInfo = bep20Service.getTokenInfo(currency);
    if (!tokenInfo) {
      return res.status(400).json({
        success: false,
        message: 'Token não suportado'
      });
    }
    
    // Processar saque
    const withdrawalResult = await bep20Service.processWithdrawal(
      req.user._id,
      amount,
      toAddress,
      currency
    );
    
    res.json({
      success: true,
      message: withdrawalResult.message,
      data: withdrawalResult
    });
  } catch (error) {
    console.error('Erro ao processar saque:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/bep20/transactions
// @desc    Obter histórico de transações do usuário
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    // Construir filtro
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    // Obter transações
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');
    
    // Obter total para paginação
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter transações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/bep20/transactions/:id
// @desc    Obter detalhes de uma transação
// @access  Private
router.get('/transactions/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-__v');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Erro ao obter transação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/bep20/check-pending
// @desc    Verificar transações pendentes (endpoint para sistema interno)
// @access  Private/Admin
router.post('/check-pending', protect, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const results = await bep20Service.checkPendingTransactions();
    
    res.json({
      success: true,
      message: `${results.length} transações verificadas`,
      data: results
    });
  } catch (error) {
    console.error('Erro ao verificar transações pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
