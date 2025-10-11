const mongoose = require('mongoose');

const referralRewardSchema = new mongoose.Schema({
  referrerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  referredId: {
    type: String,
    required: true,
    ref: 'User'
  },
  level: {
    type: String,
    enum: ['first', 'second'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index para consultas otimizadas
referralRewardSchema.index({ referrerId: 1, date: -1 });
referralRewardSchema.index({ referredId: 1 });
referralRewardSchema.index({ level: 1 });

module.exports = mongoose.model('ReferralReward', referralRewardSchema);