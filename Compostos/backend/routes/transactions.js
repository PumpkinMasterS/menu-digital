const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @route   GET /api/transactions/user
// @desc    Obter transações do usuário
// @access  Private
router.get('/user', protect, async (req, res) => {
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
    console.error('Erro ao obter transações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Obter detalhes de uma transação
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      });
    }
    
    // Verificar se a transação pertence ao usuário ou se é admin
    if (transaction.user.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
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

// @route   GET /api/transactions
// @desc    Obter todas as transações (admin)
// @access  Private/Admin
router.get('/', protect, async (req, res) => {
  try {
    // Verificar se é admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { page = 1, limit = 10, type, status, userId } = req.query;
    
    // Construir filtro
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userId) filter.user = userId;
    
    const transactions = await Transaction.find(filter)
      .populate('user')
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
    console.error('Erro ao obter transações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

