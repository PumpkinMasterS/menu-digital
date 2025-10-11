const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [50, 'Nome não pode ter mais de 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Por favor, forneça um email válido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Por favor, forneça um número de telefone válido'
    }
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Saldo não pode ser negativo']
  },
  totalInvested: {
    type: Number,
    default: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalCashbackReceived: {
    type: Number,
    default: 0
  },
  investmentsCount: {
    type: Number,
    default: 0
  },
  activeInvestments: {
    type: Number,
    default: 0
  },
  // Campos para sistema de conquistas
  achievementPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  achievementsUnlocked: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAchievementCheck: {
    type: Date,
    default: Date.now
  },
  referralCode: {
    type: String,
    unique: true,
    uppercase: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Campos para sistema de ranks
  currentRank: {
    type: String,
    default: null
  },
  currentRankLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  rankPromotionDate: {
    type: Date,
    default: null
  },
  // Lista de tokens de dispositivos para push notifications
  deviceTokens: [
    {
      token: { type: String, required: true },
      platform: { type: String, enum: ['ios', 'android', 'web', 'unknown'], default: 'unknown' },
      updatedAt: { type: Date, default: Date.now }
    }
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ 'deviceTokens.token': 1 });

// Virtual para referrals
userSchema.virtual('referrals', {
  ref: 'User',
  localField: '_id',
  foreignField: 'referredBy'
});

// Virtual para contagem de referrals
userSchema.virtual('referralCount').get(function() {
  return this.referrals ? this.referrals.length : 0;
});

// Middleware pré-save para hash da senha
userSchema.pre('save', async function(next) {
  // Só executa hash se a senha foi modificada
  if (!this.isModified('password')) return next();
  
  // Hash da senha com custo 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Middleware pré-save para gerar referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }
  next();
});

// Método para verificar senha
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Método para gerar referral code
userSchema.methods.generateReferralCode = function() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Método para atualizar saldo
userSchema.methods.updateBalance = function(amount) {
  this.balance += amount;
  if (amount > 0) {
    this.totalEarned += amount;
  }
  return this.save();
};

// Método para verificar se usuário pode investir
userSchema.methods.canInvest = function(amount) {
  return this.balance >= amount;
};

// Query middleware para excluir usuários inativos
userSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

module.exports = mongoose.model('User', userSchema);