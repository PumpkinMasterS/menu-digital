const Investment = require('../models/Investment');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');

class RealtimeDashboardService {
  constructor() {
    this.updateIntervals = new Map();
    this.activeUsers = new Set();
    console.log('📊 Serviço de Dashboard em Tempo Real inicializado');
  }

  // Iniciar monitoramento para um usuário
  startMonitoring(userId) {
    if (this.activeUsers.has(userId)) {
      return; // Já está sendo monitorado
    }

    this.activeUsers.add(userId);
    console.log(`👤 Iniciando monitoramento em tempo real para usuário ${userId}`);

    // Configurar intervalo de atualização (a cada 30 segundos)
    const interval = setInterval(async () => {
      try {
        await this.sendDashboardUpdate(userId);
      } catch (error) {
        console.error(`Erro ao atualizar dashboard para usuário ${userId}:`, error);
      }
    }, 30000); // 30 segundos

    this.updateIntervals.set(userId, interval);

    // Enviar atualização imediata
    this.sendDashboardUpdate(userId);
  }

  // Parar monitoramento para um usuário
  stopMonitoring(userId) {
    if (this.updateIntervals.has(userId)) {
      clearInterval(this.updateIntervals.get(userId));
      this.updateIntervals.delete(userId);
    }
    
    this.activeUsers.delete(userId);
    console.log(`👤 Parando monitoramento em tempo real para usuário ${userId}`);
  }

  // Enviar atualização completa do dashboard
  async sendDashboardUpdate(userId) {
    try {
      if (!global.wss) {
        console.warn('WebSocket server não disponível');
        return;
      }

      // Buscar dados atualizados do dashboard
      const dashboardData = await this.getDashboardData(userId);
      
      // Enviar via WebSocket
      global.wss.sendDashboardUpdate(userId, dashboardData);
      
      console.log(`📨 Dashboard atualizado enviado para usuário ${userId}`);
    } catch (error) {
      console.error(`Erro ao enviar atualização do dashboard para ${userId}:`, error);
    }
  }

  // Obter dados atualizados do dashboard
  async getDashboardData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Dados de investimento
      const investments = await Investment.find({ user: userId, status: 'active' });
      const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
      const totalProfit = investments.reduce((sum, inv) => sum + (inv.profit || 0), 0);

      // Dados de tarefas
      const taskCompletions = await TaskCompletion.find({ 
        user: userId, 
        status: { $in: ['pending', 'completed'] } 
      });
      
      const pendingTasks = taskCompletions.filter(tc => tc.status === 'pending').length;
      const completedTasks = taskCompletions.filter(tc => tc.status === 'completed').length;

      // Dados do usuário
      const userData = {
        balance: user.balance,
        totalEarnings: user.totalEarnings || 0,
        referralCount: user.referrals?.length || 0
      };

      return {
        user: userData,
        investments: {
          totalInvested,
          totalProfit,
          activeCount: investments.length,
          items: investments.map(inv => ({
            id: inv._id,
            robot: inv.robot,
            amount: inv.amount,
            profit: inv.profit || 0,
            status: inv.status
          }))
        },
        tasks: {
          pending: pendingTasks,
          completed: completedTasks,
          total: pendingTasks + completedTasks
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      throw error;
    }
  }

  // Enviar atualização específica de saldo
  async sendBalanceUpdate(userId, newBalance) {
    if (global.wss) {
      global.wss.sendBalanceUpdate(userId, newBalance);
      console.log(`💰 Atualização de saldo enviada para usuário ${userId}: ${newBalance}`);
    }
  }

  // Enviar atualização específica de investimento
  async sendInvestmentUpdate(userId, investment) {
    if (global.wss) {
      global.wss.sendInvestmentUpdate(userId, investment);
      console.log(`📈 Atualização de investimento enviada para usuário ${userId}`);
    }
  }

  // Enviar atualização específica de tarefas
  async sendTaskUpdate(userId, taskStats) {
    if (global.wss) {
      global.wss.sendTaskUpdate(userId, taskStats);
      console.log(`✅ Atualização de tarefas enviada para usuário ${userId}`);
    }
  }

  // Obter estatísticas do serviço
  getStats() {
    return {
      activeUsers: this.activeUsers.size,
      monitoringIntervals: this.updateIntervals.size
    };
  }
}

// Exportar instância singleton
module.exports = new RealtimeDashboardService();