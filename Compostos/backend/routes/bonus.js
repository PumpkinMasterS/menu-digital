const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth-admin');
const LeadershipBonus = require('../models/LeadershipBonus');
const LeadershipBonusService = require('../services/LeadershipBonusService');

// GET /api/admin/bonus - Listar bônus com filtros
router.get('/', protectAdmin, async (req, res) => {
  try {
    const { status, type, period, userId, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (period) query.period = period;
    if (userId) query.userId = userId;
    
    const bonuses = await LeadershipBonus.find(query)
      .populate('userId', 'name email referralCode')
      .sort({ calculatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await LeadershipBonus.countDocuments(query);
    
    res.json({
      bonuses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar bônus: ' + error.message });
  }
});

// GET /api/admin/bonus/stats - Estatísticas de bônus
router.get('/stats', protectAdmin, async (req, res) => {
  try {
    const stats = await LeadershipBonusService.getBonusStats(req.query.period);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas: ' + error.message });
  }
});

// POST /api/admin/bonus/process - Processar bônus para um período
router.post('/process', protectAdmin, async (req, res) => {
  try {
    const { period } = req.body;
    
    if (!period) {
      return res.status(400).json({ message: 'Período é obrigatório' });
    }
    
    const result = await LeadershipBonusService.processBonuses(period);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar bônus: ' + error.message });
  }
});

// PATCH /api/admin/bonus/:id/approve - Aprovar bônus
router.patch('/:id/approve', protectAdmin, async (req, res) => {
  try {
    const bonus = await LeadershipBonusService.approveBonus(
      req.params.id,
      req.user.id
    );
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao aprovar bônus: ' + error.message });
  }
});

// PATCH /api/admin/bonus/:id/reject - Rejeitar bônus
router.patch('/:id/reject', protectAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const bonus = await LeadershipBonusService.rejectBonus(
      req.params.id,
      reason,
      req.user.id
    );
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao rejeitar bônus: ' + error.message });
  }
});

// GET /api/admin/bonus/:id - Detalhes do bônus
router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const bonus = await LeadershipBonus.findById(req.params.id)
      .populate('userId', 'name email phone referralCode');
    
    if (!bonus) {
      return res.status(404).json({ message: 'Bônus não encontrado' });
    }
    
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar bônus: ' + error.message });
  }
});

module.exports = router;