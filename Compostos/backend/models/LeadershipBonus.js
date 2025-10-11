const mongoose = require('mongoose');

const leadershipBonusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  rankLevel: {
    type: Number,
    required: true,
    index: true
  },
  
  rankName: {
    type: String,
    required: true
  },
  
  bonusType: {
    type: String,
    enum: ['matching', 'team_volume', 'active_team', 'leadership'],
    required: true,
    index: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  calculationPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true,
    default: 'monthly'
  },
  
  periodStartDate: {
    type: Date,
    required: true
  },
  
  periodEndDate: {
    type: Date,
    required: true
  },
  
  teamStatistics: {
    totalMembers: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },
    totalCommissions: { type: Number, default: 0 },
    directReferrals: { type: Number, default: 0 }
  },
  
  matchingLevels: {
    type: Number,
    default: 0
  },
  
  description: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  paymentDate: {
    type: Date
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compostos para consultas eficientes
leadershipBonusSchema.index({ userId: 1, calculationPeriod: 1 });
leadershipBonusSchema.index({ userId: 1, status: 1 });
leadershipBonusSchema.index({ userId: 1, bonusType: 1 });
leadershipBonusSchema.index({ periodStartDate: 1, periodEndDate: 1 });

// Virtual para período formatado
leadershipBonusSchema.virtual('period').get(function() {
  return `${this.periodStartDate.toLocaleDateString('pt-BR')} - ${this.periodEndDate.toLocaleDateString('pt-BR')}`;
});

// Virtual para status formatado
leadershipBonusSchema.virtual('statusFormatted').get(function() {
  const statusMap = {
    'pending': 'Pendente',
    'approved': 'Aprovado', 
    'paid': 'Pago',
    'rejected': 'Rejeitado',
    'cancelled': 'Cancelado'
  };
  return statusMap[this.status] || this.status;
});

// Virtual para tipo de bônus formatado
leadershipBonusSchema.virtual('bonusTypeFormatted').get(function() {
  const typeMap = {
    'matching': 'Bônus Matching',
    'team_volume': 'Bônus Volume Equipe',
    'active_team': 'Bônus Equipe Ativa',
    'leadership': 'Bônus Liderança'
  };
  return typeMap[this.bonusType] || this.bonusType;
});

// Método para verificar se está elegível para pagamento
leadershipBonusSchema.methods.isEligibleForPayment = function() {
  return this.status === 'approved' && !this.paymentDate;
};

// Método para marcar como pago
leadershipBonusSchema.methods.markAsPaid = function(paymentDate = new Date()) {
  this.status = 'paid';
  this.paymentDate = paymentDate;
  return this.save();
};

const LeadershipBonus = mongoose.model('LeadershipBonus', leadershipBonusSchema);

module.exports = LeadershipBonus;