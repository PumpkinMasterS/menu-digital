const cron = require('node-cron');
const BEP20Service = require('../services/BEP20Service');

class CheckPendingTransactionsJob {
  constructor() {
    this.isRunning = false;
    this.bep20Service = new BEP20Service();
  }

  /**
   * Inicia o job para verificar transações pendentes
   */
  start() {
    // Executar a cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ Verificação de transações pendentes já em andamento, ignorando...');
        return;
      }

      await this.checkPendingTransactions();
    });

    console.log('✅ Job de verificação de transações pendentes iniciado (executa a cada 5 minutos)');
  }

  /**
   * Verifica transações pendentes
   */
  async checkPendingTransactions() {
    this.isRunning = true;

    try {
      console.log('🔍 Verificando transações pendentes...');
      
      const results = await this.bep20Service.checkPendingTransactions();
      
      if (results.length > 0) {
        console.log(`✅ ${results.length} transações foram confirmadas e processadas`);
        
        // Enviar notificações para os usuários
        for (const result of results) {
          // Aqui você poderia implementar notificações por email, push, etc.
          console.log(`📧 Notificação enviada para o usuário da transação ${result.transactionId}`);
        }
      } else {
        console.log('ℹ️ Nenhuma transação pendente foi confirmada nesta verificação');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar transações pendentes:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Força a verificação manual de transações pendentes
   */
  async forceCheck() {
    if (this.isRunning) {
      throw new Error('Verificação já em andamento');
    }

    await this.checkPendingTransactions();
  }
}

module.exports = CheckPendingTransactionsJob;

