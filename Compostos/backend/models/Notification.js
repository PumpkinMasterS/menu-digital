const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'profit', 'investment', 'task', 'referral', 'system', 'commission'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    // Dados adicionais específicos para cada tipo de notificação
    robotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Robot' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    amount: { type: Number },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  expiresAt: {
    type: Date,
    // Notificações expiram após 30 dias
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para consultas eficientes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 dias

// Virtual para verificar se a notificação está expirada
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Método para marcar como lida
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Método estático para criar notificações em lote
notificationSchema.statics.createBatch = async function(notifications) {
  return this.insertMany(notifications);
};

// Método estático para buscar notificações não lidas de um usuário
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Middleware para limpar notificações expiradas antes de consultas
notificationSchema.pre('find', function() {
  this.where({ expiresAt: { $gt: new Date() } });
});

notificationSchema.pre('findOne', function() {
  this.where({ expiresAt: { $gt: new Date() } });
});

module.exports = mongoose.model('Notification', notificationSchema);