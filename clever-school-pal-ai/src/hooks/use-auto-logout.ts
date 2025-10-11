import { useEffect, useRef, useCallback } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { logger } from '@/lib/logger';

// 🕐 CONFIGURAÇÕES DE TIMEOUT (Padrões 2025)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos
const WARNING_TIME = 2 * 60 * 1000; // Aviso 2 minutos antes
const CHECK_INTERVAL = 30 * 1000; // Verificar a cada 30 segundos

interface UseAutoLogoutOptions {
  onWarning?: () => void;
  onLogout?: () => void;
  enabled?: boolean;
}

export function useAutoLogout(options: UseAutoLogoutOptions = {}) {
  const { logout, user } = useUnifiedAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { onWarning, onLogout, enabled = true } = options;

  // Atualizar última atividade
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    logger.debug('Activity updated', { timestamp: lastActivityRef.current });
  }, []);

  // Verificar inatividade
  const checkInactivity = useCallback(() => {
    if (!user || !enabled) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeUntilLogout = INACTIVITY_TIMEOUT - timeSinceActivity;

    // Mostrar aviso se próximo do timeout
    if (timeUntilLogout <= WARNING_TIME && !warningShownRef.current) {
      warningShownRef.current = true;
      logger.warn('Auto-logout warning', { 
        timeUntilLogout: Math.round(timeUntilLogout / 1000) 
      });
      onWarning?.();
    }

    // Fazer logout se timeout atingido
    if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
      logger.info('Auto-logout triggered', { 
        inactiveTime: Math.round(timeSinceActivity / 1000) 
      });
      onLogout?.();
      logout();
    }
  }, [user, enabled, onWarning, onLogout, logout]);

  useEffect(() => {
    if (!user || !enabled) return;

    // Eventos que indicam atividade do usuário
    const activityEvents = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Adicionar listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Iniciar verificação periódica
    intervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, enabled, onWarning, onLogout, logout]);

  const getTimeUntilLogout = useCallback(() => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    return Math.max(0, INACTIVITY_TIMEOUT - timeSinceActivity);
  }, []);

  const isWarningTime = useCallback(() => {
    const timeUntilLogout = INACTIVITY_TIMEOUT - (Date.now() - lastActivityRef.current);
    return timeUntilLogout <= WARNING_TIME;
  }, []);

  return {
    updateActivity,
    getTimeUntilLogout,
    isWarningTime
  };
}