import express from 'express'
import analytics from '../utils/analytics.js'
import { authMiddleware } from '../auth-security.js'
import { cacheMiddleware } from '../utils/cache.js'

const router = express.Router()

// Middleware para tracking automático de page views
router.use((req, res, next) => {
  // Registrar page view para rotas GET
  if (req.method === 'GET' && req.path !== '/dashboard' && req.path !== '/metrics') {
    analytics.trackEvent('page_view', {
      userId: req.user?.id,
      sessionId: req.sessionID || req.get('X-Session-ID'),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      referrer: req.get('Referer'),
      page: req.originalUrl
    }).catch(console.error)
  }
  next()
})

// Dashboard de métricas (admin apenas)
router.get('/dashboard', authMiddleware('admin'), cacheMiddleware(300), async (req, res) => {
  try {
    const dashboardData = await analytics.getDashboardMetrics()
    res.json({ success: true, data: dashboardData })
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para métricas específicas
router.get('/metrics', authMiddleware('admin'), cacheMiddleware(300), async (req, res) => {
  try {
    const { period = 'day', type = 'all' } = req.query
    const metrics = await analytics.getMetrics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(), period)
    res.json({ success: true, data: metrics })
  } catch (error) {
    console.error('Erro ao buscar métricas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para métricas em tempo real
router.get('/realtime', authMiddleware('admin'), async (req, res) => {
    try {
      const realTimeMetrics = await analytics.getRealTimeMetrics()
      
      res.json({
        success: true,
        data: realTimeMetrics,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao obter métricas em tempo real:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
})

// Endpoint para tracking de eventos
router.post('/track', async (req, res) => {
  try {
    const { eventType, data } = req.body
    await analytics.trackEvent(eventType, data)
    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao registrar evento:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Tracking específico para visualizações
router.post('/track/view/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params
    
    // Ignorar tracking para placeholders
    if (listingId && listingId.toString().startsWith('placeholder-')) {
      return res.json({ success: true, ignored: true })
    }
    
    await analytics.trackEvent('listing_view', {
      listingId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao registrar visualização:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Tracking específico para cliques
router.post('/track/click/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params
    const { element } = req.body
    
    // Ignorar tracking para placeholders
    if (listingId && listingId.toString().startsWith('placeholder-')) {
      return res.json({ success: true, ignored: true })
    }
    
    await analytics.trackEvent('listing_click', {
      listingId,
      element,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao registrar clique:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router