const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const User = require('../models/User');

// @route   GET /api/achievements
// @desc    Obter todos os achievements disponíveis
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const achievements = await Achievement.find({ isActive: true })
      .sort({ points: -1 });
    
    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Erro ao obter achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/achievements/user
// @desc    Obter achievements do usuário
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('achievements.achievement');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user.achievements
    });
  } catch (error) {
    console.error('Erro ao obter achievements do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/achievements/:id/claim
// @desc    Resgatar um achievement
// @access  Private
router.post('/:id/claim', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o achievement existe
    const achievement = await Achievement.findById(id);
    
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement não encontrado'
      });
    }
    
    // Verificar se o usuário já resgatou este achievement
    const user = await User.findById(req.user._id);
    const alreadyClaimed = user.achievements.some(
      a => a.achievement.toString() === id
    );
    
    if (alreadyClaimed) {
      return res.status(400).json({
        success: false,
        message: 'Você já resgatou este achievement'
      });
    }
    
    // Adicionar achievement ao usuário
    user.achievements.push({
      achievement: id,
      claimedAt: new Date()
    });
    
    // Adicionar pontos ao usuário
    user.points += achievement.points;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Achievement resgatado com sucesso',
      data: {
        achievement,
        points: achievement.points,
        totalPoints: user.points
      }
    });
  } catch (error) {
    console.error('Erro ao resgatar achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

