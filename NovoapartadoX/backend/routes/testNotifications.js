import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Função para configurar o serviço de notificações
let notificationService = null;

export const setTestNotificationService = (service) => {
  notificationService = service;
};

// Rota para enviar notificação de teste (sem autenticação para facilitar testes)
router.post('/send', async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não configurado' });
    }

    const { title = 'Notificação de Teste', message, type = 'info' } = req.body;
    // Usando um ObjectId válido para testes
    const userId = new mongoose.Types.ObjectId();

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Criar notificação de teste
    const notification = await notificationService.createNotification(
      userId,
      type,
      title,
      message,
      {
        test: true,
        timestamp: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      message: 'Notificação de teste enviada com sucesso',
      notification
    });

  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Rota para enviar notificação para todos os usuários (apenas admin)
router.post('/broadcast', async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não configurado' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem enviar broadcasts.' });
    }

    const { title, message, type = 'announcement' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }

    // Enviar para todos os usuários conectados
    const result = await notificationService.broadcastNotification({
      title,
      message,
      type,
      data: {
        broadcast: true,
        timestamp: new Date().toISOString(),
        sender: req.user.email
      }
    });

    res.json({
      success: true,
      message: 'Broadcast enviado com sucesso',
      result
    });

  } catch (error) {
    console.error('Erro ao enviar broadcast:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para simular diferentes tipos de notificações (sem autenticação para facilitar testes)
router.post('/simulate/:type', async (req, res) => {
  try {
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não configurado' });
    }

    const { type } = req.params;
    const userId = req.user.id;

    let notification;

    switch (type) {
      case 'welcome':
        notification = await notificationService.createNotification({
          userId,
          title: '🎉 Bem-vindo ao NovoApartado!',
          message: 'Obrigado por se juntar à nossa plataforma. Explore os melhores apartamentos em Lisboa e Porto!',
          type: 'success'
        });
        break;

      case 'favorite':
        notification = await notificationService.createNotification({
          userId,
          title: '❤️ Novo Favorito Adicionado',
          message: 'Você adicionou um apartamento aos seus favoritos. Não perca esta oportunidade!',
          type: 'info'
        });
        break;

      case 'booking':
        notification = await notificationService.createNotification({
          userId,
          title: '📅 Reserva Confirmada',
          message: 'Sua reserva foi confirmada com sucesso. Verifique os detalhes em sua área reservada.',
          type: 'success'
        });
        break;

      case 'reminder':
        notification = await notificationService.createNotification({
          userId,
          title: '⏰ Lembrete Importante',
          message: 'Você tem uma visita agendada para hoje às 15:00. Não se esqueça!',
          type: 'warning'
        });
        break;

      case 'promotion':
        notification = await notificationService.createNotification({
          userId,
          title: '🏷️ Oferta Especial',
          message: 'Apartamento com 20% de desconto disponível apenas hoje. Aproveite!',
          type: 'info'
        });
        break;

      case 'system':
        notification = await notificationService.createNotification({
          userId,
          title: '🔧 Manutenção do Sistema',
          message: 'O sistema estará em manutenção das 02:00 às 04:00. Planeje suas atividades.',
          type: 'warning'
        });
        break;

      default:
        return res.status(400).json({ error: 'Tipo de notificação inválido' });
    }

    res.json({
      success: true,
      message: `Notificação do tipo "${type}" enviada com sucesso`,
      notification
    });

  } catch (error) {
    console.error('Erro ao simular notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;