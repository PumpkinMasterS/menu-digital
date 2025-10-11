const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  robot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Robot',
    required: [true, 'Robô é obrigatório']
  },
  amount: {
    type: Number,
    required: [true, 'Valor do investimento é obrigatório'],
    min: [0.01, 'Valor deve ser maior que zero']
  },
  dailyProfit: {
    type: Number,
    required: [true, 'Lucro diário é obrigatório']
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  expectedTotalProfit: {
    type: Number,
    required: [true, 'Lucro total esperado é obrigatório']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'Data de término é obrigatória']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  lastProfitDate: {
    type: Date,
    default: Date.now
  },
  profitHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: 'Lucro diário'
    }
  }],
  referralBonus: {
    type: Number,
    default: 0
  },
  cashbackBonus: {
    type: Number,
    default: 0
  },
  cashbackRate: {
    type: Number,
    default: 0
  },
  isAutoRenew: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    required: [true, 'Duração é obrigatória'],
    min: [1, 'Duração deve ser pelo menos 1 dia']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ robot: 1, status: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ startDate: 1 });
investmentSchema.index({ endDate: 1 });

// Virtual para dias restantes
investmentSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'active') return 0;
  
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
});

// Virtual para dias passados
investmentSchema.virtual('daysPassed').get(function() {
  const now = new Date();
  const start = new Date(this.startDate);
  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.min(this.duration, Math.max(0, diffDays));
});

// Virtual para lucro diário atual
investmentSchema.virtual('currentDailyProfit').get(function() {
  return (this.amount * this.dailyProfit) / 100;
});

// Virtual para lucro total esperado até agora
investmentSchema.virtual('expectedProfitToDate').get(function() {
  const daysPassed = this.daysPassed;
  return this.currentDailyProfit * daysPassed;
});

// Middleware pré-save para validar datas
investmentSchema.pre('save', function(next) {
  if (this.isNew) {
    // Calcular data de término baseada na duração
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.duration);
    this.endDate = endDate;
    
    // Calcular lucro total esperado
    this.expectedTotalProfit = this.currentDailyProfit * this.duration;
  }
  next();
});

// Método para adicionar lucro diário
investmentSchema.methods.addDailyProfit = function() {
  const dailyProfit = this.currentDailyProfit;
  this.totalProfit += dailyProfit;
  
  this.profitHistory.push({
    date: new Date(),
    amount: dailyProfit,
    description: 'Lucro diário do investimento'
  });
  
  this.lastProfitDate = new Date();
  
  return this.save();
};

// Método para verificar se investimento está ativo
investmentSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < new Date(this.endDate);
};

// Método para finalizar investimento
investmentSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// Método para cancelar investimento
investmentSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Método para adicionar bônus de indicação
investmentSchema.methods.addReferralBonus = function(amount, description = 'Bônus de indicação') {
  this.referralBonus += amount;
  this.totalProfit += amount;
  
  this.profitHistory.push({
    date: new Date(),
    amount: amount,
    description: description
  });
  
  return this.save();
};

// Método para adicionar cashback
investmentSchema.methods.addCashback = function(amount, description = 'Cashback') {
  this.cashbackBonus += amount;
  this.totalProfit += amount;
  
  this.profitHistory.push({
    date: new Date(),
    amount: amount,
    description: description
  });
  
  return this.save();
};

// Query middleware para popular referências
investmentSchema.pre(/^find/, function(next) {
  this.populate('user', 'name email')
     .populate('robot', 'name dailyProfit');
  next();
});

module.exports = mongoose.model('Investment', investmentSchema);