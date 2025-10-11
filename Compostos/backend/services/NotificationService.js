const Notification = require('../models/Notification');
const User = require('../models/User');

// Tentativa de carregar firebase-admin para FCM
let admin = null;
try {
  admin = require('firebase-admin');
} catch (err) {
  // Biblioteca não instalada ou indisponível; fallback para log
  admin = null;
}

let fcmInitialized = false;
function initFirebaseAdmin() {
  if (!admin) return false;
  if (fcmInitialized) return true;
  try {
    if (!admin.apps || admin.apps.length === 0) {
      // Estratégias de credenciais:
      // 1) FCM_CREDENTIALS_BASE64: JSON do service account em base64
      // 2) FCM_CREDENTIALS_PATH: caminho para arquivo JSON do service account
      // 3) GOOGLE_APPLICATION_CREDENTIALS: credenciais padrão do ambiente
      if (process.env.FCM_CREDENTIALS_BASE64) {
        const jsonStr = Buffer.from(process.env.FCM_CREDENTIALS_BASE64, 'base64').toString('utf8');
        const creds = JSON.parse(jsonStr);
        admin.initializeApp({ credential: admin.credential.cert(creds) });
      } else if (process.env.FCM_CREDENTIALS_PATH) {
        const serviceAccount = require(process.env.FCM_CREDENTIALS_PATH);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
      } else {
        console.warn('FCM não configurado: defina FCM_CREDENTIALS_BASE64, FCM_CREDENTIALS_PATH ou GOOGLE_APPLICATION_CREDENTIALS');
        return false;
      }
    }
    fcmInitialized = true;
    return true;
  } catch (e) {
    console.warn('Falha ao inicializar FCM:', e?.message || e);
    return false;
  }
}

class NotificationService {
  /**
   * Criar uma notificação para um usuário
   */
  static async createNotification(userId, title, message, type = 'info', data = {}) {
    try {
      const notification = new Notification({
        user: userId,
        title,
        message,
        type,
        data,
        isRead: false
      });

      await notification.save();
      
      // Aqui você poderia implementar notificações push, email, etc.
      console.log(`📧 Notificação criada para usuário ${userId}: ${title}`);
      
      return notification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Notificar usuário sobre depósito confirmado
   */
  static async notifyDepositConfirmed(userId, amount, currency, txHash) {
    const title = 'Depósito Confirmado';
    const message = `Seu depósito de ${amount} ${currency} foi confirmado e creditado em sua conta.`;
    
    return this.createNotification(userId, title, message, 'success', {
      type: 'deposit',
      amount,
      currency,
      txHash
    });
  }

  /**
   * Notificar usuário sobre saque processado
   */
  static async notifyWithdrawalProcessed(userId, amount, currency, txHash, status) {
    const title = status === 'completed' ? 'Saque Processado' : 'Atualização de Saque';
    const message = status === 'completed' 
      ? `Seu saque de ${amount} ${currency} foi processado com sucesso.`
      : `Seu saque de ${amount} ${currency} está com status: ${status}`;
    
    return this.createNotification(userId, title, message, status === 'completed' ? 'success' : 'info', {
      type: 'withdrawal',
      amount,
      currency,
      txHash,
      status
    });
  }

  /**
   * Notificar usuário sobre falha em transação
   */
  static async notifyTransactionFailed(userId, amount, currency, txHash, reason) {
    const title = 'Falha na Transação';
    const message = `Sua transação de ${amount} ${currency} falhou: ${reason}`;
    
    return this.createNotification(userId, title, message, 'error', {
      type: 'transaction_failed',
      amount,
      currency,
      txHash,
      reason
    });
  }

  /**
   * Obter notificações não lidas de um usuário
   */
  static async getUnreadNotifications(userId) {
    try {
      const notifications = await Notification.find({
        user: userId,
        isRead: false
      }).sort({ createdAt: -1 });

      return notifications;
    } catch (error) {
      console.error('Erro ao obter notificações não lidas:', error);
      throw error;
    }
  }

  /**
   * Marcar notificação como lida
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  /**
   * Marcar todas as notificações de um usuário como lidas
   */
  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      );

      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      throw error;
    }
  }

  /**
   * Obter notificações paginadas de um usuário
   */
  static async getNotifications(userId, page = 1, limit = 20) {
    try {
      const notifications = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments({ user: userId });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao obter notificações:', error);
      throw error;
    }
  }

  /**
   * Excluir notificação
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        user: userId
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;