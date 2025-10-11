import compression from 'compression'
import { cache } from '../utils/cache.js'

// Configuração de compressão otimizada
export const compressionConfig = compression({
  // Nível de compressão (1-9, onde 9 é máximo)
  level: 6,
  
  // Threshold mínimo para compressão (em bytes)
  threshold: 1024,
  
  // Filtro para determinar quais respostas comprimir
  filter: (req, res) => {
    // Não comprimir se o cliente não suporta
    if (!compression.filter(req, res)) {
      return false
    }
    
    // Não comprimir respostas já comprimidas
    if (res.getHeader('content-encoding')) {
      return false
    }
    
    // Não comprimir uploads/downloads de arquivos grandes
    const contentType = res.getHeader('content-type')
    if (contentType) {
      // Não comprimir imagens, vídeos, arquivos já comprimidos
      const skipTypes = [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/x-rar',
        'application/pdf',
        'application/octet-stream'
      ]
      
      if (skipTypes.some(type => contentType.includes(type))) {
        return false
      }
    }
    
    // Comprimir apenas respostas de sucesso
    return res.statusCode >= 200 && res.statusCode < 300
  },
  
  // Configurações do zlib
  chunkSize: 16 * 1024, // 16KB chunks
  windowBits: 15,
  memLevel: 8,
  
  // Cache de compressão
  cache: false // Desabilitado pois usamos nosso próprio cache
})

// Middleware de compressão com cache inteligente
export const smartCompressionMiddleware = (options = {}) => {
  const {
    cacheCompressed = true,
    cacheTTL = 3600, // 1 hora
    maxCacheSize = 1024 * 1024 // 1MB
  } = options
  
  return async (req, res, next) => {
    // Aplicar compressão padrão primeiro
    compressionConfig(req, res, () => {
      if (!cacheCompressed) {
        return next()
      }
      
      // Cache de respostas comprimidas para conteúdo estático
      const originalSend = res.send
      const originalJson = res.json
      
      // Gerar chave de cache baseada na URL e Accept-Encoding
      const acceptEncoding = req.headers['accept-encoding'] || ''
      const cacheKey = `compressed:${req.method}:${req.originalUrl}:${acceptEncoding}`
      
      // Interceptar res.send
      res.send = function(data) {
        if (shouldCacheResponse(this, data, maxCacheSize)) {
          cacheCompressedResponse(cacheKey, data, cacheTTL)
        }
        return originalSend.call(this, data)
      }
      
      // Interceptar res.json
      res.json = function(data) {
        const jsonString = JSON.stringify(data)
        if (shouldCacheResponse(this, jsonString, maxCacheSize)) {
          cacheCompressedResponse(cacheKey, jsonString, cacheTTL)
        }
        return originalJson.call(this, data)
      }
      
      next()
    })
  }
}

// Verificar se a resposta deve ser cacheada
const shouldCacheResponse = (res, data, maxSize) => {
  // Apenas respostas de sucesso
  if (res.statusCode < 200 || res.statusCode >= 300) {
    return false
  }
  
  // Verificar tamanho
  const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8')
  if (size > maxSize) {
    return false
  }
  
  // Verificar se é conteúdo cacheável
  const contentType = res.getHeader('content-type') || ''
  const cacheableTypes = [
    'application/json',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'text/xml',
    'application/xml'
  ]
  
  return cacheableTypes.some(type => contentType.includes(type))
}

// Cachear resposta comprimida
const cacheCompressedResponse = async (key, data, ttl) => {
  try {
    await cache.set(key, {
      data,
      timestamp: Date.now(),
      size: Buffer.byteLength(data, 'utf8')
    }, ttl)
  } catch (error) {
    console.error('Error caching compressed response:', error)
  }
}

// Middleware para servir conteúdo comprimido do cache
export const serveFromCompressionCache = async (req, res, next) => {
  try {
    const acceptEncoding = req.headers['accept-encoding'] || ''
    const cacheKey = `compressed:${req.method}:${req.originalUrl}:${acceptEncoding}`
    
    const cached = await cache.get(cacheKey)
    if (cached && cached.data) {
      // Definir headers apropriados
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT'
      })
      
      return res.send(cached.data)
    }
    
    // Adicionar header para indicar miss
    res.set('X-Cache', 'MISS')
    next()
  } catch (error) {
    console.error('Error serving from compression cache:', error)
    next()
  }
}

// Middleware para otimização de imagens
export const imageOptimizationMiddleware = (req, res, next) => {
  // Verificar se é uma requisição de imagem
  const isImageRequest = req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  
  if (isImageRequest) {
    // Definir headers de cache agressivo para imagens
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 ano
      'Vary': 'Accept-Encoding'
    })
    
    // Sugerir formato WebP se suportado
    const acceptHeader = req.headers.accept || ''
    if (acceptHeader.includes('image/webp')) {
      res.set('Accept-CH', 'Viewport-Width, Width')
    }
  }
  
  next()
}

// Middleware para compressão de API responses
export const apiCompressionMiddleware = (req, res, next) => {
  // Aplicar compressão mais agressiva para APIs
  const apiCompression = compression({
    level: 9, // Máxima compressão para APIs
    threshold: 512, // Threshold menor
    filter: (req, res) => {
      // Comprimir apenas JSON e XML
      const contentType = res.getHeader('content-type') || ''
      return contentType.includes('application/json') || 
             contentType.includes('application/xml') ||
             contentType.includes('text/xml')
    }
  })
  
  apiCompression(req, res, next)
}

// Middleware para compressão de assets estáticos
export const staticCompressionMiddleware = (req, res, next) => {
  const staticCompression = compression({
    level: 9,
    threshold: 1024,
    filter: (req, res) => {
      const contentType = res.getHeader('content-type') || ''
      return contentType.includes('text/css') ||
             contentType.includes('text/javascript') ||
             contentType.includes('application/javascript') ||
             contentType.includes('text/html')
    }
  })
  
  staticCompression(req, res, next)
}

// Utilitários de compressão
export const compressionUtils = {
  // Comprimir dados manualmente
  async compressData(data, algorithm = 'gzip') {
    const zlib = await import('zlib')
    const util = await import('util')
    
    const compress = util.promisify(
      algorithm === 'deflate' ? zlib.deflate : zlib.gzip
    )
    
    return compress(Buffer.from(data))
  },
  
  // Descomprimir dados
  async decompressData(data, algorithm = 'gzip') {
    const zlib = await import('zlib')
    const util = await import('util')
    
    const decompress = util.promisify(
      algorithm === 'deflate' ? zlib.inflate : zlib.gunzip
    )
    
    return decompress(data)
  },
  
  // Calcular taxa de compressão
  calculateCompressionRatio(originalSize, compressedSize) {
    return ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
  },
  
  // Middleware de logging de compressão
  compressionLogger: (req, res, next) => {
    const originalSend = res.send
    
    res.send = function(data) {
      const originalSize = Buffer.byteLength(data, 'utf8')
      const encoding = res.getHeader('content-encoding')
      
      if (encoding && (encoding.includes('gzip') || encoding.includes('deflate'))) {
        console.log(`Compression applied to ${req.originalUrl}:`, {
          originalSize,
          encoding,
          timestamp: new Date().toISOString()
        })
      }
      
      return originalSend.call(this, data)
    }
    
    next()
  }
}

export default {
  compressionConfig,
  smartCompressionMiddleware,
  serveFromCompressionCache,
  imageOptimizationMiddleware,
  apiCompressionMiddleware,
  staticCompressionMiddleware,
  compressionUtils
}