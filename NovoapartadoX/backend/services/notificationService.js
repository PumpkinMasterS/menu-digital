import mongoose from 'mongoose'

// Schema para notificações
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['new_review', 'profile_verified', 'new_message', 'system_alert', 'promotion'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // dados adicionais específicos do tipo
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  expiresAt: { type: Date }, // para notificações temporárias
}, { timestamps: true })

// Índices para performance
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, read: 1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

class NotificationService {
  constructor(io) {
    this.io = io
  }

  // Criar uma nova notificação
  async createNotification(userId, type, title, message, data = null, priority = 'medium', expiresAt = null) {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        data,
        priority,
        expiresAt
      })

      await notification.save()

      // Enviar notificação em tempo real via Socket.IO
      this.io.to(`user_${userId}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt,
        read: false
      })

      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  // Buscar notificações de um usuário
  async getUserNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
    try {
      const query = { userId }
      if (unreadOnly) {
        query.read = false
      }

      const skip = (page - 1) * limit
      
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      const total = await Notification.countDocuments(query)
      const unreadCount = await Notification.countDocuments({ userId, read: false })

      return {
        notifications,
        total,
        unreadCount,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      throw error
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      )

      if (notification) {
        // Emitir evento de atualização
        this.io.to(`user_${userId}`).emit('notification_read', {
          id: notificationId
        })
      }

      return notification
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      throw error
    }
  }

  // Marcar todas as notificações como lidas
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true }
      )

      // Emitir evento de atualização
      this.io.to(`user_${userId}`).emit('all_notifications_read')

      return result
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
      throw error
    }
  }

  // Deletar notificação
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId
      })

      if (notification) {
        // Emitir evento de remoção
        this.io.to(`user_${userId}`).emit('notification_deleted', {
          id: notificationId
        })
      }

      return notification
    } catch (error) {
      console.error('Erro ao deletar notificação:', error)
      throw error
    }
  }

  // Métodos de conveniência para tipos específicos de notificação
  async notifyNewReview(userId, reviewData) {
    return this.createNotification(
      userId,
      'new_review',
      'Nova Avaliação Recebida',
      `Você recebeu uma nova avaliação de ${reviewData.rating} estrelas`,
      { reviewId: reviewData.reviewId, rating: reviewData.rating },
      'medium'
    )
  }

  async notifyProfileVerified(userId) {
    return this.createNotification(
      userId,
      'profile_verified',
      'Perfil Verificado',
      'Parabéns! Seu perfil foi verificado com sucesso',
      null,
      'high'
    )
  }

  async notifySystemAlert(userId, alertMessage, data = null) {
    return this.createNotification(
      userId,
      'system_alert',
      'Alerta do Sistema',
      alertMessage,
      data,
      'high'
    )
  }

  async notifyPromotion(userId, promotionData) {
    return this.createNotification(
      userId,
      'promotion',
      promotionData.title,
      promotionData.message,
      promotionData.data,
      'low',
      promotionData.expiresAt
    )
  }

  // Limpar notificações expiradas (pode ser chamado periodicamente)
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      })
      console.log(`Removidas ${result.deletedCount} notificações expiradas`)
      return result
    } catch (error) {
      console.error('Erro ao limpar notificações expiradas:', error)
      throw error
    }
  }
}

export default NotificationService