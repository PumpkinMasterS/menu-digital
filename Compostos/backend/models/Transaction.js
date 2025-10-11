const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  type: {
    type: String,
    required: [true, 'Tipo da transação é obrigatório'],
    enum: ['deposit', 'withdrawal', 'investment', 'profit', 'commission', 'bonus', 'fee']
  },
  amount: {
    type: Number,
    required: [true, 'Valor da transação é obrigatório']
  },
  fee: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: [true, 'Moeda é obrigatória'],
    enum: ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB'],
    default: 'USDT'
  },
  network: {
    type: String,
    enum: ['BEP20', 'ERC20', 'TRC20', 'BTC', 'INTERNAL'],
    default: 'INTERNAL'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória']
  },
  fromAddress: {
    type: String
  },
  toAddress: {
    type: String
  },
  txHash: {
    type: String,
    sparse: true,
    unique: true
  },
  blockNumber: {
    type: Number
  },
  blockHash: {
    type: String
  },
  confirmations: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date
  },
  metadata: {
    tokenAddress: String,
    decimals: Number,
    explorerUrl: String,
    network: String,
    gasUsed: Number,
    gasPrice: Number,
    memo: String
  },
  relatedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityType'
  },
  relatedEntityType: {
    type: String,
    enum: ['Investment', 'Robot', 'Commission', 'Task', 'Achievement']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para melhor performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Virtuals
transactionSchema.virtual('isDeposit').get(function() {
  return this.type === 'deposit';
});

transactionSchema.virtual('isWithdrawal').get(function() {
  return this.type === 'withdrawal';
});

transactionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

transactionSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Métodos
transactionSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

transactionSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.description = `${this.description} - Falha: ${reason}`;
  return this.save();
};

// Middleware
transactionSchema.pre('save', function(next) {
  // Calcular totalAmount se não fornecido
  if (this.totalAmount === undefined) {
    this.totalAmount = this.amount + (this.fee || 0);
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);