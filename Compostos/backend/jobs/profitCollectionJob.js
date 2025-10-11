const cron = require('node-cron');
const mongoose = require('mongoose');
const Robot = require('../models/Robot');
const User = require('../models/User');
const Investment = require('../models/Investment');

class ProfitCollectionJob {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    // Agenda a coleta automática de lucros a cada 24 horas (meia-noite)
    cron.schedule('0 0 * * *', async () => {
      console.log('🚀 Iniciando coleta automática de lucros...');
      await this.collectAllProfits();
    });

    console.log('⏰ Coletor automático de lucros agendado para rodar diariamente às 00:00');
  }

  async collectAllProfits() {
    if (this.isRunning) {
      console.log('⚠️ Coleta já em andamento, ignorando...');
      return;
    }

    this.isRunning = true;

    try {
      // Encontra todos os robôs ativos
      const activeRobots = await Robot.find({ 
        status: 'active', 
        purchaseDate: { $exists: true } 
      }).populate('userId');

      console.log(`🤖 Encontrados ${activeRobots.length} robôs ativos para coleta`);

      let totalCollected = 0;
      let robotsProcessed = 0;

      for (const robot of activeRobots) {
        try {
          const dailyProfit = robot.calculateDailyProfit();
          
          if (dailyProfit > 0) {
            // Adiciona lucro ao histórico do robô
            robot.addDailyProfit(dailyProfit);
            
            // Atualiza saldo do usuário
            const user = await User.findById(robot.userId);
            if (user) {
              user.balance += dailyProfit;
              user.totalEarnings += dailyProfit;
              await user.save();

              // Registra no histórico de investimentos
              const investment = await Investment.findOne({ 
                userId: robot.userId, 
                robotId: robot._id 
              });
              
              if (investment) {
                investment.addDailyProfit(dailyProfit);
                await investment.save();
              }

              totalCollected += dailyProfit;
              robotsProcessed++;

              console.log(`💰 Robô ${robot.name}: Coletado €${dailyProfit.toFixed(2)} para ${user.username}`);
            }
          }

          await robot.save();

        } catch (error) {
          console.error(`❌ Erro ao processar robô ${robot._id}:`, error);
        }
      }

      console.log(`✅ Coleta concluída: €${totalCollected.toFixed(2)} coletados de ${robotsProcessed} robôs`);

    } catch (error) {
      console.error('❌ Erro na coleta automática de lucros:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Método para forçar coleta manual (útil para testes)
  async forceCollection() {
    console.log('🔧 Forçando coleta manual de lucros...');
    await this.collectAllProfits();
  }
}

module.exports = ProfitCollectionJob;