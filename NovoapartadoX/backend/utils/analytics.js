import mongoose from 'mongoose'
import { cache } from './cache.js'

// Schema para eventos de analytics
const analyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'page_view', 'listing_view', 'listing_click', 'phone_click', 
      'search', 'filter_applied', 'user_registration', 'user_login',
      'photo_upload', 'listing_created', 'review_submitted', 'favorite_added',
      'api_call', 'error_occurred', 'performance_metric'
    ]
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  metadata: {
    userAgent: String,
    ip: String,
    referrer: String,
    page: String,
    searchQuery: String,
    filters: Object,
    duration: Number,
    errorMessage: String,
    apiEndpoint: String,
    responseTime: Number,
    statusCode: Number
  },
  timestamp: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false }
}, { 
  timestamps: true,
  // Particionamento por data para melhor performance
  collection: 'analytics_events'
})

// Índices para otimização de queries
analyticsEventSchema.index({ eventType: 1, timestamp: -1 })
analyticsEventSchema.index({ userId: 1, timestamp: -1 })
analyticsEventSchema.index({ listingId: 1, timestamp: -1 })
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 })
analyticsEventSchema.index({ timestamp: -1 })
analyticsEventSchema.index({ processed: 1, timestamp: -1 })

const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsEventSchema)

// Schema para métricas agregadas
const metricsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  period: { type: String, enum: ['hour', 'day', 'week', 'month'], required: true },
  metrics: {
    totalPageViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    totalListingViews: { type: Number, default: 0 },
    totalListingClicks: { type: Number, default: 0 },
    totalPhoneClicks: { type: Number, default: 0 },
    totalSearches: { type: Number, default: 0 },
    totalRegistrations: { type: Number, default: 0 },
    totalLogins: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    apiErrors: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }
  },
  topPages: [{ page: String, views: Number }],
  topListings: [{ listingId: mongoose.Schema.Types.ObjectId, views: Number }],
  topSearches: [{ query: String, count: Number }],
  deviceTypes: { mobile: Number, desktop: Number, tablet: Number },
  browsers: [{ name: String, count: Number }],
  referrers: [{ source: String, count: Number }]
}, { timestamps: true })

metricsSchema.index({ date: -1, period: 1 }, { unique: true })
const Metrics = mongoose.models.Metrics || mongoose.model('Metrics', metricsSchema)

// Classe principal de Analytics
class AnalyticsService {
  constructor() {
    this.batchSize = 100
    this.processingInterval = 60000 // 1 minuto
    this.startBatchProcessing()
  }

  // Registrar evento de analytics
  async trackEvent(eventType, data = {}) {
    try {
      const event = new AnalyticsEvent({
        eventType,
        userId: data.userId,
        sessionId: data.sessionId,
        listingId: data.listingId,
        metadata: {
          userAgent: data.userAgent,
          ip: data.ip,
          referrer: data.referrer,
          page: data.page,
          searchQuery: data.searchQuery,
          filters: data.filters,
          duration: data.duration,
          errorMessage: data.errorMessage,
          apiEndpoint: data.apiEndpoint,
          responseTime: data.responseTime,
          statusCode: data.statusCode
        }
      })

      await event.save()
      
      // Cache para métricas em tempo real
      await this.updateRealTimeMetrics(eventType, data)
      
      return event
    } catch (error) {
      console.error('Erro ao registrar evento de analytics:', error)
      throw error
    }
  }

  // Atualizar métricas em tempo real no cache
  async updateRealTimeMetrics(eventType, data) {
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `realtime_metrics:${today}`
    
    try {
      let metrics = await cache.get(cacheKey) || {
        pageViews: 0,
        listingViews: 0,
        listingClicks: 0,
        phoneClicks: 0,
        searches: 0,
        registrations: 0,
        logins: 0,
        apiCalls: 0,
        errors: 0
      }

      switch (eventType) {
        case 'page_view':
          metrics.pageViews++
          break
        case 'listing_view':
          metrics.listingViews++
          break
        case 'listing_click':
          metrics.listingClicks++
          break
        case 'phone_click':
          metrics.phoneClicks++
          break
        case 'search':
          metrics.searches++
          break
        case 'user_registration':
          metrics.registrations++
          break
        case 'user_login':
          metrics.logins++
          break
        case 'api_call':
          metrics.apiCalls++
          break
        case 'error_occurred':
          metrics.errors++
          break
      }

      await cache.set(cacheKey, metrics, 86400) // 24 horas
    } catch (error) {
      console.error('Erro ao atualizar métricas em tempo real:', error)
    }
  }

  // Obter métricas em tempo real
  async getRealTimeMetrics() {
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `realtime_metrics:${today}`
    
    try {
      return await cache.get(cacheKey) || {
        pageViews: 0,
        listingViews: 0,
        listingClicks: 0,
        phoneClicks: 0,
        searches: 0,
        registrations: 0,
        logins: 0,
        apiCalls: 0,
        errors: 0
      }
    } catch (error) {
      console.error('Erro ao obter métricas em tempo real:', error)
      return {}
    }
  }

  // Processar eventos em lote
  async processBatchEvents() {
    try {
      const events = await AnalyticsEvent.find({ processed: false })
        .limit(this.batchSize)
        .sort({ timestamp: 1 })

      if (events.length === 0) return

      // Agrupar eventos por data
      const eventsByDate = {}
      
      for (const event of events) {
        const date = event.timestamp.toISOString().split('T')[0]
        if (!eventsByDate[date]) {
          eventsByDate[date] = []
        }
        eventsByDate[date].push(event)
      }

      // Processar cada data
      for (const [date, dateEvents] of Object.entries(eventsByDate)) {
        await this.aggregateMetricsForDate(new Date(date), dateEvents)
      }

      // Marcar eventos como processados
      const eventIds = events.map(e => e._id)
      await AnalyticsEvent.updateMany(
        { _id: { $in: eventIds } },
        { processed: true }
      )

      console.log(`Processados ${events.length} eventos de analytics`)
    } catch (error) {
      console.error('Erro ao processar eventos em lote:', error)
    }
  }

  // Agregar métricas para uma data específica
  async aggregateMetricsForDate(date, events) {
    try {
      const metrics = {
        totalPageViews: 0,
        uniqueVisitors: new Set(),
        totalListingViews: 0,
        totalListingClicks: 0,
        totalPhoneClicks: 0,
        totalSearches: 0,
        totalRegistrations: 0,
        totalLogins: 0,
        apiCalls: 0,
        apiErrors: 0,
        responseTimesSum: 0,
        responseTimesCount: 0,
        topPages: {},
        topListings: {},
        topSearches: {},
        deviceTypes: { mobile: 0, desktop: 0, tablet: 0 },
        browsers: {},
        referrers: {}
      }

      // Processar cada evento
      for (const event of events) {
        const { eventType, userId, sessionId, listingId, metadata } = event

        // Visitantes únicos
        if (sessionId) {
          metrics.uniqueVisitors.add(sessionId)
        }

        // Contadores por tipo de evento
        switch (eventType) {
          case 'page_view':
            metrics.totalPageViews++
            if (metadata.page) {
              metrics.topPages[metadata.page] = (metrics.topPages[metadata.page] || 0) + 1
            }
            break
          case 'listing_view':
            metrics.totalListingViews++
            if (listingId) {
              metrics.topListings[listingId] = (metrics.topListings[listingId] || 0) + 1
            }
            break
          case 'listing_click':
            metrics.totalListingClicks++
            break
          case 'phone_click':
            metrics.totalPhoneClicks++
            break
          case 'search':
            metrics.totalSearches++
            if (metadata.searchQuery) {
              metrics.topSearches[metadata.searchQuery] = (metrics.topSearches[metadata.searchQuery] || 0) + 1
            }
            break
          case 'user_registration':
            metrics.totalRegistrations++
            break
          case 'user_login':
            metrics.totalLogins++
            break
          case 'api_call':
            metrics.apiCalls++
            if (metadata.responseTime) {
              metrics.responseTimesSum += metadata.responseTime
              metrics.responseTimesCount++
            }
            break
          case 'error_occurred':
            metrics.apiErrors++
            break
        }

        // Análise de dispositivos e browsers
        if (metadata.userAgent) {
          const deviceType = this.detectDeviceType(metadata.userAgent)
          metrics.deviceTypes[deviceType]++

          const browser = this.detectBrowser(metadata.userAgent)
          metrics.browsers[browser] = (metrics.browsers[browser] || 0) + 1
        }

        // Análise de referrers
        if (metadata.referrer) {
          const source = this.extractReferrerSource(metadata.referrer)
          metrics.referrers[source] = (metrics.referrers[source] || 0) + 1
        }
      }

      // Converter objetos em arrays ordenados
      const topPages = Object.entries(metrics.topPages)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      const topListings = Object.entries(metrics.topListings)
        .map(([listingId, views]) => ({ listingId, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      const topSearches = Object.entries(metrics.topSearches)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const browsers = Object.entries(metrics.browsers)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      const referrers = Object.entries(metrics.referrers)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Calcular métricas derivadas
      const averageResponseTime = metrics.responseTimesCount > 0 
        ? metrics.responseTimesSum / metrics.responseTimesCount 
        : 0

      const conversionRate = metrics.totalPageViews > 0 
        ? (metrics.totalPhoneClicks / metrics.totalPageViews) * 100 
        : 0

      // Salvar métricas agregadas
      await Metrics.findOneAndUpdate(
        { date, period: 'day' },
        {
          metrics: {
            totalPageViews: metrics.totalPageViews,
            uniqueVisitors: metrics.uniqueVisitors.size,
            totalListingViews: metrics.totalListingViews,
            totalListingClicks: metrics.totalListingClicks,
            totalPhoneClicks: metrics.totalPhoneClicks,
            totalSearches: metrics.totalSearches,
            totalRegistrations: metrics.totalRegistrations,
            totalLogins: metrics.totalLogins,
            apiCalls: metrics.apiCalls,
            apiErrors: metrics.apiErrors,
            averageResponseTime,
            conversionRate
          },
          topPages,
          topListings,
          topSearches,
          deviceTypes: metrics.deviceTypes,
          browsers,
          referrers
        },
        { upsert: true, new: true }
      )

    } catch (error) {
      console.error('Erro ao agregar métricas:', error)
    }
  }

  // Detectar tipo de dispositivo
  detectDeviceType(userAgent) {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile'
    }
    return 'desktop'
  }

  // Detectar browser
  detectBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }

  // Extrair fonte do referrer
  extractReferrerSource(referrer) {
    if (!referrer) return 'Direct'
    
    try {
      const url = new URL(referrer)
      const hostname = url.hostname.toLowerCase()
      
      if (hostname.includes('google')) return 'Google'
      if (hostname.includes('facebook')) return 'Facebook'
      if (hostname.includes('instagram')) return 'Instagram'
      if (hostname.includes('twitter')) return 'Twitter'
      if (hostname.includes('linkedin')) return 'LinkedIn'
      
      return hostname
    } catch {
      return 'Unknown'
    }
  }

  // Obter métricas por período
  async getMetrics(startDate, endDate, period = 'day') {
    try {
      const metrics = await Metrics.find({
        date: { $gte: startDate, $lte: endDate },
        period
      }).sort({ date: -1 })

      return metrics
    } catch (error) {
      console.error('Erro ao obter métricas:', error)
      return []
    }
  }

  // Obter dashboard de métricas
  async getDashboardMetrics() {
    try {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const last7Days = new Date(today)
      last7Days.setDate(last7Days.getDate() - 7)
      
      const last30Days = new Date(today)
      last30Days.setDate(last30Days.getDate() - 30)

      // Métricas em tempo real
      const realTimeMetrics = await this.getRealTimeMetrics()

      // Métricas de hoje e ontem
      const [todayMetrics, yesterdayMetrics] = await Promise.all([
        Metrics.findOne({ date: today.toISOString().split('T')[0], period: 'day' }),
        Metrics.findOne({ date: yesterday.toISOString().split('T')[0], period: 'day' })
      ])

      // Métricas dos últimos 7 e 30 dias
      const [last7DaysMetrics, last30DaysMetrics] = await Promise.all([
        this.getMetrics(last7Days, today, 'day'),
        this.getMetrics(last30Days, today, 'day')
      ])

      // Calcular totais e tendências
      const calculateTotals = (metrics) => {
        return metrics.reduce((acc, metric) => {
          Object.keys(metric.metrics).forEach(key => {
            acc[key] = (acc[key] || 0) + metric.metrics[key]
          })
          return acc
        }, {})
      }

      const last7DaysTotals = calculateTotals(last7DaysMetrics)
      const last30DaysTotals = calculateTotals(last30DaysMetrics)

      return {
        realTime: realTimeMetrics,
        today: todayMetrics?.metrics || {},
        yesterday: yesterdayMetrics?.metrics || {},
        last7Days: last7DaysTotals,
        last30Days: last30DaysTotals,
        trends: {
          pageViews: last7DaysMetrics.map(m => ({ date: m.date, value: m.metrics.totalPageViews })),
          uniqueVisitors: last7DaysMetrics.map(m => ({ date: m.date, value: m.metrics.uniqueVisitors })),
          conversions: last7DaysMetrics.map(m => ({ date: m.date, value: m.metrics.conversionRate }))
        },
        topContent: {
          pages: todayMetrics?.topPages || [],
          listings: todayMetrics?.topListings || [],
          searches: todayMetrics?.topSearches || []
        },
        audience: {
          devices: todayMetrics?.deviceTypes || { mobile: 0, desktop: 0, tablet: 0 },
          browsers: todayMetrics?.browsers || [],
          referrers: todayMetrics?.referrers || []
        }
      }
    } catch (error) {
      console.error('Erro ao obter métricas do dashboard:', error)
      return {}
    }
  }

  // Iniciar processamento em lote
  startBatchProcessing() {
    setInterval(() => {
      this.processBatchEvents()
    }, this.processingInterval)
  }

  // Middleware para tracking automático
  trackingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now()
      
      // Capturar informações da requisição
      const trackingData = {
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        referrer: req.get('Referer'),
        apiEndpoint: req.path,
        sessionId: req.sessionID || req.get('X-Session-ID')
      }

      // Override do res.json para capturar resposta
      const originalJson = res.json
      res.json = function(data) {
        const responseTime = Date.now() - startTime
        
        // Registrar evento de API call
        analytics.trackEvent('api_call', {
          ...trackingData,
          responseTime,
          statusCode: res.statusCode
        }).catch(console.error)

        return originalJson.call(this, data)
      }

      // Capturar erros
      res.on('error', (error) => {
        analytics.trackEvent('error_occurred', {
          ...trackingData,
          errorMessage: error.message,
          statusCode: res.statusCode
        }).catch(console.error)
      })

      next()
    }
  }
}

// Instância singleton
const analytics = new AnalyticsService()

export { analytics, AnalyticsEvent, Metrics }
export default analytics