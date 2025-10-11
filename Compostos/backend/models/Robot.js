const mongoose = require('mongoose');

const robotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do robô é obrigatório'],
    trim: true,
    maxlength: [50, 'Nome não pode ter mais de 50 caracteres']
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
  },
  dailyProfit: {
    type: Number,
    required: [true, 'Lucro diário é obrigatório'],
    min: [0.1, 'Lucro diário deve ser pelo menos 0.1%'],
    max: [10, 'Lucro diário não pode ser maior que 10%']
  },
  minInvestment: {
    type: Number,
    required: true,
    min: [50, 'Investimento mínimo deve ser pelo menos € 50,00']
  },
  maxInvestment: {
    type: Number,
    required: true,
    min: [100, 'Investimento máximo deve ser pelo menos € 100,00']
  },
  duration: {
    type: Number,
    required: [true, 'Duração é obrigatória'],
    min: [1, 'Duração deve ser pelo menos 1 dia'],
    max: [365, 'Duração não pode ser maior que 365 dias']
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'maintenance'],
    default: 'active'
  },
  totalInvestors: {
    type: Number,
    default: 0
  },
  totalInvested: {
    type: Number,
    default: 0
  },
  totalProfitGenerated: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: ''
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  performanceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    profit: {
      type: Number,
      required: true
    },
    totalInvestors: {
      type: Number,
      required: true
    },
    totalInvested: {
      type: Number,
      required: true
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  // Configurações de Trading Real
  tradingConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    exchange: {
      type: String,
      enum: ['binance', 'bitget', 'bybit'],
      default: 'binance'
    },
    symbol: {
      type: String,
      default: 'BTCUSDT'
    },
    strategy: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'conservative'
    },
    allocation: {
      type: Number,
      min: 0.01,
      max: 1.0,
      default: 0.1
    },
    apiKey: {
      type: String,
      default: ''
    },
    apiSecret: {
      type: String,
      default: ''
    },
    lastTradeDate: {
      type: Date,
      default: null
    },
    tradingStats: {
      totalTrades: {
        type: Number,
        default: 0
      },
      successfulTrades: {
        type: Number,
        default: 0
      },
      totalProfit: {
        type: Number,
        default: 0
      },
      winRate: {
        type: Number,
        default: 0
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
robotSchema.index({ name: 1 });
robotSchema.index({ status: 1 });
robotSchema.index({ riskLevel: 1 });
robotSchema.index({ isFeatured: 1 });
robotSchema.index({ 'tags': 1 });

// Virtual para investimentos ativos
robotSchema.virtual('activeInvestments', {
  ref: 'Investment',
  localField: '_id',
  foreignField: 'robot',
  match: { status: 'active' }
});

// Virtual para contagem de investimentos ativos
robotSchema.virtual('activeInvestorsCount').get(function() {
  return this.activeInvestments ? this.activeInvestments.length : 0;
});

// Método para calcular lucro diário
robotSchema.methods.calculateDailyProfit = function(investmentAmount) {
  return (investmentAmount * this.dailyProfit) / 100;
};

// Método para calcular lucro total do investimento
robotSchema.methods.calculateTotalProfit = function(investmentAmount, days) {
  const dailyProfit = this.calculateDailyProfit(investmentAmount);
  return dailyProfit * days;
};

// Método para atualizar histórico de performance
robotSchema.methods.updatePerformanceHistory = function() {
  this.performanceHistory.push({
    date: new Date(),
    profit: this.dailyProfit,
    totalInvestors: this.totalInvestors,
    totalInvested: this.totalInvested
  });
  
  // Manter apenas os últimos 30 registros
  if (this.performanceHistory.length > 30) {
    this.performanceHistory = this.performanceHistory.slice(-30);
  }
  
  return this.save();
};

// Método para verificar se robô pode receber investimento
robotSchema.methods.canAcceptInvestment = function(amount) {
  return this.status === 'active' && 
         amount >= this.minInvestment && 
         amount <= this.maxInvestment;
};

// Query middleware para excluir robôs inativos
robotSchema.pre(/^find/, function(next) {
  this.find({ status: { $ne: 'maintenance' } });
  next();
});

module.exports = mongoose.model('Robot', robotSchema);