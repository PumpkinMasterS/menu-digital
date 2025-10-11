const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const ReferralReward = require('../models/ReferralReward');
const TaskCompletion = require('../models/TaskCompletion');
const RealtimeDashboardService = require('../services/RealtimeDashboardService');

router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('referrals');
    const investments = await Investment.find({ user: userId }).populate('robot');
    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const referralRewards = await ReferralReward.find({ user: userId });
    
    // Buscar estatísticas de tarefas
    const taskCompletions = await TaskCompletion.find({ 
      user: userId, 
      status: { $in: ['pending', 'completed'] } 
    });
    
    const pendingTasks = taskCompletions.filter(tc => tc.status === 'pending').length;
    const completedTasks = taskCompletions.filter(tc => tc.status === 'completed').length;

    let dailyEarnings = 0;
    activeInvestments.forEach(inv => {
      dailyEarnings += (inv.amount * inv.robot.dailyProfit / 100);
    });

    const totalReferralEarnings = referralRewards.reduce((sum, r) => sum + r.amount, 0);

    const stats = {
      totalBalance: user.balance,
      dailyEarnings: dailyEarnings,
      totalEarnings: user.totalEarned,
      activeRobots: activeInvestments.length,
      totalRobots: investments.length,
      pendingTasks: pendingTasks,
      completedTasks: completedTasks,
      totalReferrals: user.referrals ? user.referrals.length : 0,
      referralEarnings: totalReferralEarnings
    };

    // Iniciar monitoramento em tempo real para este usuário
    RealtimeDashboardService.startMonitoring(userId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint para parar monitoramento em tempo real
router.post('/stop-realtime', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    RealtimeDashboardService.stopMonitoring(userId);
    
    res.json({ 
      message: 'Monitoramento em tempo real parado com sucesso',
      success: true 
    });
  } catch (error) {
    console.error('Error stopping realtime monitoring:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint para estatísticas do serviço de tempo real
router.get('/realtime-stats', protect, (req, res) => {
  try {
    const stats = RealtimeDashboardService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching realtime stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint para dados históricos para gráficos
router.get('/history', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '7d' } = req.query; // 7d, 30d, 90d
    
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Buscar transações do usuário
    const transactions = await Transaction.find({
      user: userId,
      createdAt: { $gte: startDate },
      status: 'completed'
    }).sort({ createdAt: 1 });
    
    // Buscar investimentos ativos para calcular ganhos diários
    const investments = await Investment.find({ 
      user: userId, 
      status: 'active' 
    }).populate('robot');
    
    // Buscar recompensas de tarefas
    const taskRewards = await TaskCompletion.find({
      user: userId,
      status: 'claimed',
      completedAt: { $gte: startDate }
    });
    
    // Buscar ganhos de indicação
    const referralRewards = await ReferralReward.find({
      user: userId,
      createdAt: { $gte: startDate }
    });
    
    // Agrupar dados por dia
    const dailyData = {};
    const currentDate = new Date(startDate);
    
    // Inicializar todos os dias com zero
    while (currentDate <= new Date()) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        earnings: 0,
        investments: 0,
        taskRewards: 0,
        referralRewards: 0,
        balance: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Processar transações
    transactions.forEach(transaction => {
      const dateKey = transaction.createdAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        if (transaction.type === 'profit') {
          dailyData[dateKey].earnings += transaction.amount;
        } else if (transaction.type === 'investment') {
          dailyData[dateKey].investments += Math.abs(transaction.amount);
        }
      }
    });
    
    // Processar recompensas de tarefas
    taskRewards.forEach(reward => {
      const dateKey = reward.completedAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].taskRewards += reward.reward;
        dailyData[dateKey].earnings += reward.reward;
      }
    });
    
    // Processar ganhos de indicação
    referralRewards.forEach(reward => {
      const dateKey = reward.createdAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].referralRewards += reward.amount;
        dailyData[dateKey].earnings += reward.amount;
      }
    });
    
    // Calcular saldo acumulado
    let runningBalance = 0;
    const sortedDates = Object.keys(dailyData).sort();
    
    sortedDates.forEach(date => {
      runningBalance += dailyData[date].earnings;
      dailyData[date].balance = runningBalance;
    });
    
    // Converter para array ordenado
    const historyData = sortedDates.map(date => dailyData[date]);
    
    res.json({
      success: true,
      data: historyData,
      period: period,
      totalDays: days
    });
    
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar dados históricos',
      error: error.message 
    });
  }
});

// 📊 Dashboard visual da rede de referências
router.get('/network', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { levels = 5 } = req.query;
    
    // Buscar a rede completa do usuário
    const network = await getFullNetwork(userId, parseInt(levels));
    
    // Calcular estatísticas da rede
    const networkStats = await calculateNetworkStats(userId, parseInt(levels));
    
    res.json({
      success: true,
      data: {
        network: network,
        stats: networkStats
      }
    });
    
  } catch (error) {
    console.error('Error fetching network dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar dados da rede',
      error: error.message 
    });
  }
});

// Função auxiliar para buscar rede completa
async function getFullNetwork(userId, maxLevels) {
  const user = await User.findById(userId).populate({
    path: 'referrals',
    populate: {
      path: 'referrals',
      populate: {
        path: 'referrals',
        populate: {
          path: 'referrals',
          populate: {
            path: 'referrals'
          }
        }
      }
    }
  });
  
  return buildNetworkTree(user, 1, maxLevels);
}

// Função recursiva para construir árvore da rede
function buildNetworkTree(user, currentLevel, maxLevels) {
  if (!user || currentLevel > maxLevels) return null;
  
  const node = {
    id: user._id,
    name: user.name,
    email: user.email,
    level: currentLevel,
    joinDate: user.createdAt,
    status: user.status,
    referrals: []
  };
  
  if (user.referrals && user.referrals.length > 0 && currentLevel < maxLevels) {
    node.referrals = user.referrals.map(ref => 
      buildNetworkTree(ref, currentLevel + 1, maxLevels)
    ).filter(Boolean);
  }
  
  return node;
}

// Função para calcular estatísticas da rede
async function calculateNetworkStats(userId, maxLevels) {
  const stats = {
    totalMembers: 0,
    membersByLevel: {},
    activeMembers: 0,
    totalCommissionEarnings: 0,
    pendingCommissions: 0
  };
  
  // Inicializar contadores por nível
  for (let i = 1; i <= maxLevels; i++) {
    stats.membersByLevel[i] = 0;
  }
  
  // Buscar todas as comissões do usuário
  const commissions = await Commission.find({ referrerId: userId });
  
  commissions.forEach(commission => {
    if (commission.status === 'paid') {
      stats.totalCommissionEarnings += commission.amount;
    } else if (commission.status === 'pending' || commission.status === 'approved') {
      stats.pendingCommissions += commission.amount;
    }
    
    // Contar membros por nível
    if (commission.level <= maxLevels) {
      stats.membersByLevel[commission.level]++;
      stats.totalMembers++;
    }
  });
  
  return stats;
}

module.exports = router;