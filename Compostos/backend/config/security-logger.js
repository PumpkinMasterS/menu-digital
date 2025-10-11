const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Garantir que o diretório de logs existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuração de níveis de log personalizados para segurança
const securityLevels = {
  levels: {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
  },
  colors: {
    emergency: 'red',
    alert: 'red',
    critical: 'red',
    error: 'red',
    warning: 'yellow',
    notice: 'blue',
    info: 'green',
    debug: 'gray'
  }
};

// Logger principal de segurança
const securityLogger = winston.createLogger({
  levels: securityLevels.levels,
  level: process.env.SECURITY_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Arquivo de logs de segurança
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 30,
      tailable: true
    }),
    
    // Arquivo de logs críticos (erros e acima)
    new winston.transports.File({
      filename: path.join(logsDir, 'security-critical.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 15,
      tailable: true
    }),
    
    // Arquivo de auditoria detalhada
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'debug',
      maxsize: 10485760, // 10MB
      maxFiles: 20,
      tailable: true
    })
  ]
});

// Adicionar console logging em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'debug'
  }));
}

// Middleware para logging de requisições HTTP
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    securityLogger.info('HTTP_REQUEST', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user ? req.user._id : null,
      userEmail: req.user ? req.user.email : null,
      timestamp: new Date().toISOString()
    });
    
    // Log de erros do servidor
    if (res.statusCode >= 500) {
      securityLogger.error('HTTP_SERVER_ERROR', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log de tentativas de acesso não autorizado
    if (res.statusCode === 401 || res.statusCode === 403) {
      securityLogger.warning('UNAUTHORIZED_ACCESS_ATTEMPT', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

// Funções de logging específicas para segurança
const securityLog = {
  // Login attempts
  loginAttempt: (email, success, ip, userAgent, details = {}) => {
    const level = success ? 'info' : 'warning';
    securityLogger.log(level, 'LOGIN_ATTEMPT', {
      email,
      success,
      ip,
      userAgent,
      ...details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Account lockout
  accountLockout: (email, ip, reason, attempts) => {
    securityLogger.alert('ACCOUNT_LOCKOUT', {
      email,
      ip,
      reason,
      attempts,
      timestamp: new Date().toISOString()
    });
  },
  
  // Password reset
  passwordReset: (email, ip, success, details = {}) => {
    const level = success ? 'info' : 'warning';
    securityLogger.log(level, 'PASSWORD_RESET', {
      email,
      ip,
      success,
      ...details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Admin actions
  adminAction: (adminId, action, target, details = {}) => {
    securityLogger.info('ADMIN_ACTION', {
      adminId,
      action,
      target,
      ...details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Security critical events
  securityEvent: (event, level, details = {}) => {
    securityLogger.log(level, 'SECURITY_EVENT', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Database operations
  databaseOperation: (operation, collection, documentId, details = {}) => {
    securityLogger.debug('DATABASE_OPERATION', {
      operation,
      collection,
      documentId,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
};

// Rotação automática de logs (executar diariamente)
const rotateLogs = () => {
  // Implementar lógica de rotação se necessário
  securityLogger.info('LOG_ROTATION', {
    message: 'Rotação de logs iniciada',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  securityLogger,
  requestLogger,
  securityLog,
  rotateLogs
};