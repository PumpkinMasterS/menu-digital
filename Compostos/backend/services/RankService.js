const Rank = require('../models/Rank');
const User = require('../models/User');

class RankService {
  /**
   * Verificar qualificações de rank para um usuário
   */
  static async checkRankQualifications(userId) {
    try {
      const user = await User.findById(userId).populate('referrals');
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Implementar lógica real de verificação de qualificações
      // Esta é uma implementação básica - ajustar conforme necessário
      const qualifications = {
        currentRank: user.rank || 'Bronze',
        personalSales: user.personalSales || 0,
        teamSales: user.teamSales || 0,
        directRecruits: user.directRecruits || 0,
        teamSize: user.teamSize || 0,
        meetsRequirements: false,
        nextRank: this.getNextRank(user.rank),
        requirements: this.getRankRequirements(user.rank)
      };

      return qualifications;
    } catch (error) {
      console.error('Erro ao verificar qualificações:', error);
      throw error;
    }
  }

  /**
   * Obter leaderboard de ranks
   */
  static async getRankLeaderboard(limit = 50) {
    try {
      const users = await User.find({ 
        rank: { $exists: true, $ne: null } 
      })
      .sort({ 
        'rankLevel': -1, 
        'personalSales': -1,
        'teamSales': -1 
      })
      .limit(limit)
      .select('name email rank personalSales teamSales');

      return users;
    } catch (error) {
      console.error('Erro ao obter leaderboard:', error);
      throw error;
    }
  }

  /**
   * Calcular estatísticas da equipe
   */
  static async calculateTeamStats(userId) {
    try {
      // Implementar lógica real de cálculo de estatísticas da equipe
      // Esta é uma implementação básica - ajustar conforme necessário
      const stats = {
        totalTeamMembers: 0,
        activeTeamMembers: 0,
        totalTeamSales: 0,
        monthlyTeamSales: 0,
        averageRank: 'Bronze'
      };

      return stats;
    } catch (error) {
      console.error('Erro ao calcular estatísticas da equipe:', error);
      throw error;
    }
  }

  /**
   * Promover usuário manualmente
   */
  static async promoteUser(userId, rankName) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se o rank existe
      const rank = await Rank.findOne({ name: rankName });
      if (!rank) {
        throw new Error('Rank não encontrado');
      }

      // Atualizar rank do usuário
      user.rank = rankName;
      user.rankLevel = rank.level;
      await user.save();

      return {
        success: true,
        message: `Usuário promovido para ${rankName}`,
        user: {
          id: user._id,
          name: user.name,
          rank: user.rank,
          rankLevel: user.rankLevel
        }
      };
    } catch (error) {
      console.error('Erro ao promover usuário:', error);
      throw error;
    }
  }

  /**
   * Verificar e promover usuários automaticamente
   */
  static async checkAndPromoteUsers() {
    try {
      // Implementar lógica real de verificação e promoção automática
      // Esta é uma implementação básica - ajustar conforme necessário
      const result = {
        usersChecked: 0,
        usersPromoted: 0,
        promotions: []
      };

      return result;
    } catch (error) {
      console.error('Erro na verificação de promoções:', error);
      throw error;
    }
  }

  /**
   * Obter próximo rank baseado no rank atual
   */
  static getNextRank(currentRank) {
    const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Executive'];
    const currentIndex = ranks.indexOf(currentRank);
    return currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;
  }

  /**
   * Obter requisitos para um rank específico
   */
  static getRankRequirements(rankName) {
    // Implementar requisitos reais para cada rank
    const requirements = {
      Bronze: { personalSales: 1000, teamSales: 0, directRecruits: 1 },
      Silver: { personalSales: 5000, teamSales: 20000, directRecruits: 3 },
      Gold: { personalSales: 10000, teamSales: 50000, directRecruits: 5 },
      Platinum: { personalSales: 25000, teamSales: 100000, directRecruits: 10 },
      Diamond: { personalSales: 50000, teamSales: 250000, directRecruits: 20 },
      Executive: { personalSales: 100000, teamSales: 500000, directRecruits: 30 }
    };

    return requirements[rankName] || {};
  }
}

module.exports = RankService;