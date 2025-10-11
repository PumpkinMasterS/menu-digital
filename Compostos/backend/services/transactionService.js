const Transaction = require('../models/Transaction');
const User = require('../models/User');
const AchievementService = require('./achievementService');

class TransactionService {
  constructor() {
    this.achievementService = new AchievementService();
  }

  // Criar uma nova transação e verificar conquistas
  async createTransaction(transactionData) {
    try {
      const transaction = new Transaction(transactionData);
      await transaction.save();

      // Verificar conquistas relacionadas a transações
      await this.checkTransactionAchievements(transaction.user, transaction);

      return transaction;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  }

  // Verificar conquistas relacionadas a transações
  async checkTransactionAchievements(userId, transaction) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Verificar conquistas baseadas no tipo de transação
      switch (transaction.type) {
        case 'investment':
          await this.checkInvestmentAchievements(user, transaction);
          break;
        case 'cashback':
          await this.checkCashbackAchievements(user, transaction);
          break;
        case 'referral':
          await this.checkReferralAchievements(user, transaction);
          break;
        case 'earning':
          await this.checkEarningAchievements(user, transaction);
          break;
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas de transação:', error);
    }
  }

  // Verificar conquistas de investimento
  async checkInvestmentAchievements(user, transaction) {
    // Conquista: Primeiro Investimento
    const userInvestments = await Transaction.countDocuments({
      user: user._id,
      type: 'investment'
    });

    if (userInvestments === 1) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'first_investment'
      );
    }

    // Conquista: Volume Total de Investimentos
    const totalInvested = await Transaction.aggregate([
      { $match: { user: user._id, type: 'investment' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const investmentTotal = totalInvested[0]?.total || 0;

    if (investmentTotal >= 1000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'investment_bronze'
      );
    }

    if (investmentTotal >= 5000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'investment_silver'
      );
    }

    if (investmentTotal >= 10000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'investment_gold'
      );
    }

    if (investmentTotal >= 50000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'investment_platinum'
      );
    }
  }

  // Verificar conquistas de cashback
  async checkCashbackAchievements(user, transaction) {
    // Conquista: Primeiro Cashback
    const userCashbacks = await Transaction.countDocuments({
      user: user._id,
      type: 'cashback'
    });

    if (userCashbacks === 1) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'first_cashback'
      );
    }

    // Conquista: Volume Total de Cashback
    const totalCashback = await Transaction.aggregate([
      { $match: { user: user._id, type: 'cashback' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const cashbackTotal = totalCashback[0]?.total || 0;

    if (cashbackTotal >= 100) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'cashback_bronze'
      );
    }

    if (cashbackTotal >= 500) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'cashback_silver'
      );
    }

    if (cashbackTotal >= 1000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'cashback_gold'
      );
    }
  }

  // Verificar conquistas de indicação
  async checkReferralAchievements(user, transaction) {
    // Conquista: Primeira Indicação
    const userReferrals = await Transaction.countDocuments({
      user: user._id,
      type: 'referral'
    });

    if (userReferrals === 1) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'first_referral'
      );
    }

    // Conquista: Volume Total de Indicações
    const totalReferrals = await Transaction.aggregate([
      { $match: { user: user._id, type: 'referral' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const referralTotal = totalReferrals[0]?.total || 0;

    if (referralTotal >= 100) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'referral_bronze'
      );
    }

    if (referralTotal >= 500) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'referral_silver'
      );
    }

    if (referralTotal >= 1000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'referral_gold'
      );
    }
  }

  // Verificar conquistas de ganhos
  async checkEarningAchievements(user, transaction) {
    // Conquista: Primeiro Ganho
    const userEarnings = await Transaction.countDocuments({
      user: user._id,
      type: 'earning'
    });

    if (userEarnings === 1) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'first_earning'
      );
    }

    // Conquista: Volume Total de Ganhos
    const totalEarnings = await Transaction.aggregate([
      { $match: { user: user._id, type: 'earning' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const earningsTotal = totalEarnings[0]?.total || 0;

    if (earningsTotal >= 1000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'earning_bronze'
      );
    }

    if (earningsTotal >= 5000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'earning_silver'
      );
    }

    if (earningsTotal >= 10000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'earning_gold'
      );
    }

    if (earningsTotal >= 50000) {
      await this.achievementService.checkAndAwardAchievement(
        user._id,
        'earning_platinum'
      );
    }
  }

  // Obter estatísticas de transações do usuário
  async getUserTransactionStats(userId) {
    try {
      const stats = await Transaction.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de transações:', error);
      throw error;
    }
  }
}

module.exports = new TransactionService();