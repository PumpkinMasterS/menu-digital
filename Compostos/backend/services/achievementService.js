const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const NotificationService = require('../services/NotificationService');

class AchievementService {
  constructor() {
    this.achievementCache = new Map();
  }

  // Carregar todas as conquistas para cache
  async loadAchievements() {
    try {
      const achievements = await Achievement.find({});
      achievements.forEach(achievement => {
        this.achievementCache.set(achievement.code, achievement);
      });
      console.log(`Carregadas ${achievements.length} conquistas no cache`);
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error);
    }
  }

  // Verificar e conceder uma conquista específica
  async checkAndAwardAchievement(userId, achievementCode) {
    try {
      // Verificar se a conquista existe
      const achievement = this.achievementCache.get(achievementCode) || 
                         await Achievement.findOne({ code: achievementCode });
      
      if (!achievement) {
        console.warn(`Conquista não encontrada: ${achievementCode}`);
        return null;
      }

      // Verificar se o usuário já possui esta conquista
      const existingAchievement = await UserAchievement.findOne({
        user: userId,
        achievement: achievement._id
      });

      if (existingAchievement) {
        return null;
      }

      // Conceder a conquista ao usuário
      const userAchievement = new UserAchievement({
        user: userId,
        achievement: achievement._id,
        earnedAt: new Date(),
        points: achievement.points
      });

      await userAchievement.save();

      // Atualizar pontuação total do usuário
      await User.findByIdAndUpdate(userId, {
        $inc: { totalPoints: achievement.points }
      });

      // Criar uma notificação para o usuário sobre a nova conquista
      try {
        const title = 'Conquista desbloqueada!';
        const message = `Você desbloqueou "${achievement.name}" e ganhou ${achievement.points} ponto(s).`;
        // Usamos o tipo 'success' existente para evitar mudanças no schema
        await NotificationService.createNotification(
          userId,
          title,
          message,
          'success',
          { achievementId: achievement._id, points: achievement.points }
        );
      } catch (notifyErr) {
        console.error('Erro ao criar notificação de conquista:', notifyErr);
      }

      console.log(`Conquista concedida: ${achievement.name} para usuário ${userId}`);
      return userAchievement;
    } catch (error) {
      console.error('Erro ao conceder conquista:', error);
      throw error;
    }
  }

  // Verificar conquistas baseadas em investimentos
  async checkInvestmentAchievements(userId, investmentData) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Conquista: Primeiro Investimento
      if (user.investmentsCount === 1) {
        await this.checkAndAwardAchievement(userId, 'first_investment');
      }

      // Conquista: Volume Total de Investimentos
      const totalInvested = user.totalInvested || 0;

      if (totalInvested >= 1000) {
        await this.checkAndAwardAchievement(userId, 'investment_bronze');
      }

      if (totalInvested >= 5000) {
        await this.checkAndAwardAchievement(userId, 'investment_silver');
      }

      if (totalInvested >= 10000) {
        await this.checkAndAwardAchievement(userId, 'investment_gold');
      }

      if (totalInvested >= 50000) {
        await this.checkAndAwardAchievement(userId, 'investment_platinum');
      }

      // Conquista: Número de Investimentos
      if (user.investmentsCount >= 5) {
        await this.checkAndAwardAchievement(userId, 'investment_count_5');
      }

      if (user.investmentsCount >= 10) {
        await this.checkAndAwardAchievement(userId, 'investment_count_10');
      }

      if (user.investmentsCount >= 25) {
        await this.checkAndAwardAchievement(userId, 'investment_count_25');
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas de investimento:', error);
    }
  }

  // Verificar conquistas baseadas em cashback
  async checkCashbackAchievements(userId, cashbackData) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Conquista: Primeiro Cashback
      if ((user.totalCashbackReceived || 0) > 0 && user.cashbackCount === 1) {
        await this.checkAndAwardAchievement(userId, 'first_cashback');
      }

      // Conquista: Volume Total de Cashback
      const totalCashback = user.totalCashbackReceived || 0;

      if (totalCashback >= 100) {
        await this.checkAndAwardAchievement(userId, 'cashback_bronze');
      }

      if (totalCashback >= 500) {
        await this.checkAndAwardAchievement(userId, 'cashback_silver');
      }

      if (totalCashback >= 1000) {
        await this.checkAndAwardAchievement(userId, 'cashback_gold');
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas de cashback:', error);
    }
  }

  // Verificar conquistas baseadas em indicações
  async checkReferralAchievements(userId, referralData) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Conquista: Primeira Indicação
      if (user.referralCount === 1) {
        await this.checkAndAwardAchievement(userId, 'first_referral');
      }

      // Conquista: Número de Indicações
      if (user.referralCount >= 3) {
        await this.checkAndAwardAchievement(userId, 'referral_count_3');
      }

      if (user.referralCount >= 5) {
        await this.checkAndAwardAchievement(userId, 'referral_count_5');
      }

      if (user.referralCount >= 10) {
        await this.checkAndAwardAchievement(userId, 'referral_count_10');
      }

      // Conquista: Volume Total de Indicações
      const totalReferralEarnings = user.totalReferralEarnings || 0;

      if (totalReferralEarnings >= 100) {
        await this.checkAndAwardAchievement(userId, 'referral_bronze');
      }

      if (totalReferralEarnings >= 500) {
        await this.checkAndAwardAchievement(userId, 'referral_silver');
      }

      if (totalReferralEarnings >= 1000) {
        await this.checkAndAwardAchievement(userId, 'referral_gold');
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas de indicação:', error);
    }
  }

  // Verificar conquistas baseadas em ganhos
  async checkEarningAchievements(userId, earningData) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Conquista: Primeiro Ganho
      if ((user.totalEarned || 0) > 0 && user.earningsCount === 1) {
        await this.checkAndAwardAchievement(userId, 'first_earning');
      }

      // Conquista: Volume Total de Ganhos
      const totalEarnings = user.totalEarned || 0;

      if (totalEarnings >= 1000) {
        await this.checkAndAwardAchievement(userId, 'earning_bronze');
      }

      if (totalEarnings >= 5000) {
        await this.checkAndAwardAchievement(userId, 'earning_silver');
      }

      if (totalEarnings >= 10000) {
        await this.checkAndAwardAchievement(userId, 'earning_gold');
      }

      if (totalEarnings >= 50000) {
        await this.checkAndAwardAchievement(userId, 'earning_platinum');
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas de ganhos:', error);
    }
  }

  // Verificar conquistas de milestones gerais
  async checkMilestoneAchievements(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const totalPoints = user.totalPoints || 0;

      // Conquistas de pontos totais
      if (totalPoints >= 100) {
        await this.checkAndAwardAchievement(userId, 'points_bronze');
      }

      if (totalPoints >= 500) {
        await this.checkAndAwardAchievement(userId, 'points_silver');
      }

      if (totalPoints >= 1000) {
        await this.checkAndAwardAchievement(userId, 'points_gold');
      }

      if (totalPoints >= 5000) {
        await this.checkAndAwardAchievement(userId, 'points_platinum');
      }

      // Conquista: Usuário Ativo (7 dias consecutivos)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentActivity = await UserAchievement.findOne({
        user: userId,
        earnedAt: { $gte: sevenDaysAgo }
      });

      if (recentActivity) {
        await this.checkAndAwardAchievement(userId, 'active_user_7days');
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas de milestones:', error);
    }
  }

  // Obter todas as conquistas de um usuário
  async getUserAchievements(userId) {
    try {
      const userAchievements = await UserAchievement.find({ user: userId })
        .populate('achievement')
        .sort({ earnedAt: -1 });

      return userAchievements;
    } catch (error) {
      console.error('Erro ao buscar conquistas do usuário:', error);
      throw error;
    }
  }

  // Obter progresso do usuário em todas as conquistas
  async getUserAchievementProgress(userId) {
    try {
      const allAchievements = await Achievement.find({});
      const userAchievements = await UserAchievement.find({ user: userId });

      const progress = allAchievements.map(achievement => {
        const userAchievement = userAchievements.find(
          ua => ua.achievement.toString() === achievement._id.toString()
        );

        return {
          achievement: achievement,
          earned: !!userAchievement,
          earnedAt: userAchievement?.earnedAt,
          progress: this.calculateAchievementProgress(achievement, userAchievement)
        };
      });

      return progress;
    } catch (error) {
      console.error('Erro ao buscar progresso de conquistas:', error);
      throw error;
    }
  }

  // Calcular progresso de uma conquista (para conquistas progressivas)
  calculateAchievementProgress(achievement, userAchievement) {
    // Implementar lógica de progresso baseada no tipo de conquista
    // Por enquanto, retorna 100% se conquistada, 0% caso contrário
    return userAchievement ? 100 : 0;
  }

  // Verificar todas as conquistas para um usuário
  async checkAllAchievements(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      const results = [];

      // Verificar conquistas de investimento
      const inv = await this.checkInvestmentAchievements(userId, {});
      if (Array.isArray(inv)) results.push(...inv);

      // Verificar conquistas de cashback
      const cash = await this.checkCashbackAchievements(userId, {});
      if (Array.isArray(cash)) results.push(...cash);

      // Verificar conquistas de indicação
      const ref = await this.checkReferralAchievements(userId, {});
      if (Array.isArray(ref)) results.push(...ref);

      // Verificar conquistas de ganhos
      const earn = await this.checkEarningAchievements(userId, {});
      if (Array.isArray(earn)) results.push(...earn);

      // Verificar conquistas de milestones
      const miles = await this.checkMilestoneAchievements(userId);
      if (Array.isArray(miles)) results.push(...miles);

      console.log(`Verificação completa de conquistas para usuário ${userId}. Novas: ${results.length}`);
      return results;
    } catch (error) {
      console.error('Erro ao verificar todas as conquistas:', error);
      return [];
    }
  }
}

module.exports = AchievementService;