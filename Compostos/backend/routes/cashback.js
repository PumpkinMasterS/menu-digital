const express = require('express');
const CashbackService = require('../services/cashbackService');
const Investment = require('../models/Investment');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Calcular cashback para um investimento
// @route   POST /api/cashback/calculate
// @access  Private
router.post('/calculate', protect, async (req, res) => {
  try {
    const { amount, robotType } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor do investimento é obrigatório e deve ser maior que zero'
      });
    }

    const calculation = await CashbackService.calculateCashback(amount, req.user.id, robotType);
    
    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Erro ao calcular cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @desc    Aplicar cashback a um investimento
// @route   POST /api/cashback/apply/:investmentId
// @access  Private
router.post('/apply/:investmentId', protect, async (req, res) => {
  try {
    const { investmentId } = req.params;
    
    const result = await CashbackService.applyCashbackToInvestment(investmentId, req.user.id);
    
    res.status(200).json({
      success: result.success,
      message: result.message,
      data: {
        cashback: result.cashback,
        rules: result.rules
      }
    });
  } catch (error) {
    console.error('Erro ao aplicar cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @desc    Obter histórico de cashback do usuário
// @route   GET /api/cashback/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const history = await CashbackService.getUserCashbackHistory(
      req.user.id,
      parseInt(limit),
      parseInt(page)
    );
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @desc    Obter estatísticas de cashback (Admin)
// @route   GET /api/cashback/stats
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const stats = await CashbackService.getCashbackStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @desc    Atualizar regras de cashback (Admin)
// @route   PUT /api/cashback/rules
// @access  Private/Admin
router.put('/rules', protect, admin, async (req, res) => {
  try {
    const { rules } = req.body;
    
    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        message: 'Regras devem ser um array'
      });
    }

    CashbackService.updateCashbackRules(rules);
    
    res.status(200).json({
      success: true,
      message: 'Regras de cashback atualizadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar regras de cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @desc    Adicionar promoção especial (Admin)
// @route   POST /api/cashback/promotions
// @access  Private/Admin
router.post('/promotions', protect, admin, async (req, res) => {
  try {
    const { promotion } = req.body;
    
    if (!promotion || !promotion.name || !promotion.rate) {
      return res.status(400).json({
        success: false,
        message: 'Promoção deve ter nome e taxa'
      });
    }

    CashbackService.addSpecialPromotion(promotion);
    
    res.status(200).json({
      success: true,
      message: 'Promoção adicionada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao adicionar promoção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;