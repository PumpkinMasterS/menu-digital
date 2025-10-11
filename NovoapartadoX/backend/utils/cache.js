import Redis from 'ioredis'
import { promisify } from 'util'

// Configuração do Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
}

// Habilitar/Desabilitar Redis via env (padrão: desabilitado)
const redisEnabled = (() => {
  const v = process.env.REDIS_ENABLED
  if (!v) return false
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())
})()

// Cliente Redis principal
let redisClient = null
let isConnected = false

// Inicializar conexão Redis
export const initRedis = async () => {
  try {
    redisClient = new Redis(redisConfig)
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully')
      isConnected = true
    })
    
    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error)
      isConnected = false
    })
    
    redisClient.on('close', () => {
      console.log('⚠️ Redis connection closed')
      isConnected = false
    })
    
    // Testar conexão
    await redisClient.ping()
    return redisClient
    
  } catch (error) {
    console.error('Failed to initialize Redis:', error)
    // Fallback para cache em memória se Redis não estiver disponível
    return null
  }
}

// Cache em memória como fallback
class MemoryCache {
  constructor() {
    this.cache = new Map()
    this.timers = new Map()
  }
  
  set(key, value, ttl = 300) {
    // Limpar timer anterior se existir
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }
    
    this.cache.set(key, value)
    
    // Configurar expiração
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.cache.delete(key)
        this.timers.delete(key)
      }, ttl * 1000)
      
      this.timers.set(key, timer)
    }
  }
  
  get(key) {
    return this.cache.get(key) || null
  }
  
  del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
      this.timers.delete(key)
    }
    return this.cache.delete(key)
  }
  
  clear() {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.cache.clear()
  }
  
  keys(pattern = '*') {
    if (pattern === '*') {
      return Array.from(this.cache.keys())
    }
    // Implementação simples de pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.cache.keys()).filter(key => regex.test(key))
  }
}

// Instância do cache em memória
const memoryCache = new MemoryCache()

// Interface unificada de cache
export class CacheManager {
  constructor() {
    this.useRedis = false
  }
  
  async init() {
    try {
      if (!redisEnabled) {
        console.warn('Redis disabled via env (REDIS_ENABLED=false). Using memory cache')
        this.useRedis = false
        return
      }
      await initRedis()
      this.useRedis = isConnected
    } catch (error) {
      console.warn('Redis not available, using memory cache')
      this.useRedis = false
    }
  }
  
  async set(key, value, ttl = 300) {
    try {
      const serializedValue = JSON.stringify(value)
      
      if (this.useRedis && redisClient) {
        if (ttl > 0) {
          await redisClient.setex(key, ttl, serializedValue)
        } else {
          await redisClient.set(key, serializedValue)
        }
      } else {
        memoryCache.set(key, serializedValue, ttl)
      }
      
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }
  
  async get(key) {
    try {
      let value
      
      if (this.useRedis && redisClient) {
        value = await redisClient.get(key)
      } else {
        value = memoryCache.get(key)
      }
      
      if (value) {
        return JSON.parse(value)
      }
      
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }
  
  async del(key) {
    try {
      if (this.useRedis && redisClient) {
        return await redisClient.del(key)
      } else {
        return memoryCache.del(key)
      }
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }
  
  async clear(pattern = '*') {
    try {
      if (this.useRedis && redisClient) {
        const keys = await redisClient.keys(pattern)
        if (keys.length > 0) {
          return await redisClient.del(...keys)
        }
        return 0
      } else {
        const keys = memoryCache.keys(pattern)
        keys.forEach(key => memoryCache.del(key))
        return keys.length
      }
    } catch (error) {
      console.error('Cache clear error:', error)
      return false
    }
  }
  
  async exists(key) {
    try {
      if (this.useRedis && redisClient) {
        return await redisClient.exists(key)
      } else {
        return memoryCache.cache.has(key) ? 1 : 0
      }
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }
  
  async increment(key, amount = 1) {
    try {
      if (this.useRedis && redisClient) {
        return await redisClient.incrby(key, amount)
      } else {
        const current = memoryCache.get(key)
        const value = current ? parseInt(current) + amount : amount
        memoryCache.set(key, value.toString())
        return value
      }
    } catch (error) {
      console.error('Cache increment error:', error)
      return null
    }
  }
  
  async setHash(key, field, value, ttl = 300) {
    try {
      if (this.useRedis && redisClient) {
        await redisClient.hset(key, field, JSON.stringify(value))
        if (ttl > 0) {
          await redisClient.expire(key, ttl)
        }
      } else {
        const hashKey = `${key}:${field}`
        memoryCache.set(hashKey, JSON.stringify(value), ttl)
      }
      return true
    } catch (error) {
      console.error('Cache setHash error:', error)
      return false
    }
  }
  
  async getHash(key, field) {
    try {
      let value
      
      if (this.useRedis && redisClient) {
        value = await redisClient.hget(key, field)
      } else {
        const hashKey = `${key}:${field}`
        value = memoryCache.get(hashKey)
      }
      
      if (value) {
        return JSON.parse(value)
      }
      
      return null
    } catch (error) {
      console.error('Cache getHash error:', error)
      return null
    }
  }
}

// Instância global do cache
export const cache = new CacheManager()

// Middleware de cache para Express
export const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Gerar chave do cache
      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `cache:${req.method}:${req.originalUrl}`
      
      // Tentar obter do cache
      const cachedData = await cache.get(cacheKey)
      
      if (cachedData) {
        return res.json(cachedData)
      }
      
      // Interceptar res.json para cachear a resposta
      const originalJson = res.json
      res.json = function(data) {
        // Cachear apenas respostas de sucesso
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(console.error)
        }
        return originalJson.call(this, data)
      }
      
      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next()
    }
  }
}

// Decorator para cachear resultados de funções
export const cached = (ttl = 300, keyPrefix = 'func') => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value
    
    descriptor.value = async function(...args) {
      const cacheKey = `${keyPrefix}:${propertyName}:${JSON.stringify(args)}`
      
      // Tentar obter do cache
      const cachedResult = await cache.get(cacheKey)
      if (cachedResult !== null) {
        return cachedResult
      }
      
      // Executar função original
      const result = await method.apply(this, args)
      
      // Cachear resultado
      await cache.set(cacheKey, result, ttl)
      
      return result
    }
    
    return descriptor
  }
}

// Utilitários de cache específicos
export const cacheUtils = {
  // Cache de sessão de usuário
  async setUserSession(userId, sessionData, ttl = 3600) {
    return cache.set(`session:${userId}`, sessionData, ttl)
  },
  
  async getUserSession(userId) {
    return cache.get(`session:${userId}`)
  },
  
  async clearUserSession(userId) {
    return cache.del(`session:${userId}`)
  },
  
  // Cache de modelos
  async setModel(modelId, modelData, ttl = 600) {
    return cache.set(`model:${modelId}`, modelData, ttl)
  },
  
  async getModel(modelId) {
    return cache.get(`model:${modelId}`)
  },
  
  async clearModelCache(modelId = null) {
    if (modelId) {
      return cache.del(`model:${modelId}`)
    }
    return cache.clear('model:*')
  },
  
  // Cache de listagens
  async setModelsList(filters, data, ttl = 300) {
    const key = `models:list:${JSON.stringify(filters)}`
    return cache.set(key, data, ttl)
  },
  
  async getModelsList(filters) {
    const key = `models:list:${JSON.stringify(filters)}`
    return cache.get(key)
  },
  
  async clearModelsListCache() {
    return cache.clear('models:list:*')
  },
  
  // Rate limiting cache
  async incrementRateLimit(key, window = 3600) {
    const count = await cache.increment(`rate:${key}`)
    if (count === 1) {
      // Definir expiração apenas na primeira vez
      await cache.set(`rate:${key}`, count, window)
    }
    return count
  },
  
  async getRateLimit(key) {
    return cache.get(`rate:${key}`) || 0
  }
}

// Inicializar cache na inicialização do servidor
export const initCache = async () => {
  await cache.init()
  console.log(`Cache initialized (Redis: ${cache.useRedis ? 'enabled' : 'disabled'})`)
}

export default cache