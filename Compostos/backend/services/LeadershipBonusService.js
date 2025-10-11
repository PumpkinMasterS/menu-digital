const LeadershipBonus = require('../models/LeadershipBonus');
const User = require('../models/User');

class LeadershipBonusService {
  constructor() {
    // Inicialização do serviço
  }

  /**
   * Processa bônus de liderança para um período específico
   */
  async processBonuses(period, bonusType = 'all') {
    try {
      console.log(`Processando bônus de liderança para o período: ${period}, tipo: ${bonusType}`);
      
      // Obter todos os usuários elegíveis para bônus
      const eligibleUsers = await this.getEligibleUsers();
      
      if (eligibleUsers.length === 0) {
        return { 
          success: true, 
          message: 'Nenhum usuário elegível para bônus encontrado', 
          period,
          processed: 0
        };
      }
      
      let totalProcessed = 0;
      let totalAmount = 0;
      
      // Processar bônus para cada usuário elegível
      for (const user of eligibleUsers) {
        try {
          const userBonuses = await this.calculateUserBonuses(user, period, bonusType);
          
          if (userBonuses.length > 0) {
            await LeadershipBonus.insertMany(userBonuses);
            totalProcessed += userBonuses.length;
            totalAmount += userBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
          }
        } catch (userError) {
          console.error(`Erro ao processar bônus para usuário ${user._id}:`, userError);
          // Continuar processando outros usuários
        }
      }
      
      return { 
        success: true, 
        message: `Processamento concluído: ${totalProcessed} bônus criados, total: € ${totalAmount.toFixed(2)}`,
        period,
        processed: totalProcessed,
        totalAmount
      };
      
    } catch (error) {
      console.error('Erro ao processar bônus:', error);
      throw new Error('Falha no processamento de bônus');
    }
  }

  /**
   * Obtém estatísticas de bônus
   */
  async getBonusStats() {
    try {
      const stats = await LeadershipBonus.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      return {
        pending: stats.find(s => s._id === 'pending')?.count || 0,
        approved: stats.find(s => s._id === 'approved')?.count || 0,
        rejected: stats.find(s => s._id === 'rejected')?.count || 0,
        totalAmount: stats.reduce((sum, s) => sum + s.totalAmount, 0)
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw new Error('Falha ao obter estatísticas de bônus');
    }
  }

  /**
   * Aprova um bônus específico
   */
  async approveBonus(bonusId, adminId) {
    try {
      const bonus = await LeadershipBonus.findByIdAndUpdate(
        bonusId,
        {
          status: 'approved',
          approvedBy: adminId,
          approvedAt: new Date()
        },
        { new: true }
      );

      if (!bonus) {
        throw new Error('Bônus não encontrado');
      }

      // Aqui seria implementada a lógica de crédito na conta do usuário
      console.log(`Bônus ${bonusId} aprovado pelo admin ${adminId}`);

      return bonus;
    } catch (error) {
      console.error('Erro ao aprovar bônus:', error);
      throw new Error('Falha ao aprovar bônus');
    }
  }

  /**
   * Rejeita um bônus específico
   */
  async rejectBonus(bonusId, adminId, reason) {
    try {
      const bonus = await LeadershipBonus.findByIdAndUpdate(
        bonusId,
        {
          status: 'rejected',
          rejectedBy: adminId,
          rejectedAt: new Date(),
          rejectionReason: reason
        },
        { new: true }
      );

      if (!bonus) {
        throw new Error('Bônus não encontrado');
      }

      console.log(`Bônus ${bonusId} rejeitado pelo admin ${adminId}. Motivo: ${reason}`);

      return bonus;
    } catch (error) {
      console.error('Erro ao rejeitar bônus:', error);
      throw new Error('Falha ao rejeitar bônus');
    }
  }

  /**
   * Lista bônus com paginação e filtros
   */
  async listBonuses({ page = 1, limit = 10, status, userId }) {
    try {
      const filter = {};
      if (status) filter.status = status;
      if (userId) filter.userId = userId;

      const bonuses = await LeadershipBonus.find(filter)
        .populate('userId', 'name email')
        .populate('approvedBy', 'name')
        .populate('rejectedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await LeadershipBonus.countDocuments(filter);

      return {
        bonuses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao listar bônus:', error);
      throw new Error('Falha ao listar bônus');
    }
  }

  /**
   * Obtém detalhes de um bônus específico
   */
  async getBonusDetails(bonusId) {
    try {
      const bonus = await LeadershipBonus.findById(bonusId)
        .populate('userId', 'name email phone')
        .populate('approvedBy', 'name')
        .populate('rejectedBy', 'name');

      if (!bonus) {
        throw new Error('Bônus não encontrado');
      }

      return bonus;
    } catch (error) {
      console.error('Erro ao obter detalhes do bônus:', error);
      throw new Error('Falha ao obter detalhes do bônus');
    }
  }
}

module.exports = new LeadershipBonusService();