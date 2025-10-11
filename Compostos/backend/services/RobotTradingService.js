const cron = require('node-cron');
const Investment = require('../models/Investment');
const Robot = require('../models/Robot');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NotificationService = require('./NotificationService');

class RobotTradingService {
  constructor() {
    this.isRunning = false;
    this.init();
  }

  init() {
    // Agendar tarefa para calcular lucros diários às 00:01
    cron.schedule('1 0 * * *', () => {
      console.log('🚀 Iniciando cálculo automático de lucros dos robôs...');
      this.calculateDailyProfits();
    });

    // Verificar investimentos completos a cada hora
    cron.schedule('0 * * * *', () => {
      this.checkCompletedInvestments();
    });

    console.log('🤖 Serviço de Trading de Robôs inicializado');
  }

  /**
   * Calcula e distribui lucros diários de todos os investimentos ativos
   */
  async calculateDailyProfits() {
    if (this.isRunning) {
      console.log('⚠️ Cálculo de lucros já em andamento...');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('💰 Calculando lucros diários...');
      
      const activeInvestments = await Investment.find({ 
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('user robot');

      let totalProfits = 0;
      let processedCount = 0;

      for (const investment of activeInvestments) {
        try {
          const dailyProfit = investment.currentDailyProfit;
          
          if (dailyProfit > 0) {
            // Adicionar lucro ao investimento
            await investment.addDailyProfit();
            
            // Atualizar saldo do usuário
            await User.findByIdAndUpdate(
              investment.user._id,
              { $inc: { balance: dailyProfit } }
            );

            // Criar transação de lucro
            const profitTransaction = new Transaction({
              user: investment.user._id,
              type: 'earning',
              amount: dailyProfit,
              description: `Lucro diário - ${investment.robot.name}`,
              status: 'completed',
              reference: `profit-${investment._id}-${new Date().toISOString().split('T')[0]}`
            });
            await profitTransaction.save();

            // Notificar usuário
            await NotificationService.createProfitNotification(
              investment.user._id,
              investment.robot.name,
              dailyProfit,
              investment._id
            );

            totalProfits += dailyProfit;
            processedCount++;

            console.log(`✅ Lucro de €${dailyProfit.toFixed(2)} para ${investment.user.name}`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar lucro para investimento ${investment._id}:`, error);
        }
      }

      console.log(`🎯 Lucros processados: ${processedCount} investimentos, €${totalProfits.toFixed(2)} distribuídos`);

    } catch (error) {
      console.error('❌ Erro no cálculo de lucros:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verifica e finaliza investimentos completos
   */
  async checkCompletedInvestments() {
    try {
      console.log('🔍 Verificando investimentos completos...');
      
      const completedInvestments = await Investment.find({
        status: 'active',
        endDate: { $lte: new Date() }
      }).populate('user robot');

      for (const investment of completedInvestments) {
        try {
          // Finalizar investimento
          investment.status = 'completed';
          await investment.save();

          // Devolver capital inicial para o usuário
          await User.findByIdAndUpdate(
            investment.user._id,
            { $inc: { balance: investment.amount } }
          );

          // Criar transação de devolução do capital
          const capitalReturnTransaction = new Transaction({
            user: investment.user._id,
            type: 'earning',
            amount: investment.amount,
            description: `Devolução de capital - ${investment.robot.name}`,
            status: 'completed',
            reference: `capital-return-${investment._id}`
          });
          await capitalReturnTransaction.save();

          // Notificar usuário
          await NotificationService.createInvestmentCompletedNotification(
            investment.user._id,
            investment.robot.name,
            investment.amount,
            investment.totalProfit,
            investment._id
          );

          console.log(`✅ Investimento ${investment._id} finalizado. Capital devolvido: €${investment.amount.toFixed(2)}`);

        } catch (error) {
          console.error(`❌ Erro ao finalizar investimento ${investment._id}:`, error);
        }
      }

      console.log(`📊 ${completedInvestments.length} investimentos finalizados`);

    } catch (error) {
      console.error('❌ Erro na verificação de investimentos completos:', error);
    }
  }

  /**
   * Simula flutuações de mercado para robôs (para demonstração)
   */
  async simulateMarketFluctuations() {
    try {
      const activeRobots = await Robot.find({ status: 'active' });
      
      for (const robot of activeRobots) {
        // Simular pequena variação no lucro diário (±0.5%)
        const fluctuation = (Math.random() - 0.5) * 0.5;
        const newDailyProfit = Math.max(0.1, Math.min(10, robot.dailyProfit + fluctuation));
        
        if (Math.abs(newDailyProfit - robot.dailyProfit) > 0.1) {
          robot.dailyProfit = parseFloat(newDailyProfit.toFixed(2));
          await robot.save();
          
          console.log(`📈 Robô ${robot.name}: ${robot.dailyProfit}% diário (${fluctuation > 0 ? '↑' : '↓'} ${Math.abs(fluctuation).toFixed(2)}%)`);
        }
      }

    } catch (error) {
      console.error('❌ Erro na simulação de mercado:', error);
    }
  }

  /**
   * Obtém estatísticas em tempo real do sistema
   */
  async getLiveStats() {
    try {
      const stats = await Investment.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalActiveInvestments: { $sum: 1 },
            totalInvested: { $sum: '$amount' },
            totalDailyProfit: { $sum: { $multiply: ['$amount', { $divide: ['$dailyProfit', 100] }] } },
            totalProfitGenerated: { $sum: '$totalProfit' },
            uniqueInvestors: { $addToSet: '$user' }
          }
        }
      ]);

      const robotStats = await Robot.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalRobots: { $sum: 1 },
            averageDailyProfit: { $avg: '$dailyProfit' },
            minDailyProfit: { $min: '$dailyProfit' },
            maxDailyProfit: { $max: '$dailyProfit' }
          }
        }
      ]);

      return {
        investments: stats[0] || {
          totalActiveInvestments: 0,
          totalInvested: 0,
          totalDailyProfit: 0,
          totalProfitGenerated: 0,
          uniqueInvestors: 0
        },
        robots: robotStats[0] || {
          totalRobots: 0,
          averageDailyProfit: 0,
          minDailyProfit: 0,
          maxDailyProfit: 0
        },
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Força o cálculo de lucros (para testes)
   */
  async forceProfitCalculation() {
    console.log('⚡ Forçando cálculo de lucros...');
    await this.calculateDailyProfits();
  }
}

module.exports = new RobotTradingService();