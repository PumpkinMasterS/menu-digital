const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
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
    max: 1
  },
  source: {
    type: String,
    required: true
  },
  sourceType: {
    type: String,
    required: true,
    enum: ['investment', 'task', 'trading', 'subscription', 'cashback', 'manual']
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  approvedDate: {
    type: Date
  },
  cancelledDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
commissionSchema.index({ userId: 1, createdAt: -1 });
commissionSchema.index({ referrerId: 1, createdAt: -1 });
commissionSchema.index({ sourceType: 1, status: 1 });
commissionSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted amount
commissionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(this.amount);
});

// Virtual for formatted percentage
commissionSchema.virtual('formattedPercentage').get(function() {
  return `${(this.percentage * 100).toFixed(2)}%`;
});

// Method to check if commission can be approved
commissionSchema.methods.canApprove = function() {
  return this.status === 'pending';
};

// Method to check if commission can be paid
commissionSchema.methods.canPay = function() {
  return this.status === 'approved';
};

// Method to check if commission can be cancelled
commissionSchema.methods.canCancel = function() {
  return ['pending', 'approved'].includes(this.status);
};

module.exports = mongoose.model('Commission', commissionSchema);