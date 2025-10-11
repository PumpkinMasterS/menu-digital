const rateLimit = require('express-rate-limit');

// Configurações de rate limiting global
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // limite de 1000 requests por IP por janela
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para health checks e requisições internas
    return req.path.includes('/health') || req.ip === '::1' || req.ip === '127.0.0.1';
  }
});

// Rate limiting para autenticação
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // limite de 10 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login, tente novamente em 15 minutos.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para API pública
const publicApiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto
  message: {
    error: 'Limite de requisições excedido, tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para operações críticas
const criticalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 requests por minuto para operações críticas
  message: {
    error: 'Operação muito frequente, tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para uploads
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 uploads por minuto
  message: {
    error: 'Muitos uploads, tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para SMS
const smsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 1, // 1 SMS por minuto
  message: {
    error: 'Muitas tentativas de SMS, tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para APIs externas
const externalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto para APIs externas
  message: {
    error: 'Limite de API externa excedido, tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de logging para requests
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

// Função para obter estatísticas de rate limiting
const getRateLimitStats = () => {
  return {
    global: globalRateLimiter,
    auth: authRateLimiter,
    publicApi: publicApiRateLimiter,
    critical: criticalRateLimiter,
    upload: uploadRateLimiter,
    sms: smsRateLimiter,
    externalApi: externalApiRateLimiter
  };
};

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  publicApiRateLimiter,
  criticalRateLimiter,
  uploadRateLimiter,
  smsRateLimiter,
  externalApiRateLimiter,
  getRateLimitStats,
  logRequest
};