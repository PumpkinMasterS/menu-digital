const cron = require('node-cron');
const CryptoTransferService = require('../services/CryptoTransferService');

class CryptoTransferJob {
  constructor() {
    this.isRunning = false;
    this.cryptoTransferService = new CryptoTransferService();
  }

  /**
   * Inicia os jobs agendados para transferências de cripto
   */
  start() {
    // Verificar transferências pendentes a cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ Verificação de transferências pendentes já em andamento, ignorando...');
        return;
      }

      await this.checkPendingTransfers();
    });

    // Calcular retornos diários a cada 24 horas (à meia-noite)
    cron.schedule('0 0 * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ Cálculo de retornos diários já em andamento, ignorando...');
        return;
      }

      await this.calculateDailyReturns();
    });

    console.log('✅ Jobs de transferências de cripto iniciados:');
    console.log('   - Verificação de transferências pendentes: a cada 5 minutos');
    console.log('   - Cálculo de retornos diários: todos os dias à meia-noite');
  }

  /**
   * Verificar transferências pendentes
   */
  async checkPendingTransfers() {
    this.isRunning = true;

    try {
      console.log('🔍 Verificando transferências pendentes...');
      
      const results = await this.cryptoTransferService.checkPendingInvestmentTransfers();
      
      if (results.length > 0) {
        console.log(`✅ ${results.length} transferências confirmadas e processadas`);
        
        // Enviar notificações para os usuários
        for (const result of results) {
          console.log(`📧 Investimento ${result.investmentId} confirmado para o usuário ${result.transactionId}`);
        }
      } else {
        console.log('ℹ️ Nenhuma transferência pendente foi confirmada nesta verificação');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar transferências pendentes:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Calcular retornos diários
   */
  async calculateDailyReturns() {
    this.isRunning = true;

    try {
      console.log('💰 Calculando retornos diários...');
      
      const results = await this.cryptoTransferService.calculateDailyReturns();
      
      if (results.length > 0) {
        const totalReturns = results.reduce((sum, result) => sum + result.dailyProfit, 0);
        console.log(`✅ ${results.length} retornos calculados, total: ${totalReturns.toFixed(2)}`);
        
        // Estatísticas dos retornos
        const stats = {
          totalInvestments: results.length,
          totalReturns: totalReturns,
          averageReturn: totalReturns / results.length,
          maxReturn: Math.max(...results.map(r => r.dailyProfit)),
          minReturn: Math.min(...results.map(r => r.dailyProfit))
        };
        
        console.log('📊 Estatísticas dos retornos diários:', stats);
      } else {
        console.log('ℹ️ Nenhum retorno diário para calcular');
      }
    } catch (error) {
      console.error('❌ Erro ao calcular retornos diários:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Força a verificação manual de transferências pendentes
   */
  async forceCheckPendingTransfers() {
    if (this.isRunning) {
      throw new Error('Verificação já em andamento');
    }

    await this.checkPendingTransfers();
  }

  /**
   * Força o cálculo manual de retornos diários
   */
  async forceCalculateDailyReturns() {
    if (this.isRunning) {
      throw new Error('Cálculo de retornos já em andamento');
    }

    await this.calculateDailyReturns();
  }

  /**
   * Obtém status dos jobs
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextPendingCheck: this.getNextRunTime('*/5 * * * *'),
      nextDailyReturn: this.getNextRunTime('0 0 * * *')
    };
  }

  /**
   * Calcula próximo horário de execução
   */
  getNextRunTime(cronExpression) {
    try {
      // Implementação simplificada para obter próximo horário
      const now = new Date();
      const nextRun = new Date(now.getTime() + 5 * 60 * 1000); // Próxima execução em 5 minutos
      return nextRun;
    } catch (error) {
      return null;
    }
  }
}

module.exports = CryptoTransferJob;

