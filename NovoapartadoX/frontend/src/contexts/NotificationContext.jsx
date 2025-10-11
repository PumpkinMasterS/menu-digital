import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import notificationService from '../services/notificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Inicializar conexão quando usuário estiver autenticado
  useEffect(() => {
    if (token && user) {
      initializeNotifications();
    } else {
      cleanup();
    }

    return cleanup;
  }, [token, user]);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      
      // Configurar token no serviço de notificações
      notificationService.setAuthToken(token);
      
      // Conectar ao socket
      socketService.connect(token);
      
      // Carregar notificações existentes
      await loadNotifications();
      
      // Configurar listeners do socket
      setupSocketListeners();
      
    } catch (error) {
      console.error('Erro ao inicializar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanup = () => {
    socketService.disconnect();
    setNotifications([]);
    setUnreadCount(0);
  };

  const setupSocketListeners = () => {
    // Nova notificação recebida
    socketService.on('newNotification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Mostrar notificação do browser se permitido
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });

    // Notificação marcada como lida
    socketService.on('notificationRead', (notificationId) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Notificação deletada
    socketService.on('notificationDeleted', (notificationId) => {
      setNotifications(prev => {
        const notification = prev.find(n => n._id === notificationId);
        const newNotifications = prev.filter(n => n._id !== notificationId);
        
        if (notification && !notification.read) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        
        return newNotifications;
      });
    });
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      // O socket listener já atualizará o estado
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      // O socket listener já atualizará o estado
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPermission,
    refresh: loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;