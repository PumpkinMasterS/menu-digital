const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    
    this.setupEventHandlers();
    console.log('🚀 WebSocket Server inicializado');
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 Nova conexão WebSocket estabelecida');
      
      // Extrair token da query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Token de autenticação necessário');
        return;
      }
      
      try {
        // Verificar e decodificar token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        // Adicionar cliente ao mapa
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(ws);
        
        console.log(`👤 Usuário ${userId} conectado via WebSocket`);
        
        // Configurar handlers de mensagem e fechamento
        ws.on('message', (data) => this.handleMessage(ws, userId, data));
        ws.on('close', () => this.handleClose(ws, userId));
        ws.on('error', (error) => this.handleError(ws, userId, error));
        
        // Enviar mensagem de boas-vindas
        this.sendToClient(ws, {
          type: 'connection_established',
          message: 'Conexão WebSocket estabelecida com sucesso',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Erro de autenticação WebSocket:', error.message);
        ws.close(1008, 'Token inválido ou expirado');
      }
    });
  }

  handleMessage(ws, userId, data) {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Mensagem recebida de ${userId}:`, message.type);
      
      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        case 'subscribe':
          this.handleSubscribe(ws, userId, message);
          break;
        default:
          console.warn(`Tipo de mensagem desconhecido: ${message.type}`);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  handleSubscribe(ws, userId, message) {
    const { channel } = message;
    console.log(`👤 Usuário ${userId} inscrito no canal: ${channel}`);
    
    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      channel: channel,
      message: `Inscrito no canal ${channel}`,
      timestamp: new Date().toISOString()
    });
  }

  handleClose(ws, userId) {
    console.log(`🔌 Conexão WebSocket fechada para usuário ${userId}`);
    
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      userClients.delete(ws);
      
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  handleError(ws, userId, error) {
    console.error(`❌ Erro WebSocket para usuário ${userId}:`, error.message);
  }

  // Métodos para enviar mensagens
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendToUser(userId, message) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      userClients.forEach(ws => {
        this.sendToClient(ws, message);
      });
    }
  }

  broadcast(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Métodos específicos para atualizações do dashboard
  sendDashboardUpdate(userId, data) {
    this.sendToUser(userId, {
      type: 'dashboard_update',
      data: data,
      timestamp: new Date().toISOString()
    });
  }

  sendBalanceUpdate(userId, newBalance) {
    this.sendToUser(userId, {
      type: 'balance_update',
      balance: newBalance,
      timestamp: new Date().toISOString()
    });
  }

  sendInvestmentUpdate(userId, investment) {
    this.sendToUser(userId, {
      type: 'investment_update',
      investment: investment,
      timestamp: new Date().toISOString()
    });
  }

  sendTaskUpdate(userId, taskStats) {
    this.sendToUser(userId, {
      type: 'task_update',
      stats: taskStats,
      timestamp: new Date().toISOString()
    });
  }

  // Método para obter estatísticas do servidor
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      uniqueUsers: this.clients.size,
      totalClients: Array.from(this.clients.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }
}

module.exports = WebSocketServer;