const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    current: {
      type: Number,
      default: 0
    },
    target: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  isNew: {
    type: Boolean,
    default: true
  },
  rewardClaimed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para busca eficiente
userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });
userAchievementSchema.index({ user: 1, unlockedAt: -1 });
userAchievementSchema.index({ user: 1, isNew: 1 });

// Método para calcular progresso
userAchievementSchema.methods.updateProgress = function(currentValue) {
  this.progress.current = currentValue;
  this.progress.percentage = Math.min(
    Math.round((currentValue / this.progress.target) * 100),
    100
  );
  return this.save();
};

// Método para marcar como lida
userAchievementSchema.methods.markAsRead = function() {
  this.isNew = false;
  return this.save();
};

// Método para marcar recompensa como resgatada
userAchievementSchema.methods.claimReward = function() {
  this.rewardClaimed = true;
  return this.save();
};

module.exports = mongoose.model('UserAchievement', userAchievementSchema);