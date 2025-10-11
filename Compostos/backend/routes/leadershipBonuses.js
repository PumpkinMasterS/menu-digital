const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const LeadershipBonusService = require('../services/LeadershipBonusService');
const LeadershipBonus = require('../models/LeadershipBonus');

// GET /api/leadership-bonuses - Listar bônus do usuário
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, period } = req.query;
    
    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (period) filter.calculationPeriod = period;
    
    const bonuses = await LeadershipBonus.find(filter)
      .select('-metadata')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await LeadershipBonus.countDocuments(filter);
    
    res.json({
      success: true,
      bonuses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar bônus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor ao buscar bônus' 
    });
  }
});

// GET /api/leadership-bonuses/stats - Estatísticas do usuário
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await LeadershipBonus.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalBonuses: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          approvedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalBonuses: 0,
      totalAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0
    };

    res.json({
      success: true,
      stats: result
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// GET /api/leadership-bonuses/:id - Detalhes de bônus específico
router.get('/:id', protect, async (req, res) => {
  try {
    const bonus = await LeadershipBonus.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!bonus) {
      return res.status(404).json({
        success: false,
        message: 'Bônus não encontrado'
      });
    }

    res.json({
      success: true,
      bonus
    });

  } catch (error) {
    console.error('Erro ao buscar bônus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// POST /api/leadership-bonuses/admin/calculate - Calcular bônus (Admin)
router.post('/admin/calculate', protect, admin, async (req, res) => {
  try {
    const { period, bonusType = 'all' } = req.body;
    
    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      });
    }

    const result = await LeadershipBonusService.processBonuses(period, bonusType);
    res.json(result);

  } catch (error) {
    console.error('Erro ao calcular bônus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// GET /api/leadership-bonuses/admin/list - Listar todos os bônus (Admin)
router.get('/admin/list', protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    
    const result = await LeadershipBonusService.listBonuses({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      userId
    });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar bônus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// GET /api/leadership-bonuses/admin/stats - Estatísticas gerais (Admin)
router.get('/admin/stats', protect, admin, async (req, res) => {
  try {
    const stats = await LeadershipBonusService.getBonusStats();
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// PUT /api/leadership-bonuses/admin/approve/:id - Aprovar bônus (Admin)
router.put('/admin/approve/:id', protect, admin, async (req, res) => {
  try {
    const result = await LeadershipBonusService.approveBonus(
      req.params.id, 
      req.user.id
    );
    res.json(result);

  } catch (error) {
    console.error('Erro ao aprovar bônus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// PUT /api/leadership-bonuses/admin/reject/:id - Rejeitar bônus (Admin)
router.put('/admin/reject/:id', protect, admin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const result = await LeadershipBonusService.rejectBonus(
      req.params.id, 
      req.user.id, 
      reason
    );
    res.json(result);

  } catch (error) {
    console.error('Erro ao rejeitar bônus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// PUT /api/leadership-bonuses/admin/mark-paid/:id - Marcar como pago (Admin)
router.put('/admin/mark-paid/:id', protect, admin, async (req, res) => {
  try {
    const bonus = await LeadershipBonus.findById(req.params.id);
    
    if (!bonus) {
      return res.status(404).json({
        success: false,
        message: 'Bônus não encontrado'
      });
    }

    if (bonus.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Apenas bônus aprovados podem ser marcados como pagos'
      });
    }

    bonus.status = 'paid';
    bonus.paidAt = new Date();
    bonus.paidBy = req.user.id;
    await bonus.save();

    res.json({
      success: true,
      message: 'Bônus marcado como pago com sucesso',
      bonus
    });

  } catch (error) {
    console.error('Erro ao marcar bônus como pago:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;