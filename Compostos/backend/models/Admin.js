const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter no mínimo 6 caracteres'],
    select: false
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  permissions: {
    users: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    financial: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      manage_balances: { type: Boolean, default: true }
    },
    commissions: {
      read: { type: Boolean, default: true },
      manage: { type: Boolean, default: true }
    },
    settings: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: false }
    },
    audit: {
      read: { type: Boolean, default: true }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notas não podem ter mais de 500 caracteres']
  },
  // Campos para autenticação de dois fatores (2FA)
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorBackupCodes: [{
    code: {
      type: String,
      select: false
    },
    used: {
      type: Boolean,
      default: false
    }
  }],
  twoFactorLastUsed: {
    type: Date
  }
}, {
  timestamps: true
});

// Index para melhor performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ lastLogin: -1 });

// Hash da senha antes de salvar
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Verificar se a conta está bloqueada
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Método para verificar senha
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Método para gerar token JWT
adminSchema.methods.generateToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      type: 'admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Método para registrar login bem-sucedido
adminSchema.methods.loginSuccess = function() {
  this.lastLogin = new Date();
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// Método para registrar tentativa de login falhada
adminSchema.methods.loginFailed = function() {
  this.loginAttempts += 1;
  
  // Bloquear conta após 5 tentativas falhadas por 30 minutos
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
  }
  
  return this.save();
};

// Método para verificar permissões
adminSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'super_admin') return true;
  
  if (!this.permissions[resource]) return false;
  
  if (action === 'read') return this.permissions[resource].read;
  if (action === 'write') return this.permissions[resource].write;
  if (action === 'delete') return this.permissions[resource].delete;
  if (action === 'manage_balances') return this.permissions[resource].manage_balances;
  if (action === 'manage') return this.permissions[resource].manage;
  
  return false;
};

// Middleware para não incluir admins inativos nas queries por padrão
adminSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

module.exports = mongoose.model('Admin', adminSchema);