import express from 'express'
import { authMiddleware } from '../auth-security.js'

const router = express.Router()

// Middleware para injetar o serviço de notificações
let notificationService = null

export function setNotificationService(service) {
  notificationService = service
}

// Buscar notificações do usuário
router.get('/', authMiddleware(null, process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não disponível' })
    }

    const userId = req.user.id
    const { page = 1, limit = 20, unreadOnly = false } = req.query

    const result = await notificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      unreadOnly === 'true'
    )

    res.json(result)
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar notificação como lida
router.patch('/:id/read', authMiddleware(null, process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não disponível' })
    }

    const userId = req.user.id
    const notificationId = req.params.id

    const notification = await notificationService.markAsRead(notificationId, userId)

    if (!notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' })
    }

    res.json({ success: true, notification })
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar todas as notificações como lidas
router.patch('/read-all', authMiddleware(null, process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não disponível' })
    }

    const userId = req.user.id
    const result = await notificationService.markAllAsRead(userId)

    res.json({ success: true, modifiedCount: result.modifiedCount })
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Deletar notificação
router.delete('/:id', authMiddleware(null, process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não disponível' })
    }

    const userId = req.user.id
    const notificationId = req.params.id

    const notification = await notificationService.deleteNotification(notificationId, userId)

    if (!notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar notificação:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Contar notificações não lidas
router.get('/unread-count', authMiddleware(null, process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não disponível' })
    }

    const userId = req.user.id
    const result = await notificationService.getUserNotifications(userId, 1, 1, true)

    res.json({ unreadCount: result.unreadCount })
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para teste (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', authMiddleware(null, process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(500).json({ error: 'Serviço de notificações não disponível' })
      }

      const userId = req.user.id
      const { type = 'system_alert', title = 'Teste', message = 'Esta é uma notificação de teste' } = req.body

      const notification = await notificationService.createNotification(
        userId,
        type,
        title,
        message,
        { test: true },
        'medium'
      )

      res.json({ success: true, notification })
    } catch (error) {
      console.error('Erro ao criar notificação de teste:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  })
}

export default router