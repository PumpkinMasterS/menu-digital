import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket
    }
    // Em desenvolvimento, usar caminho relativo para passar pelo proxy do Vite
    const serverUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:4000')
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    this.setupEventListeners()
    return this.socket
  }

  setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Conectado ao servidor WebSocket')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connection_status', { connected: true })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado do servidor WebSocket:', reason)
      this.isConnected = false
      this.emit('connection_status', { connected: false, reason })
    })

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão WebSocket:', error)
      this.isConnected = false
      this.handleReconnect()
    })

    // Eventos de notificação
    this.socket.on('notification', (notification) => {
      console.log('Nova notificação recebida:', notification)
      this.emit('new_notification', notification)
    })

    this.socket.on('notification_read', (data) => {
      this.emit('notification_read', data)
    })

    this.socket.on('notification_deleted', (data) => {
      this.emit('notification_deleted', data)
    })
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      
      console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`)
      
      setTimeout(() => {
        if (this.socket && !this.isConnected) {
          this.socket.connect()
        }
      }, delay)
    } else {
      console.error('Máximo de tentativas de reconexão atingido')
      this.emit('connection_failed')
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.listeners.clear()
    }
  }

  // Sistema de eventos personalizado
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

  // Métodos específicos para notificações
  joinUserRoom(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_user_room', userId)
    }
  }

  leaveUserRoom(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_user_room', userId)
    }
  }

  // Getter para verificar status da conexão
  get connected() {
    return this.isConnected && this.socket?.connected
  }
}

// Instância singleton
const socketService = new SocketService()

export default socketService