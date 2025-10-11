const CommissionService = require('./CommissionService');
const NotificationService = require('./NotificationService');
const Investment = require('../models/Investment');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');

class CommissionIntegrationService {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Configura listeners para eventos do sistema
   */
  setupEventListeners() {
    // Listener para novos investimentos
    Investment.watch().on('change', (change) => {
      if (change.operationType === 'insert') {
        this.handleNewInvestment(change.fullDocument);
      }
    });

    // Listener para conclusão de tarefas
    TaskCompletion.watch().on('change', (change) => {
      if (change.operationType === 'insert') {
        this.handleTaskCompletion(change.fullDocument);
      }
    });

    console.log('Commission integration service started');
  }

  /**
   * Processa comissões para novos investimentos
   */
  async handleNewInvestment(investment) {
    try {
      await CommissionService.calculateAndDistributeCommissions(
        investment,
        investment.userId,
        investment.amount,
        'investment',
        investment._id
      );

      console.log(`Comissões processadas para investimento ${investment._id}`);
    } catch (error) {
      console.error('Erro ao processar comissões de investimento:', error);
    }
  }

  /**
   * Processa comissões para conclusão de tarefas
   */
  async handleTaskCompletion(taskCompletion) {
    try {
      // Para tarefas, usamos a recompensa como base para comissões
      await CommissionService.calculateAndDistributeCommissions(
        taskCompletion,
        taskCompletion.user,
        taskCompletion.reward,
        'task',
        taskCompletion._id
      );

      console.log(`Comissões processadas para tarefa ${taskCompletion._id}`);
    } catch (error) {
      console.error('Erro ao processar comissões de tarefa:', error);
    }
  }

  /**
   * Processa comissões para transações de trading
   */
  async handleTradingProfit(tradeProfit) {
    try {
      await CommissionService.calculateAndDistributeCommissions(
        tradeProfit,
        tradeProfit.userId,
        tradeProfit.profit,
        'trading',
        tradeProfit._id
      );

      console.log(`Comissões processadas para trade ${tradeProfit._id}`);
    } catch (error) {
      console.error('Erro ao processar comissões de trading:', error);
    }
  }

  /**
   * Processa comissões para assinaturas
   */
  async handleSubscriptionPayment(subscription) {
    try {
      await CommissionService.calculateAndDistributeCommissions(
        subscription,
        subscription.userId,
        subscription.amount,
        'subscription',
        subscription._id
      );

      console.log(`Comissões processadas para assinatura ${subscription._id}`);
    } catch (error) {
      console.error('Erro ao processar comissões de assinatura:', error);
    }
  }

  /**
   * Processa comissões para cashback
   */
  async handleCashback(cashback) {
    try {
      await CommissionService.calculateAndDistributeCommissions(
        cashback,
        cashback.userId,
        cashback.amount,
        'cashback',
        cashback._id
      );

      console.log(`Comissões processadas para cashback ${cashback._id}`);
    } catch (error) {
      console.error('Erro ao processar comissões de cashback:', error);
    }
  }

  /**
   * Processa manualmente uma transação para comissões
   */
  async processManualCommission(transactionData) {
    try {
      const {
        userId,
        amount,
        sourceType,
        sourceId,
        description
      } = transactionData;

      await CommissionService.calculateAndDistributeCommissions(
        { manual: true },
        userId,
        amount,
        sourceType,
        sourceId
      );

      console.log(`Comissões manuais processadas para ${userId}`);
      return true;
    } catch (error) {
      console.error('Erro ao processar comissões manuais:', error);
      throw error;
    }
  }
}

module.exports = new CommissionIntegrationService();