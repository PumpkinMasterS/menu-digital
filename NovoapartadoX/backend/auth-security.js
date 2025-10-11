import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'

// Rate limiting para login
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

// Validadores de entrada
export const loginValidators = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password deve ter pelo menos 6 caracteres')
    // Validação relaxada para desenvolvimento - apenas letras e números
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Password deve conter apenas letras e números')
]

export const registerValidators = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial')
]

// Função para validar entrada
export const validateInput = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    })
  }
  next()
}

// Geração de tokens mais segura
export const generateTokens = (payload, jwtSecret) => {
  const accessToken = jwt.sign(payload, jwtSecret, { 
    expiresIn: '15m',
    issuer: 'novoapartadox',
    audience: 'novoapartadox-users'
  })
  
  const refreshTokenPayload = {
    sub: payload.sub,
    type: 'refresh',
    tokenVersion: typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0
  }
  
  const refreshToken = jwt.sign(
    refreshTokenPayload, 
    jwtSecret, 
    { 
      expiresIn: '7d',
      issuer: 'novoapartadox',
      audience: 'novoapartadox-users'
    }
  )
  
  return { accessToken, refreshToken }
}

// Verificação de token mais segura
export const verifyToken = (token, jwtSecret, tokenType = 'access') => {
  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'novoapartadox',
      audience: 'novoapartadox-users'
    })
    
    if (tokenType === 'refresh' && decoded.type !== 'refresh') {
      throw new Error('Token type mismatch')
    }
    
    return decoded
  } catch (error) {
    throw new Error('Token inválido')
  }
}

// Middleware de autenticação melhorado
export const authMiddleware = (requiredRole, jwtSecret) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Token de acesso requerido',
          code: 'NO_TOKEN'
        })
      }
      
      const token = authHeader.slice(7)
      const decoded = verifyToken(token, jwtSecret)
      
      // Verificar se o token não expirou
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        })
      }
      
      // Verificar role se necessário
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ 
          error: 'Permissões insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      }
      
      req.user = decoded
      next()
    } catch (error) {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      })
    }
  }
}

// Hash de password mais seguro
export const hashPassword = async (password) => {
  const saltRounds = 12 // Aumentado para maior segurança
  return await bcrypt.hash(password, saltRounds)
}

// Verificação de password
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash)
}

// Sanitização de dados do usuário
export const sanitizeUser = (user) => {
  const { passwordHash, ...sanitizedUser } = user
  return sanitizedUser
}

// Middleware para logs de segurança
export const securityLogger = (req, res, next) => {
  const originalSend = res.send
  
  res.send = function(data) {
    // Log tentativas de login falhadas
    if (req.path === '/api/auth/login' && res.statusCode === 401) {
      console.warn(`Failed login attempt from IP: ${req.ip}, Email: ${req.body?.email}`)
    }
    
    // Log acessos não autorizados
    if (res.statusCode === 403) {
      console.warn(`Unauthorized access attempt from IP: ${req.ip}, Path: ${req.path}`)
    }
    
    originalSend.call(this, data)
  }
  
  next()
}