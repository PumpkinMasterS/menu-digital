const express = require('express');
const router = express.Router();
const { protectAdmin, superAdmin, hasPermission, adminOrPermission } = require('../middleware/auth-admin');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const ReferralReward = require('../models/ReferralReward');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const Commission = require('../models/Commission');
const LeadershipBonus = require('../models/LeadershipBonus');
const LeadershipBonusService = require('../services/LeadershipBonusService');
const mongoose = require('mongoose');

// Dashboard administrativo - estatísticas gerais
router.get('/dashboard', protectAdmin, async (req, res) => {
  try {
    // Estatísticas de usuários
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Estatísticas financeiras
    const totalInvestments = await Investment.countDocuments();
    const activeInvestments = await Investment.countDocuments({ status: 'active' });
    const totalInvestmentAmount = await Investment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalTransactions = await Transaction.countDocuments();
    const totalTransactionVolume = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Estatísticas de tarefas
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });

    // Estatísticas de indicações
    const totalReferrals = await User.aggregate([
      { $match: { 'referrals.0': { $exists: true } } },
      { $group: { _id: null, total: { $sum: { $size: '$referrals' } } } }
    ]);
    
    const totalReferralEarnings = await ReferralReward.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday
      },
      financial: {
        totalInvestments: totalInvestments,
        activeInvestments: activeInvestments,
        totalInvestmentAmount: totalInvestmentAmount[0]?.total || 0,
        totalTransactions: totalTransactions,
        totalTransactionVolume: totalTransactionVolume[0]?.total || 0
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0
      },
      referrals: {
        total: totalReferrals[0]?.total || 0,
        totalEarnings: totalReferralEarnings[0]?.total || 0
      },
      timestamp: new Date()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lista de usuários para administração
router.get('/users', protectAdmin, adminOrPermission('users', 'read'), async (req, res) => {
  console.log('Acessando rota GET /users');
  console.log('Parâmetros de query:', req.query);
  console.log('Admin autenticado:', req.user.email, 'role:', req.user.role);

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log('Usuários encontrados:', users.length);
    console.log('Total de usuários:', totalUsers);

    res.json({
      success: true,
      users,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Erro ao obter usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter usuários'
    });
  }
});

// Obter detalhes de um usuário específico
router.get('/users/:userId', protectAdmin, adminOrPermission('users', 'read'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('investments')
      .populate('referrals')
      .populate('transactions');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Estatísticas de crescimento (últimos 30 dias)
router.get('/growth-stats', protectAdmin, adminOrPermission('users', 'read'), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Novos usuários por dia
    const newUsersByDay = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Novos investimentos por dia
    const newInvestmentsByDay = await Investment.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Volume de transações por dia
    const transactionVolumeByDay = await Transaction.aggregate([
      { $match: { 
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo } 
      }},
      { $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      users: newUsersByDay,
      investments: newInvestmentsByDay,
      transactions: transactionVolumeByDay
    });
  } catch (error) {
    console.error('Error fetching growth stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Atualizar saldo de usuário (crédito/débito)
router.post('/users/:userId/balance', protectAdmin, adminOrPermission('financial', 'manage_balances'), async (req, res) => {
  try {
    const { amount, type, reason, description } = req.body;
    const userId = req.params.userId;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor deve ser maior que zero'
      });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo deve ser credit ou debit'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Motivo é obrigatório'
      });
    }

    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Calcular novo saldo
    const adjustmentAmount = type === 'credit' ? amount : -amount;
    const newBalance = user.balance + adjustmentAmount;

    // Verificar se não ficará negativo
    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Saldo insuficiente para débito'
      });
    }

    // Atualizar saldo do usuário
    user.balance = newBalance;
    await user.save();

    // Criar transação
    const transaction = await Transaction.create({
      user: userId,
      type: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount: adjustmentAmount,
      description: description || `Ajuste administrativo: ${reason}`,
      status: 'completed',
      metadata: {
        adminId: req.user.id,
        adminEmail: req.user.email,
        reason: reason,
        previousBalance: user.balance - adjustmentAmount,
        newBalance: newBalance
      }
    });

    // Registrar em auditoria
    await AuditLog.create({
      userId: req.user.id,
      action: 'balance_adjustment',
      resource: 'User',
      resourceId: userId,
      details: {
        type: type,
        amount: amount,
        reason: reason,
        previousBalance: user.balance - adjustmentAmount,
        newBalance: newBalance
      }
    });

    res.json({
      success: true,
      message: `Saldo ${type === 'credit' ? 'creditado' : 'débitado'} com sucesso`,
      data: {
        userId: userId,
        previousBalance: user.balance - adjustmentAmount,
        newBalance: newBalance,
        adjustmentAmount: adjustmentAmount,
        transactionId: transaction.id
      }
    });

  } catch (error) {
    console.error('Erro ao ajustar saldo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter rede de referências de um usuário (árvore MLM)
router.get('/users/:userId/network', protectAdmin, adminOrPermission('users', 'read'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const levels = parseInt(req.query.levels) || 5;

    // Buscar usuário base
    const user = await User.findById(userId).select('name email referralCode createdAt');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Função recursiva para construir árvore
    async function buildNetworkTree(userId, currentLevel = 0, maxLevel = 5) {
      if (currentLevel >= maxLevel) return null;

      const referrals = await User.find({ referredBy: userId })
        .select('name email referralCode balance createdAt')
        .populate('referrals', 'name email referralCode balance createdAt');

      if (referrals.length === 0) return null;

      const network = [];
      for (const referral of referrals) {
        const referralData = {
          user: {
            id: referral._id,
            name: referral.name,
            email: referral.email,
            referralCode: referral.referralCode,
            balance: referral.balance,
            createdAt: referral.createdAt
          },
          level: currentLevel + 1,
          referralsCount: referral.referrals ? referral.referrals.length : 0
        };

        // Recursivamente buscar próximo nível
        const subNetwork = await buildNetworkTree(referral._id, currentLevel + 1, maxLevel);
        if (subNetwork) {
          referralData.referrals = subNetwork;
        }

        network.push(referralData);
      }

      return network;
    }

    // Construir árvore completa
    const networkTree = await buildNetworkTree(userId, 0, levels);

    // Calcular estatísticas da rede
    let totalMembers = 0;
    let membersByLevel = {};
    let totalEarnings = 0;

    function calculateStats(network, level = 0) {
      if (!network) return;

      for (const node of network) {
        totalMembers++;
        membersByLevel[level + 1] = (membersByLevel[level + 1] || 0) + 1;
        totalEarnings += node.user.balance || 0;

        if (node.referrals) {
          calculateStats(node.referrals, level + 1);
        }
      }
    }

    if (networkTree) {
      calculateStats(networkTree);
    }

    res.json({
      success: true,
      data: {
        baseUser: user,
        network: networkTree || [],
        stats: {
          totalMembers: totalMembers,
          membersByLevel: membersByLevel,
          totalNetworkEarnings: totalEarnings,
          maxLevelReached: Object.keys(membersByLevel).length
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar rede de referências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar status do usuário (ativo/inativo)
router.patch('/users/:userId/status', protectAdmin, adminOrPermission('users', 'write'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.userId;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive deve ser true ou false'
      });
    }

    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Não permitir desativar o próprio admin
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode alterar seu próprio status'
      });
    }

    // Atualizar status
    user.isActive = isActive;
    await user.save();

    // Registrar em auditoria
    await AuditLog.create({
      userId: req.user.id,
      action: 'user_status_change',
      resource: 'User',
      resourceId: userId,
      details: {
        previousStatus: !isActive,
        newStatus: isActive,
        action: isActive ? 'activate' : 'deactivate'
      }
    });

    res.json({
      success: true,
      message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
      data: {
        userId: userId,
        isActive: isActive
      }
    });

  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Estatísticas de comissões
router.get('/commissions/stats', protectAdmin, adminOrPermission('commissions', 'read'), async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Construir filtro de data
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Construir filtro completo
    const filter = {};
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }
    if (status) {
      filter.status = status;
    }

    // Agregações para estatísticas
    const stats = await Commission.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCommissions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
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

    // Comissões por nível
    const commissionsByLevel = await Commission.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top usuários por comissões
    const topUsers = await Commission.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$user',
          totalCommissions: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          totalCommissions: 1,
          totalAmount: 1
        }
      }
    ]);

    // Comissões por status
    const statusStats = await Commission.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalCommissions: 0,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0
        },
        byLevel: commissionsByLevel,
        byStatus: statusStats,
        topUsers: topUsers,
        filters: {
          startDate,
          endDate,
          status
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de comissões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Logs de auditoria
router.get('/audit-logs', protectAdmin, adminOrPermission('audit', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;

    // Construir filtro
    const filter = {};
    if (userId) {
      filter.userId = mongoose.Types.ObjectId(userId);
    }
    if (action) {
      filter.action = action;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Buscar logs com paginação
    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Contar total de documentos
    const totalCount = await AuditLog.countDocuments(filter);

    // Formatar logs
    const formattedLogs = logs.map(log => ({
      id: log._id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      user: log.userId ? {
        id: log.userId._id,
        name: log.userId.name,
        email: log.userId.email
      } : null,
      createdAt: log.createdAt,
      ip: log.ip
    }));

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        filters: {
          userId,
          action,
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rotas de bônus de liderança
router.get('/bonus', protectAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    
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

router.get('/bonus/stats', protectAdmin, async (req, res) => {
  try {
    const stats = await LeadershipBonusService.getBonusStats(req.query.period);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas: ' + error.message });
  }
});

router.post('/bonus/process', protectAdmin, async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ message: 'Período é obrigatório' });
    
    const result = await LeadershipBonusService.processBonuses(period);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar bônus: ' + error.message });
  }
});

router.patch('/bonus/:id/approve', protectAdmin, async (req, res) => {
  try {
    const bonus = await LeadershipBonusService.approveBonus(req.params.id, req.user.id);
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao aprovar bônus: ' + error.message });
  }
});

router.patch('/bonus/:id/reject', protectAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const bonus = await LeadershipBonusService.rejectBonus(req.params.id, reason, req.user.id);
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao rejeitar bônus: ' + error.message });
  }
});

router.get('/bonus/:id', protectAdmin, async (req, res) => {
  try {
    const bonus = await LeadershipBonus.findById(req.params.id)
      .populate('userId', 'name email phone referralCode');
    
    if (!bonus) return res.status(404).json({ message: 'Bônus não encontrado' });
    
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar bônus: ' + error.message });
  }
});

module.exports = router;