const express = require('express');
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const Task = require('../models/Task');
const Referral = require('../models/Referral');

const router = express.Router();

// Obter relatório de performance geral
router.get('/performance', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // Definir datas padrão (últimos 30 dias)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const filterStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const filterEndDate = endDate ? new Date(endDate) : defaultEndDate;
    
    // Estatísticas de usuários
    const userStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          totalInvestment: { $sum: '$totalInvested' },
          totalProfit: { $sum: '$totalProfit' }
        }
      }
    ]);
    
    // Estatísticas de investimentos
    const investmentStats = await Investment.aggregate([
      {
        $match: {
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalInvestments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          activeInvestments: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedInvestments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Estatísticas de transações
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalDeposits: {
            $sum: { $cond: [{ $eq: ['$type', 'deposit'] }, 1, 0] }
          },
          totalWithdrawals: {
            $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, 1, 0] }
          },
          totalProfitTransactions: {
            $sum: { $cond: [{ $eq: ['$type', 'profit'] }, 1, 0] }
          },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Estatísticas de tarefas
    const taskStats = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalReward: { $sum: '$reward' }
        }
      }
    ]);
    
    // Estatísticas de indicações
    const referralStats = await Referral.aggregate([
      {
        $match: {
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          activeReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalCommission: { $sum: '$commission' }
        }
      }
    ]);
    
    // Crescimento ao longo do tempo
    const growthStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          newUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        period: {
          startDate: filterStartDate,
          endDate: filterEndDate
        },
        userStats: userStats[0] || {},
        investmentStats: investmentStats[0] || {},
        transactionStats: transactionStats[0] || {},
        taskStats: taskStats[0] || {},
        referralStats: referralStats[0] || {},
        growthStats
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório de performance:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao gerar relatório'
    });
  }
});

// Obter relatório de usuários detalhado
router.get('/users', protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalUsers = await User.countDocuments();
    
    res.json({
      success: true,
      data: {
        users,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar relatório de usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter relatório financeiro
router.get('/financial', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filterStartDate = startDate ? new Date(startDate) : new Date(0);
    const filterEndDate = endDate ? new Date(endDate) : new Date();
    
    // Total de depósitos
    const totalDeposits = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Total de saques
    const totalWithdrawals = await Transaction.aggregate([
      {
        $match: {
          type: 'withdrawal',
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Total de lucros distribuídos
    const totalProfits = await Transaction.aggregate([
      {
        $match: {
          type: 'profit',
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Total de comissões de indicação
    const totalReferralCommissions = await Transaction.aggregate([
      {
        $match: {
          type: 'referral',
          createdAt: { $gte: filterStartDate, $lte: filterEndDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        deposits: totalDeposits[0] || { total: 0, count: 0 },
        withdrawals: totalWithdrawals[0] || { total: 0, count: 0 },
        profits: totalProfits[0] || { total: 0, count: 0 },
        referralCommissions: totalReferralCommissions[0] || { total: 0, count: 0 },
        period: {
          startDate: filterStartDate,
          endDate: filterEndDate
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;