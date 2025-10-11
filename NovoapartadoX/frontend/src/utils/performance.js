// Utilitários de performance e otimização

// Cache simples em memória
class SimpleCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutos por padrão
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key, value) {
    // Remove o mais antigo se exceder o tamanho máximo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    // Verifica se expirou
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  clear() {
    this.cache.clear()
  }

  has(key) {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

// Cache global para a aplicação
export const appCache = new SimpleCache(200, 10 * 60 * 1000) // 10 minutos

// Debounce function
export const debounce = (func, wait, immediate = false) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Lazy loading de imagens
export const lazyLoadImage = (img, src, placeholder = '/placeholder.jpg') => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    
    image.onload = () => {
      img.src = src
      img.classList.add('loaded')
      resolve(src)
    }
    
    image.onerror = () => {
      img.src = placeholder
      img.classList.add('error')
      reject(new Error('Failed to load image'))
    }
    
    image.src = src
  })
}

// Intersection Observer para lazy loading
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  }

  return new IntersectionObserver(callback, { ...defaultOptions, ...options })
}

// Preload de recursos críticos
export const preloadResource = (href, as = 'fetch', crossorigin = 'anonymous') => {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  if (crossorigin) link.crossOrigin = crossorigin
  document.head.appendChild(link)
}

// Preload de imagens
export const preloadImages = (imageUrls) => {
  return Promise.allSettled(
    imageUrls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = () => reject(new Error(`Failed to preload ${url}`))
        img.src = url
      })
    })
  )
}

// Compressão de imagens no cliente
export const compressImage = (file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calcular novas dimensões mantendo aspect ratio
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      // Desenhar e comprimir
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}

// Monitoramento de performance
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0
    }
    
    this.init()
  }

  init() {
    // Page Load Time
    window.addEventListener('load', () => {
      this.metrics.pageLoadTime = performance.now()
    })

    // Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime
          }
        }
      }).observe({ entryTypes: ['paint'] })

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metrics.largestContentfulPaint = lastEntry.startTime
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            this.metrics.cumulativeLayoutShift += entry.value
          }
        }
      }).observe({ entryTypes: ['layout-shift'] })

      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime
        }
      }).observe({ entryTypes: ['first-input'] })
    }
  }

  getMetrics() {
    return { ...this.metrics }
  }

  logMetrics() {
    console.table(this.metrics)
  }

  sendMetrics(endpoint) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...this.metrics,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    }).catch(console.error)
  }
}

// Otimização de bundle
export const loadChunk = async (chunkName) => {
  try {
    const module = await import(/* webpackChunkName: "[request]" */ `../chunks/${chunkName}`)
    return module.default || module
  } catch (error) {
    console.error(`Failed to load chunk: ${chunkName}`, error)
    throw error
  }
}

// Service Worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      throw error
    }
  }
}

// Memory usage monitoring
export const getMemoryUsage = () => {
  if (performance.memory) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    }
  }
  return null
}

// Cleanup de event listeners
export const createCleanupManager = () => {
  const listeners = []
  
  const addListener = (element, event, handler, options) => {
    element.addEventListener(event, handler, options)
    listeners.push({ element, event, handler, options })
  }
  
  const cleanup = () => {
    listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options)
    })
    listeners.length = 0
  }
  
  return { addListener, cleanup }
}

// Instância global do monitor de performance
export const performanceMonitor = new PerformanceMonitor()

export default {
  appCache,
  debounce,
  throttle,
  lazyLoadImage,
  createIntersectionObserver,
  preloadResource,
  preloadImages,
  compressImage,
  PerformanceMonitor,
  performanceMonitor,
  loadChunk,
  registerServiceWorker,
  getMemoryUsage,
  createCleanupManager
}