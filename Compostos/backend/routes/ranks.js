const express = require('express');
const router = express.Router();
const RankService = require('../services/RankService');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/ranks/qualifications
 * @desc    Verificar qualificações do usuário atual
 * @access  Private
 */
router.get('/qualifications', protect, async (req, res) => {
  try {
    const qualifications = await RankService.checkRankQualifications(req.user.id);
    res.json(qualifications);
  } catch (error) {
    console.error('Erro ao verificar qualificações:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar qualificações',
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/ranks/leaderboard
 * @desc    Obter leaderboard de ranks
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await RankService.getRankLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('Erro ao obter leaderboard:', error);
    res.status(500).json({ 
      error: 'Erro ao obter leaderboard',
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/ranks/network-stats
 * @desc    Obter estatísticas da rede do usuário
 * @access  Private
 */
router.get('/network-stats', protect, async (req, res) => {
  try {
    const stats = await RankService.calculateTeamStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas da rede:', error);
    res.status(500).json({ 
      error: 'Erro ao obter estatísticas da rede',
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/ranks/promote/:userId
 * @desc    Promover usuário manualmente (apenas admin)
 * @access  Private/Admin
 */
router.post('/promote/:userId', protect, authorize(['admin']), async (req, res) => {
  try {
    const { rankName } = req.body;
    const result = await RankService.promoteUser(req.params.userId, rankName);
    res.json(result);
  } catch (error) {
    console.error('Erro ao promover usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao promover usuário',
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/ranks/check-promotions
 * @desc    Executar verificação automática de promoções (apenas admin)
 * @access  Private/Admin
 */
router.post('/check-promotions', protect, authorize(['admin']), async (req, res) => {
  try {
    const result = await RankService.checkAndPromoteUsers();
    res.json({
      message: 'Verificação de promoções concluída',
      ...result
    });
  } catch (error) {
    console.error('Erro na verificação de promoções:', error);
    res.status(500).json({ 
      error: 'Erro na verificação de promoções',
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/ranks/:userId/qualifications
 * @desc    Verificar qualificações de um usuário específico (apenas admin)
 * @access  Private/Admin
 */
router.get('/:userId/qualifications', protect, authorize(['admin']), async (req, res) => {
  try {
    const qualifications = await RankService.checkRankQualifications(req.params.userId);
    res.json(qualifications);
  } catch (error) {
    console.error('Erro ao verificar qualificações:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar qualificações',
      message: error.message 
    });
  }
});

module.exports = router;