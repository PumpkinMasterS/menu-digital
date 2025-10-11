const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Robot = require('../models/Robot');
const Investment = require('../models/Investment');
const AchievementService = require('../services/achievementService');

// @route   GET /api/robots
// @desc    Get all available robots for investment
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const robots = await Robot.find({ status: 'active' })
      .select('name description dailyProfit minInvestment maxInvestment duration riskLevel imageUrl totalInvestors totalInvested')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: robots,
      count: robots.length
    });
  } catch (error) {
    console.error('Error fetching robots:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar robôs disponíveis',
      error: error.message
    });
  }
});

// @route   GET /api/robots/user
// @desc    Get user's invested robots
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const userInvestments = await Investment.find({ 
      user: req.user.id, 
      status: 'active' 
    }).populate('robot', 'name description dailyProfit imageUrl riskLevel');
    
    const userRobots = userInvestments.map(investment => ({
      investmentId: investment._id,
      robot: investment.robot,
      amount: investment.amount,
      dailyProfit: investment.dailyProfit,
      totalProfit: investment.totalProfit,
      startDate: investment.startDate,
      endDate: investment.endDate,
      daysRemaining: investment.daysRemaining,
      status: investment.status
    }));
    
    res.json({
      success: true,
      data: userRobots,
      totalInvested: userInvestments.reduce((sum, inv) => sum + inv.amount, 0),
      totalDailyProfit: userInvestments.reduce((sum, inv) => sum + (inv.amount * inv.dailyProfit / 100), 0),
      count: userInvestments.length
    });
  } catch (error) {
    console.error('Error fetching user robots:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar robôs do usuário',
      error: error.message
    });
  }
});

// @route   GET /api/robots/:id
// @desc    Get robot by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const robot = await Robot.findById(req.params.id);
    
    if (!robot) {
      return res.status(404).json({
        success: false,
        message: 'Robô não encontrado'
      });
    }
    
    // Buscar estatísticas de investimentos para este robô
    const investmentStats = await Investment.aggregate([
      { $match: { robot: robot._id, status: 'active' } },
      {
        $group: {
          _id: '$robot',
          totalInvestors: { $sum: 1 },
          totalInvested: { $sum: '$amount' },
          totalProfit: { $sum: '$totalProfit' }
        }
      }
    ]);
    
    const stats = investmentStats[0] || { totalInvestors: 0, totalInvested: 0, totalProfit: 0 };
    
    const robotWithStats = {
      ...robot.toObject(),
      stats: {
        totalInvestors: stats.totalInvestors,
        totalInvested: stats.totalInvested,
        totalProfit: stats.totalProfit,
        averageInvestment: stats.totalInvestors > 0 ? stats.totalInvested / stats.totalInvestors : 0
      }
    };
    
    res.json({
      success: true,
      data: robotWithStats
    });
  } catch (error) {
    console.error('Error fetching robot:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar robô',
      error: error.message
    });
  }
});

// @route   POST /api/robots
// @desc    Create new investment in a robot
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { robotId, amount } = req.body;
    
    if (!robotId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'ID do robô e valor do investimento são obrigatórios'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor do investimento deve ser maior que zero'
      });
    }
    
    // Buscar robô
    const robot = await Robot.findById(robotId);
    if (!robot) {
      return res.status(404).json({
        success: false,
        message: 'Robô não encontrado'
      });
    }
    
    // Validar valor do investimento
    if (amount < robot.minInvestment) {
      return res.status(400).json({
        success: false,
        message: `Valor mínimo de investimento: €${robot.minInvestment.toFixed(2)}`
      });
    }
    
    if (amount > robot.maxInvestment) {
      return res.status(400).json({
        success: false,
        message: `Valor máximo de investimento: €${robot.maxInvestment.toFixed(2)}`
      });
    }
    
    // Verificar se usuário já tem investimento ativo neste robô
    const existingInvestment = await Investment.findOne({
      user: req.user.id,
      robot: robotId,
      status: 'active'
    });
    
    if (existingInvestment) {
      return res.status(400).json({
        success: false,
        message: 'Você já tem um investimento ativo neste robô'
      });
    }
    
    // Criar novo investimento
    const investment = new Investment({
      user: req.user.id,
      robot: robotId,
      amount: amount,
      dailyProfit: robot.dailyProfit,
      duration: robot.duration,
      expectedTotalProfit: (amount * robot.dailyProfit * robot.duration) / 100
    });
    
    await investment.save();
    
    // Verificar conquistas relacionadas a investimentos
    await AchievementService.checkInvestmentAchievements(req.user.id, amount);
    
    // Popular dados para resposta
    await investment.populate('robot', 'name description dailyProfit imageUrl');
    
    res.status(201).json({
      success: true,
      message: 'Investimento realizado com sucesso!',
      data: investment
    });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar investimento',
      error: error.message
    });
  }
});

// @route   GET /api/robots/stats/overview
// @desc    Get robots overview statistics
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Estatísticas do usuário
    const userStats = await Investment.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: '$amount' },
          totalProfit: { $sum: '$totalProfit' },
          activeInvestments: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
          },
          totalInvestments: { $sum: 1 }
        }
      }
    ]);
    
    // Estatísticas gerais dos robôs
    const generalStats = await Investment.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalPlatformInvested: { $sum: '$amount' },
          totalPlatformProfit: { $sum: '$totalProfit' },
          totalActiveInvestments: { $sum: 1 },
          totalUniqueInvestors: { $addToSet: '$user' }
        }
      }
    ]);
    
    const stats = {
      user: userStats[0] || { 
        totalInvested: 0, 
        totalProfit: 0, 
        activeInvestments: 0, 
        totalInvestments: 0 
      },
      platform: {
        totalInvested: generalStats[0]?.totalPlatformInvested || 0,
        totalProfit: generalStats[0]?.totalPlatformProfit || 0,
        activeInvestments: generalStats[0]?.totalActiveInvestments || 0,
        uniqueInvestors: generalStats[0]?.totalUniqueInvestors?.length || 0
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching robot stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    });
  }
});

module.exports = router;