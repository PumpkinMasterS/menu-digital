import { logger } from './logger';

/**
 * Utility functions for managing browser cache and debugging service worker issues
 */

// Clear all browser caches and storage
export const clearAllCaches = async (): Promise<void> => {
  try {
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          logger.debug(`Clearing cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      logger.info(`Cleared ${cacheNames.length} cache(s)`);
    }

    // Clear localStorage (except for Supabase auth data only)
    Object.keys(localStorage).forEach(key => {
      if (!key.startsWith('supabase.auth.')) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();

    logger.info('All caches and storage cleared successfully');
  } catch (error) {
    logger.error('Error clearing caches', error);
  }
};

// Disable service worker registration
export const disableServiceWorker = async (): Promise<void> => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          logger.debug('Unregistering service worker');
          return registration.unregister();
        })
      );
      logger.info('All service workers unregistered');
    }
  } catch (error) {
    logger.error('Error disabling service worker', error);
  }
};

// Sistema de recuperação automática quando página volta a ser visível
export const initPageVisibilityRecovery = (): void => {
  if (typeof window === 'undefined') return;

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // Página voltou a ser visível - verificar e limpar problemas
      setTimeout(() => {
        debugWorkboxIssues();
        
        // Verificar se há dados corrompidos
        try {
          const authSession = localStorage.getItem('clever_school_auth_session');
          if (authSession) {
            JSON.parse(authSession); // Teste se é JSON válido
          }
        } catch {
          logger.warn('Corrupted auth session detected, clearing');
          localStorage.removeItem('clever_school_auth_session');
          window.location.reload();
        }
        
        if (import.meta.env.DEV) {
          logger.info('Page visibility recovery check completed');
        }
      }, 100);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
};

// Check for problematic workbox caches
export const debugWorkboxIssues = (): void => {
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      const workboxCaches = cacheNames.filter(name => 
        name.includes('workbox') || name.includes('fallback-cache')
      );
      
      if (workboxCaches.length > 0) {
        // Silently clear workbox caches without warning in production
        workboxCaches.forEach(cacheName => {
          caches.delete(cacheName).then(() => {
            if (import.meta.env.DEV) {
              logger.info(`Cleared problematic cache: ${cacheName}`);
            }
          });
        });
      }
    });
  }
};

// Development helper to force refresh without cache
export const forceRefreshWithoutCache = (): void => {
  if (import.meta.env.DEV) {
    logger.info('Forcing refresh without cache');
    window.location.reload();
  }
};

// Initialize cache debugging in development
export const initCacheDebugging = (): void => {
  if (import.meta.env.DEV) {
    logger.debug('Initializing cache debugging');
    
    // Debug workbox issues on load
    setTimeout(debugWorkboxIssues, 2000);
    
    // Add global helpers for development
    if (typeof window !== 'undefined') {
      (window as any).clearCaches = clearAllCaches;
      (window as any).disableServiceWorker = disableServiceWorker;
      (window as any).debugWorkbox = debugWorkboxIssues;
      
      logger.debug('Cache debugging utilities available on window object');
    }
  }
}; 