const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: Number,
    enum: [1, 2],
    required: true
  },
  rewardPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ referredUser: 1 });
referralSchema.index({ status: 1 });

module.exports = mongoose.model('Referral', referralSchema);