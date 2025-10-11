const mongoose = require('mongoose');

const rankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  level: {
    type: Number,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#6B7280'
  },
  icon: {
    type: String,
    default: '⭐'
  },
  // Requisitos de qualificação
  requirements: {
    personalInvestment: {
      type: Number,
      default: 0
    },
    teamInvestment: {
      type: Number,
      default: 0
    },
    directReferrals: {
      type: Number,
      default: 0
    },
    teamSize: {
      type: Number,
      default: 0
    },
    activeTeamMembers: {
      type: Number,
      default: 0
    },
    monthlyCommission: {
      type: Number,
      default: 0
    }
  },
  // Benefícios do rank
  benefits: {
    commissionBonus: {
      type: Number,
      default: 0
    },
    leadershipBonus: {
      type: Number,
      default: 0
    },
    matchingBonus: {
      type: Number,
      default: 0
    },
    maxLevels: {
      type: Number,
      default: 5
    },
    specialAccess: [String],
    prioritySupport: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
rankSchema.index({ level: 1 });
rankSchema.index({ isActive: 1 });

module.exports = mongoose.model('Rank', rankSchema);