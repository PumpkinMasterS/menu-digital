const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Investment = require('../models/Investment');
const Robot = require('../models/Robot');
const User = require('../models/User');

// @route   GET /api/investments/user
// @desc    Obter investimentos do usuário
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id })
      .populate('robot')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: investments
    });
  } catch (error) {
    console.error('Erro ao obter investimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/investments/:id
// @desc    Obter detalhes de um investimento
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate('robot')
      .populate('user');
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investimento não encontrado'
      });
    }
    
    // Verificar se o investimento pertence ao usuário ou se é admin
    if (investment.user._id.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    res.json({
      success: true,
      data: investment
    });
  } catch (error) {
    console.error('Erro ao obter investimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/investments
// @desc    Obter todos os investimentos (admin)
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
    
    const { page = 1, limit = 10, status, userId } = req.query;
    
    // Construir filtro
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;
    
    const investments = await Investment.find(filter)
      .populate('robot')
      .populate('user')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Investment.countDocuments(filter);
    
    res.json({
      success: true,
      data: investments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao obter investimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
