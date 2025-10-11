const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Investment = require('../models/Investment');
const TaskCompletion = require('../models/TaskCompletion');

// @route   GET /api/users/profile
// @desc    Get current user profile with complete data
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('referrals', 'name email createdAt')
      .populate('referredBy', 'name email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil do usuário',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const allowedUpdates = {};
    
    if (name !== undefined) allowedUpdates.name = name;
    if (phone !== undefined) allowedUpdates.phone = phone;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      allowedUpdates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Estatísticas de investimentos
    const investmentStats = await Investment.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: '$amount' },
          totalProfit: { $sum: '$totalProfit' },
          activeInvestments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          totalInvestments: { $sum: 1 }
        }
      }
    ]);
    
    // Estatísticas de tarefas
    const taskStats = await TaskCompletion.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), status: 'claimed' } },
      {
        $group: {
          _id: null,
          totalTaskRewards: { $sum: '$reward' },
          totalTasksCompleted: { $sum: 1 }
        }
      }
    ]);
    
    // Buscar dados do usuário
    const user = await User.findById(userId);
    
    const stats = {
      balance: user.balance,
      totalInvested: investmentStats[0]?.totalInvested || 0,
      totalEarned: user.totalEarned,
      totalProfit: investmentStats[0]?.totalProfit || 0,
      activeInvestments: investmentStats[0]?.activeInvestments || 0,
      totalInvestments: investmentStats[0]?.totalInvestments || 0,
      totalTaskRewards: taskStats[0]?.totalTaskRewards || 0,
      totalTasksCompleted: taskStats[0]?.totalTasksCompleted || 0,
      referralCount: user.referralCount || 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    });
  }
});

// @route   GET /api/users/transactions
// @desc    Get user transaction history
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Buscar investimentos
    const investments = await Investment.find({ user: userId })
      .populate('robot', 'name dailyProfit')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Buscar completações de tarefas
    const taskCompletions = await TaskCompletion.find({ 
      user: userId, 
      status: 'claimed' 
    })
      .populate('task', 'title')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Combinar transações
    const transactions = [
      ...investments.map(inv => ({
        id: inv._id,
        type: 'investment',
        amount: -inv.amount,
        description: `Investimento - ${inv.robot?.name || 'Robô'}`,
        date: inv.createdAt,
        status: inv.status
      })),
      ...investments.filter(inv => inv.totalProfit > 0).map(inv => ({
        id: inv._id + '_profit',
        type: 'profit',
        amount: inv.totalProfit,
        description: `Lucro - ${inv.robot?.name || 'Robô'}`,
        date: inv.updatedAt,
        status: 'completed'
      })),
      ...taskCompletions.map(tc => ({
        id: tc._id,
        type: 'task_reward',
        amount: tc.reward,
        description: `Recompensa - ${tc.task?.title || 'Tarefa'}`,
        date: tc.completedAt,
        status: 'completed'
      }))
    ];
    
    // Ordenar por data
    transactions.sort((a, b) => b.date - a.date);
    
    res.json({
      success: true,
      data: transactions.slice(0, limit),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.length
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de transações',
      error: error.message
    });
  }
});

// @route   GET /api/users/referrals
// @desc    Get user referrals with details
// @access  Private
router.get('/referrals', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'referrals',
        select: 'name email createdAt balance',
        options: { sort: { createdAt: -1 } }
      });
    
    res.json({
      success: true,
      data: user.referrals || []
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar referrals',
      error: error.message
    });
  }
});

// @route   GET /api/users/investments
// @desc    Get user investments with details
// @access  Private
router.get('/investments', protect, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.id })
      .populate('robot', 'name dailyProfit minInvestment maxInvestment imageUrl')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: investments
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar investimentos',
      error: error.message
    });
  }
});

module.exports = router;