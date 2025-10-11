const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/notifications - Buscar notificações do usuário
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const userId = req.user._id;

    const result = await NotificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      unread === 'true'
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/notifications/unread/count - Contar notificações não lidas
router.get('/unread/count', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/notifications/:id/read - Marcar notificação como lida
router.put('/:id/read', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await NotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    
    if (error.message === 'Notificação não encontrada') {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/notifications/read-all - Marcar todas as notificações como lidas
router.put('/read-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: 'Todas as notificações foram marcadas como lidas'
      }
    });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/notifications/test - Rota de teste para criar notificação (apenas desenvolvimento)
router.post('/test', protect, async (req, res) => {
  try {
    const { type = 'info', title, message } = req.body;
    const userId = req.user._id;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Título e mensagem são obrigatórios'
      });
    }

    const notification = await NotificationService.createNotification(
      userId,
      title,
      message,
      type
    );

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Erro ao criar notificação de teste:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Registrar ou atualizar device token do usuário para push notifications
router.post('/register-device-token', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { token, platform } = req.body || {};

    if (!token) {
      return res.status(400).json({ message: 'Token do dispositivo é obrigatório' });
    }

    // Atualiza o campo deviceTokens no usuário (sem duplicar tokens)
    const update = {
      $addToSet: {
        deviceTokens: {
          token,
          platform: platform || 'unknown',
          updatedAt: new Date(),
        },
      },
    };

    await User.findByIdAndUpdate(userId, update, { new: true });

    res.json({ success: true, message: 'Device token registrado com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar device token:', error);
    res.status(500).json({ message: 'Erro ao registrar device token' });
  }
});

module.exports = router;