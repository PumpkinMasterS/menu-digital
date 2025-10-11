const Commission = require('../models/Commission');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NotificationService = require('./NotificationService');
const cron = require('node-cron');

class CommissionService {
  /**
   * Calcula e distribui comissões em múltiplos níveis
   */
  static async calculateAndDistributeCommissions(source, userId, amount, sourceType, sourceId) {
    try {
      console.log(`Calculando comissões para usuário ${userId}, valor: ${amount}, tipo: ${sourceType}`);
      
      // Encontra o usuário atual
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Obtém a árvore de referência (até 5 níveis)
      const referralTree = await this.getReferralTree(userId, 5);
      
      const commissions = [];
      const commissionPercentages = [0.10, 0.08, 0.05, 0.03, 0.02]; // 10%, 8%, 5%, 3%, 2%

      // Calcula comissões para cada nível
      for (let level = 0; level < Math.min(referralTree.length, 5); level++) {
        const referrer = referralTree[level];
        if (!referrer) continue;

        const percentage = commissionPercentages[level];
        const commissionAmount = amount * percentage;

        if (commissionAmount > 0) {
          const commission = await this.createCommission({
            userId: referrer._id,
            referrerId: userId,
            level: level + 1,
            amount: commissionAmount,
            percentage: percentage * 100,
            sourceType,
            sourceId,
            description: this.generateCommissionDescription(source, sourceType, level + 1)
          });

          commissions.push(commission);

          // Envia notificação para o referenciador
          await this.sendCommissionNotification(referrer._id, commission);
        }
      }

      console.log(`Comissões calculadas: ${commissions.length} níveis`);
      return commissions;

    } catch (error) {
      console.error('Erro ao calcular comissões:', error);
      throw error;
    }
  }

  /**
   * Obtém a árvore de referência de um usuário
   */
  static async getReferralTree(userId, maxLevels = 5) {
    const tree = [];
    let currentUserId = userId;
    
    for (let level = 0; level < maxLevels; level++) {
      const user = await User.findById(currentUserId);
      if (!user || !user.referredBy) break;

      const referrer = await User.findById(user.referredBy);
      if (!referrer) break;

      tree.push(referrer);
      currentUserId = referrer._id;
    }

    return tree;
  }

  /**
   * Cria uma nova comissão
   */
  static async createCommission(commissionData) {
    try {
      const commission = new Commission({
        ...commissionData,
        status: 'pending',
        createdAt: new Date()
      });

      await commission.save();
      return commission;
    } catch (error) {
      console.error('Erro ao criar comissão:', error);
      throw error;
    }
  }

  /**
   * Envia notificação de comissão
   */
  static async sendCommissionNotification(userId, commission) {
    try {
      let sourceDetails = null;
      
      // Adiciona detalhes específicos baseados no tipo de fonte
      if (commission.sourceType === 'investment') {
        sourceDetails = 'Investimento';
      } else if (commission.sourceType === 'task') {
        sourceDetails = 'Tarefa';
      } else if (commission.sourceType === 'trading') {
        sourceDetails = 'Trading';
      } else if (commission.sourceType === 'subscription') {
        sourceDetails = 'Assinatura';
      } else if (commission.sourceType === 'cashback') {
        sourceDetails = 'Cashback';
      }

      await NotificationService.createCommissionNotification(
        userId,
        commission.amount,
        commission.level,
        commission.sourceType,
        sourceDetails
      );

      console.log(`Notificação de comissão enviada para usuário ${userId}`);
    } catch (error) {
      console.error('Erro ao enviar notificação de comissão:', error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  /**
   * Gera descrição da comissão
   */
  static generateCommissionDescription(source, sourceType, level) {
    const levelText = level === 1 ? '1ª' : level === 2 ? '2ª' : level === 3 ? '3ª' : level === 4 ? '4ª' : '5ª';
    
    switch (sourceType) {
      case 'investment':
        return `Comissão de ${levelText} nível de investimento`;
      case 'task':
        return `Comissão de ${levelText} nível de tarefa`;
      case 'trading':
        return `Comissão de ${levelText} nível de trading`;
      case 'subscription':
        return `Comissão de ${levelText} nível de assinatura`;
      case 'cashback':
        return `Comissão de ${levelText} nível de cashback`;
      case 'manual':
        return `Comissão manual de ${levelText} nível`;
      default:
        return `Comissão de ${levelText} nível`;
    }
  }

  /**
   * Obtém comissões de um usuário
   */
  static async getUserCommissions(userId, filters = {}) {
    try {
      const query = { userId };
      
      if (filters.status) query.status = filters.status;
      if (filters.level) query.level = filters.level;
      if (filters.sourceType) query.sourceType = filters.sourceType;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const commissions = await Commission.find(query)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit);

      const total = await Commission.countDocuments(query);

      return {
        commissions,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      console.error('Erro ao buscar comissões do usuário:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de comissões
   */
  static async getCommissionStats(userId) {
    try {
      const stats = await Commission.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
              }
            },
            approvedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
              }
            },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
              }
            },
            cancelledAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'cancelled'] }, '$amount', 0]
              }
            },
            totalCount: { $sum: 1 },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
            },
            cancelledCount: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        paidAmount: 0,
        cancelledAmount: 0,
        totalCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        paidCount: 0,
        cancelledCount: 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de comissões:', error);
      throw error;
    }
  }

  /**
   * Busca comissões por texto
   */
  static async searchCommissions(userId, query, filters = {}) {
    try {
      const searchQuery = {
        userId,
        $or: [
          { description: { $regex: query, $options: 'i' } },
          { sourceType: { $regex: query, $options: 'i' } }
        ]
      };

      const commissions = await Commission.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit);

      const total = await Commission.countDocuments(searchQuery);

      return {
        commissions,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      throw error;
    }
  }

  /**
   * Filtra comissões com múltiplos critérios
   */
  static async filterCommissions(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) query.status = filters.status;
      if (filters.type) query.sourceType = filters.type;
      if (filters.level) query.level = filters.level;

      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        query.amount = {};
        if (filters.minAmount !== undefined) query.amount.$gte = filters.minAmount;
        if (filters.maxAmount !== undefined) query.amount.$lte = filters.maxAmount;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const commissions = await Commission.find(query)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit);

      const total = await Commission.countDocuments(query);

      return {
        commissions,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      console.error('Erro ao filtrar comissões:', error);
      throw error;
    }
  }

  /**
   * Obtém dashboard de comissões
   */
  static async getCommissionDashboard(userId) {
    try {
      const stats = await this.getCommissionStats(userId);
      
      // Últimas 5 comissões
      const recentCommissions = await Commission.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      // Comissões por nível
      const commissionsByLevel = await Commission.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$level',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Comissões por tipo de fonte
      const commissionsBySource = await Commission.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$sourceType',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      return {
        stats,
        recentCommissions,
        commissionsByLevel,
        commissionsBySource
      };
    } catch (error) {
      console.error('Erro ao obter dashboard de comissões:', error);
      throw error;
    }
  }

  /**
   * Aprova uma comissão
   */
  static async approveCommission(commissionId) {
    try {
      const commission = await Commission.findByIdAndUpdate(
        commissionId,
        {
          status: 'approved',
          approvedAt: new Date()
        },
        { new: true }
      );

      if (!commission) {
        throw new Error('Comissão não encontrada');
      }

      return commission;
    } catch (error) {
      console.error('Erro ao aprovar comissão:', error);
      throw error;
    }
  }

  /**
   * Paga uma comissão
   */
  static async payCommission(commissionId) {
    try {
      const commission = await Commission.findByIdAndUpdate(
        commissionId,
        {
          status: 'paid',
          paidAt: new Date()
        },
        { new: true }
      );

      if (!commission) {
        throw new Error('Comissão não encontrada');
      }

      return commission;
    } catch (error) {
      console.error('Erro ao pagar comissão:', error);
      throw error;
    }
  }

  /**
   * Cancela uma comissão
   */
  static async cancelCommission(commissionId) {
    try {
      const commission = await Commission.findByIdAndUpdate(
        commissionId,
        {
          status: 'cancelled',
          cancelledAt: new Date()
        },
        { new: true }
      );

      if (!commission) {
        throw new Error('Comissão não encontrada');
      }

      return commission;
    } catch (error) {
      console.error('Erro ao cancelar comissão:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as comissões (admin)
   */
  static async getAllCommissions(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.level) query.level = filters.level;
      if (filters.userId) query.userId = filters.userId;
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const commissions = await Commission.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit);

      const total = await Commission.countDocuments(query);

      return {
        commissions,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      console.error('Erro ao buscar todas as comissões:', error);
      throw error;
    }
  }
}

module.exports = CommissionService;