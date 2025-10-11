const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['investment', 'cashback', 'referral', 'robot', 'milestone', 'special']
  },
  criteria: {
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      required: true,
      enum: ['>=', '==', '<=', '>', '<', '!=']
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  reward: {
    type: {
      type: String,
      required: true,
      enum: ['cashback_bonus', 'extra_cashback', 'badge', 'title', 'feature_unlock']
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    },
    description: {
      type: String
    }
  },
  icon: {
    type: String,
    default: '🏆'
  },
  category: {
    type: String,
    required: true,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  },
  points: {
    type: Number,
    required: true,
    min: 0
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice para busca eficiente
achievementSchema.index({ type: 1, category: 1, isActive: 1 });

// Método para verificar se um usuário atingiu esta conquista
achievementSchema.methods.checkAchievement = function(userData) {
  const { field, operator, value } = this.criteria;
  
  if (!userData || userData[field] === undefined) {
    return false;
  }

  const userValue = userData[field];
  
  switch (operator) {
    case '>=':
      return userValue >= value;
    case '<=':
      return userValue <= value;
    case '>':
      return userValue > value;
    case '<':
      return userValue < value;
    case '==':
      return userValue === value;
    case '!=':
      return userValue !== value;
    default:
      return false;
  }
};

module.exports = mongoose.model('Achievement', achievementSchema);