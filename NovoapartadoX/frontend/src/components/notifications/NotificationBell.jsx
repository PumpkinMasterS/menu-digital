import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import './NotificationBell.css';

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPermission
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotification(true)
      const timer = setTimeout(() => setHasNewNotification(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [unreadCount])

  const handleBellClick = () => {
    setIsOpen(!isOpen)
    setHasNewNotification(false)
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id)
    }
  }

  const handleDeleteClick = async (e, notificationId) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleRequestPermission = async () => {
    await requestPermission()
  }

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button 
        className={`bell-button ${hasNewNotification ? 'pulse' : ''}`}
        onClick={handleBellClick}
        aria-label={`Notificações (${unreadCount} não lidas)`}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notificações</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={handleMarkAllRead}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <div className="loading-spinner"></div>
                <span>Carregando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <span>Nenhuma notificação</span>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {notificationService.getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-text">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {notificationService.formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button
                        className="mark-read-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification._id)
                        }}
                        title="Marcar como lida"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteClick(e, notification._id)}
                      title="Deletar notificação"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button className="view-all-btn">
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell