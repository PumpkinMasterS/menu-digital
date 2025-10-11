const Investment = require('../models/Investment');
const User = require('../models/User');
const AchievementService = require('./achievementService');

class CashbackService {
  constructor() {
    this.cashbackRules = [
      {
        name: 'Cashback Bronze',
        minAmount: 100,
        maxAmount: 500,
        rate: 0.02, // 2%
        description: 'Cashback de 2% para investimentos entre €100 e €500'
      },
      {
        name: 'Cashback Prata',
        minAmount: 501,
        maxAmount: 2000,
        rate: 0.03, // 3%
        description: 'Cashback de 3% para investimentos entre €501 e €2000'
      },
      {
        name: 'Cashback Ouro',
        minAmount: 2001,
        maxAmount: 10000,
        rate: 0.05, // 5%
        description: 'Cashback de 5% para investimentos entre €2001 e €10000'
      },
      {
        name: 'Cashback Diamante',
        minAmount: 10001,
        maxAmount: Infinity,
        rate: 0.07, // 7%
        description: 'Cashback de 7% para investimentos acima de €10000'
      }
    ];

    this.specialPromotions = [
      {
        name: 'Primeiro Investimento',
        condition: (user, investment) => {
          return user.investmentsCount === 0;
        },
        rate: 0.10, // 10% extra no primeiro investimento
        description: 'Cashback especial de 10% no primeiro investimento'
      },
      {
        name: 'Fidelidade',
        condition: (user, investment) => {
          return user.investmentsCount >= 5;
        },
        rate: 0.015, // 1.5% extra
        description: 'Cashback adicional de 1.5% para clientes fiéis'
      },
      {
        name: 'Investimento Recorrente',
        condition: (user, investment) => {
          return user.activeInvestments > 0;
        },
        rate: 0.01, // 1% extra
        description: 'Cashback adicional de 1% para investimentos recorrentes'
      }
    ];
  }

  // Calcular cashback baseado nas regras
  async calculateCashback(investmentAmount, userId, robotType = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      let totalCashback = 0;
      let appliedRules = [];

      // Aplicar regras baseadas no valor do investimento
      for (const rule of this.cashbackRules) {
        if (investmentAmount >= rule.minAmount && investmentAmount <= rule.maxAmount) {
          const cashbackAmount = investmentAmount * rule.rate;
          totalCashback += cashbackAmount;
          appliedRules.push({
            rule: rule.name,
            rate: rule.rate,
            amount: cashbackAmount,
            description: rule.description
          });
          break; // Apenas uma regra de valor por investimento
        }
      }

      // Aplicar bônus baseado no tipo de robô
      if (robotType) {
        const robotBonusRate = this.getRobotBonusRate(robotType);
        if (robotBonusRate > 0) {
          const robotBonusAmount = investmentAmount * robotBonusRate;
          totalCashback += robotBonusAmount;
          appliedRules.push({
            rule: `Bônus ${robotType}`,
            rate: robotBonusRate,
            amount: robotBonusAmount,
            description: `Bônus especial para robô ${robotType}`
          });
        }
      }

      // Aplicar promoções especiais
      for (const promotion of this.specialPromotions) {
        if (promotion.condition(user, { amount: investmentAmount })) {
          const promotionAmount = investmentAmount * promotion.rate;
          totalCashback += promotionAmount;
          appliedRules.push({
            rule: promotion.name,
            rate: promotion.rate,
            amount: promotionAmount,
            description: promotion.description
          });
        }
      }

      return {
        totalCashback: parseFloat(totalCashback.toFixed(2)),
        appliedRules,
        cashbackRate: totalCashback / investmentAmount
      };
    } catch (error) {
      console.error('Erro ao calcular cashback:', error);
      throw error;
    }
  }

// Obter taxa de bônus baseada no tipo de robô
getRobotBonusRate(robotType) {
  const robotBonuses = {
    'TC760': 0.005, // 0.5% de bônus para TC760
    'TC880': 0.01,  // 1% de bônus para TC880
    'TC990': 0.015  // 1.5% de bônus para TC990
  };

  return robotBonuses[robotType] || 0;
}

  // Aplicar cashback a um investimento
  async applyCashbackToInvestment(investmentId, userId) {
    try {
      const investment = await Investment.findById(investmentId);
      if (!investment) {
        throw new Error('Investimento não encontrado');
      }

      const cashbackCalculation = await this.calculateCashback(investment.amount, userId);
      
      if (cashbackCalculation.totalCashback > 0) {
        // Atualizar investimento com cashback
        investment.cashbackRate = cashbackCalculation.cashbackRate;
        await investment.addCashback(
          cashbackCalculation.totalCashback,
          `Cashback: ${cashbackCalculation.appliedRules.map(r => r.rule).join(', ')}`
        );

        // Atualizar saldo do usuário
        await User.findByIdAndUpdate(
          userId,
          { 
            $inc: { 
              balance: cashbackCalculation.totalCashback,
              totalCashbackReceived: cashbackCalculation.totalCashback
            } 
          }
        );

        // Registrar transação de cashback
        // (A transação será criada pelo sistema de transações)

        // Verificar conquistas relacionadas a cashback
        await AchievementService.checkCashbackAchievements(userId, cashbackCalculation.totalCashback);
      }

      return {
        success: true,
        cashback: cashbackCalculation.totalCashback,
        rules: cashbackCalculation.appliedRules,
        message: cashbackCalculation.totalCashback > 0 
          ? `Cashback de €${cashbackCalculation.totalCashback} aplicado com sucesso!`
          : 'Nenhum cashback aplicável para este investimento'
      };
    } catch (error) {
      console.error('Erro ao aplicar cashback:', error);
      throw error;
    }
  }

  // Obter histórico de cashback de um usuário
  async getUserCashbackHistory(userId, limit = 10, page = 1) {
    try {
      const investments = await Investment.find({
        user: userId,
        cashbackBonus: { $gt: 0 }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('robot', 'name');

      const total = await Investment.countDocuments({
        user: userId,
        cashbackBonus: { $gt: 0 }
      });

      return {
        investments,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        totalCashback: investments.reduce((sum, inv) => sum + inv.cashbackBonus, 0)
      };
    } catch (error) {
      console.error('Erro ao buscar histórico de cashback:', error);
      throw error;
    }
  }

  // Obter estatísticas de cashback
  async getCashbackStats() {
    try {
      const stats = await Investment.aggregate([
        {
          $match: {
            cashbackBonus: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            totalCashbackGiven: { $sum: '$cashbackBonus' },
            totalInvestmentsWithCashback: { $sum: 1 },
            averageCashback: { $avg: '$cashbackBonus' },
            maxCashback: { $max: '$cashbackBonus' }
          }
        }
      ]);

      return stats[0] || {
        totalCashbackGiven: 0,
        totalInvestmentsWithCashback: 0,
        averageCashback: 0,
        maxCashback: 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de cashback:', error);
      throw error;
    }
  }

  // Atualizar regras de cashback (apenas admin)
  updateCashbackRules(newRules) {
    this.cashbackRules = newRules;
  }

  // Adicionar promoção especial (apenas admin)
  addSpecialPromotion(promotion) {
    this.specialPromotions.push(promotion);
  }
}

module.exports = new CashbackService();