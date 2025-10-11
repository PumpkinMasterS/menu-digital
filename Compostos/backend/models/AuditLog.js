const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_LOGIN',
      'USER_LOGOUT', 
      'USER_REGISTER',
      'USER_UPDATE',
      'USER_DELETE',
      'ROBOT_CREATE',
      'ROBOT_UPDATE',
      'ROBOT_DELETE',
      'INVESTMENT_CREATE',
      'INVESTMENT_UPDATE',
      'INVESTMENT_DELETE',
      'TASK_CREATE',
      'TASK_UPDATE',
      'TASK_DELETE',
      'TASK_COMPLETE',
      'REFERRAL_CREATE',
      'COMMISSION_CREATE',
      'PAYMENT_CREATE',
      'PAYMENT_UPDATE',
      'ADMIN_LOGIN',
      'ADMIN_LOGOUT',
      'ADMIN_CREATE',
      'ADMIN_UPDATE',
      'ADMIN_DELETE',
      'ADMIN_ACTION',
      'SYSTEM_EVENT',
      'BACKUP_CREATE',
      'BACKUP_RESTORE'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['User', 'Admin', 'Robot', 'Investment', 'Task', 'Referral', 'Commission', 'Payment']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'WARNING'],
    default: 'SUCCESS'
  }
}, {
  timestamps: true,
  capped: { size: 10000000, max: 100000 } // 10MB cap, 100k documentos
});

// Índices para consultas rápidas
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userEmail: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);