const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título da tarefa é obrigatório'],
    trim: true,
    maxlength: [100, 'Título não pode ter mais de 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'Descrição da tarefa é obrigatória'],
    maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
  },
  reward: {
    type: Number,
    required: [true, 'Recompensa da tarefa é obrigatória'],
    min: [0, 'Recompensa não pode ser negativa']
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'one_time', 'achievement'],
    required: [true, 'Tipo de tarefa é obrigatório']
  },
  category: {
    type: String,
    enum: ['investment', 'referral', 'social', 'learning', 'verification'],
    required: [true, 'Categoria da tarefa é obrigatória']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxCompletions: {
    type: Number,
    default: 1
  },
  cooldownHours: {
    type: Number,
    default: 24
  },
  requirements: {
    minInvestment: {
      type: Number,
      default: 0
    },
    minReferrals: {
      type: Number,
      default: 0
    },
    minBalance: {
      type: Number,
      default: 0
    }
  },
  icon: {
    type: String,
    default: '📝'
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
taskSchema.index({ type: 1, isActive: 1 });
taskSchema.index({ category: 1, isActive: 1 });
taskSchema.index({ priority: -1 });

// Virtual para completions
taskSchema.virtual('completions', {
  ref: 'TaskCompletion',
  localField: '_id',
  foreignField: 'task'
});

// Método para verificar se tarefa pode ser completada por usuário
taskSchema.methods.canBeCompletedByUser = function(user) {
  if (!this.isActive) return false;
  
  // Verificar requisitos de investimento
  if (this.requirements.minInvestment > 0 && user.totalInvested < this.requirements.minInvestment) {
    return false;
  }
  
  // Verificar requisitos de referrals
  if (this.requirements.minReferrals > 0 && user.referralCount < this.requirements.minReferrals) {
    return false;
  }
  
  // Verificar requisitos de saldo
  if (this.requirements.minBalance > 0 && user.balance < this.requirements.minBalance) {
    return false;
  }
  
  return true;
};

// Método para obter estatísticas de completação
taskSchema.methods.getCompletionStats = async function() {
  const TaskCompletion = mongoose.model('TaskCompletion');
  
  const stats = await TaskCompletion.aggregate([
    { $match: { task: this._id } },
    {
      $group: {
        _id: '$task',
        totalCompletions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        totalRewardDistributed: { $sum: '$reward' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCompletions: 0,
    uniqueUsers: [],
    totalRewardDistributed: 0
  };
};

module.exports = mongoose.model('Task', taskSchema);