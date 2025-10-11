import axios from 'axios'

class NotificationService {
  constructor() {
    // Em desenvolvimento, usar baseURL relativa para passar pelo proxy do Vite
    this.baseURL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')
    this.cache = new Map()
    this.listeners = new Map()
  }

  // Configurar token de autenticação
  setAuthToken(token) {
    this.token = token
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  // Buscar notificações do usuário
  async getNotifications(page = 1, limit = 20, unreadOnly = false) {
    try {
      const cacheKey = `notifications_${page}_${limit}_${unreadOnly}`
      
      const response = await axios.get(`${this.baseURL}/api/notifications`, {
        headers: this.headers,
        params: { page, limit, unreadOnly }
      })

      const data = response.data
      this.cache.set(cacheKey, data)
      
      return data
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      throw error
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/api/notifications/${notificationId}/read`,
        {},
        { headers: this.headers }
      )

      // Limpar cache relacionado
      this.clearCache()
      this.emit('notification_read', { notificationId, notification: response.data.notification })
      
      return response.data
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      throw error
    }
  }

  // Marcar todas as notificações como lidas
  async markAllAsRead() {
    try {
      const response = await axios.patch(
        `${this.baseURL}/api/notifications/read-all`,
        {},
        { headers: this.headers }
      )

      // Limpar cache
      this.clearCache()
      this.emit('all_notifications_read', response.data)
      
      return response.data
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
      throw error
    }
  }

  // Deletar notificação
  async deleteNotification(notificationId) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/api/notifications/${notificationId}`,
        { headers: this.headers }
      )

      // Limpar cache
      this.clearCache()
      this.emit('notification_deleted', { notificationId })
      
      return response.data
    } catch (error) {
      console.error('Erro ao deletar notificação:', error)
      throw error
    }
  }

  // Contar notificações não lidas
  async getUnreadCount() {
    try {
      const response = await axios.get(`${this.baseURL}/api/notifications/unread-count`, {
        headers: this.headers
      })

      return response.data.unreadCount
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error)
      throw error
    }
  }

  // Criar notificação de teste (apenas em desenvolvimento)
  async createTestNotification(type = 'system_alert', title = 'Teste', message = 'Notificação de teste') {
    try {
      if (import.meta.env.PROD) {
        console.warn('Notificações de teste não estão disponíveis em produção')
        return
      }

      const response = await axios.post(
        `${this.baseURL}/api/notifications/test`,
        { type, title, message },
        { headers: this.headers }
      )

      return response.data
    } catch (error) {
      console.error('Erro ao criar notificação de teste:', error)
      throw error
    }
  }

  // Gerenciamento de cache
  clearCache() {
    this.cache.clear()
  }

  getCachedData(key) {
    return this.cache.get(key)
  }

  // Sistema de eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Erro ao executar callback para evento ${event}:`, error)
        }
      })
    }
  }

  // Utilitários para formatação
  formatNotificationTime(timestamp) {
    const now = new Date()
    const notificationTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60))

    if (diffInMinutes < 1) {
      return 'Agora'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m atrás`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours}h atrás`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days}d atrás`
    }
  }

  getNotificationIcon(type) {
    const icons = {
      'new_message': '💬',
      'new_review': '⭐',
      'booking_confirmed': '✅',
      'booking_cancelled': '❌',
      'payment_received': '💰',
      'system_alert': '🔔',
      'maintenance': '🔧',
      'security': '🔒',
      'promotion': '🎉'
    }
    return icons[type] || '📢'
  }

  getNotificationColor(priority) {
    const colors = {
      'low': '#6b7280',
      'medium': '#f59e0b',
      'high': '#ef4444',
      'urgent': '#dc2626'
    }
    return colors[priority] || '#6b7280'
  }
}

// Instância singleton
const notificationService = new NotificationService()

export default notificationService