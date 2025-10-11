import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import hpp from 'hpp'
import cors from 'cors'

// Rate limiting para diferentes endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 requests por IP (aumentado de 100)
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // não conta requests bem-sucedidos
})

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 uploads por hora
  message: {
    error: 'Limite de uploads excedido. Tente novamente em 1 hora.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  }
})

// Configuração do CORS
export const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens permitidas (inclui suportes para múltiplas origens via env)
    const envOrigins = []
    if (process.env.FRONTEND_URL) envOrigins.push(process.env.FRONTEND_URL)
    if (process.env.FRONTEND_URLS) {
      try {
        envOrigins.push(
          ...process.env.FRONTEND_URLS
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        )
      } catch {}
    }

    const allowedOrigins = Array.from(new Set([
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:3000',
      'https://novoapartado.com',
      'https://www.novoapartado.com',
      ...envOrigins
    ]))
    
    // Permitir requests sem origin (mobile apps, etc.)
    if (!origin) return callback(null, true)

    // Em desenvolvimento, permitir todas as origens localhost
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true)
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn(`Origem bloqueada pelo CORS: ${origin}`)
      callback(new Error('Não permitido pelo CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

// Configuração do Helmet para segurança de headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Desabilitar para compatibilidade
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})

// Sanitização de dados MongoDB
export const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Tentativa de injeção NoSQL detectada: ${key} em ${req.path}`)
  }
})

// Proteção contra HTTP Parameter Pollution
export const hppConfig = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'city']
})

// Middleware de validação de Content-Type
export const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type')
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header é obrigatório',
        code: 'MISSING_CONTENT_TYPE'
      })
    }
    
    // Permitir apenas JSON e multipart/form-data
    if (!contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data')) {
      return res.status(415).json({
        error: 'Content-Type não suportado',
        code: 'UNSUPPORTED_CONTENT_TYPE'
      })
    }
  }
  
  next()
}

// Middleware de logging de segurança
export const securityLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:|onload=|onerror=)/i,
    /(union|select|insert|delete|drop|create|alter)/i,
    /(\$ne|\$gt|\$lt|\$in|\$nin)/i
  ]
  
  const checkSuspicious = (obj, path = '') => {
    if (typeof obj === 'string') {
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(obj)) {
          console.warn(`Padrão suspeito detectado em ${path}: ${obj.substring(0, 100)}`)
        }
      })
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        checkSuspicious(obj[key], `${path}.${key}`)
      })
    }
  }
  
  // Verificar body, query e params
  if (req.body) checkSuspicious(req.body, 'body')
  if (req.query) checkSuspicious(req.query, 'query')
  if (req.params) checkSuspicious(req.params, 'params')
  
  next()
}

// Middleware de headers de segurança customizados
export const customSecurityHeaders = (req, res, next) => {
  // Remover headers que revelam informações do servidor
  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')
  
  // Adicionar headers de segurança customizados
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  next()
}

// Middleware de validação de IP
export const ipValidation = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress
  
  // Lista de IPs bloqueados (exemplo)
  const blockedIPs = [
    // Adicionar IPs maliciosos conhecidos
  ]
  
  if (blockedIPs.includes(clientIP)) {
    console.warn(`Tentativa de acesso de IP bloqueado: ${clientIP}`)
    return res.status(403).json({
      error: 'Acesso negado',
      code: 'IP_BLOCKED'
    })
  }
  
  next()
}

export default {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  corsOptions,
  helmetConfig,
  mongoSanitizeConfig,
  hppConfig,
  validateContentType,
  securityLogger,
  customSecurityHeaders,
  ipValidation
}