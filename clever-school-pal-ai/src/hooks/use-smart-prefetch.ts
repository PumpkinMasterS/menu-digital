import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PrefetchOptions {
  delay?: number;
  priority?: 'high' | 'low';
  condition?: () => boolean;
}

// Cache de componentes carregados
const prefetchCache = new Set<string>();
const prefetchPromises = new Map<string, Promise<any>>();

/**
 * Hook para prefetching inteligente de rotas
 */
export const useSmartPrefetch = () => {
  const navigate = useNavigate();

  const prefetchRoute = async (path: string, options: PrefetchOptions = {}) => {
    const { delay = 150, priority = 'low', condition = () => true } = options;

    if (prefetchCache.has(path) || prefetchPromises.has(path)) {
      return;
    }

    if (!condition()) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    // Mapeia rotas para componentes lazy
    const routeModules: Record<string, () => Promise<any>> = {
      '/admin': () => import('@/pages/Index'),
      '/admin/schools': () => import('@/pages/Schools'),
      '/admin/classes': () => import('@/pages/Classes'),
      '/admin/students': () => import('@/pages/Students'),
      '/admin/subjects': () => import('@/pages/Subjects'),
      '/admin/contents': () => import('@/pages/Contents'),
      '/admin/settings': () => import('@/pages/Settings'),
      '/admin/analytics': () => import('@/pages/Analytics'),
      '/admin/security': () => import('@/pages/SecurityMonitoring'),
      '/admin/bot-config': () => import('@/pages/BotConfig'),
      '/admin/contexts': () => import('@/pages/ContextManagement'),
      '/admin/admin-management': () => import('@/pages/AdminManagement')
    };

    const moduleLoader = routeModules[path];
    if (!moduleLoader) {
      return;
    }

    try {
      const loadPromise = moduleLoader();
      prefetchPromises.set(path, loadPromise);

      await loadPromise;
      prefetchCache.add(path);
      prefetchPromises.delete(path);
    } catch (error) {
      prefetchPromises.delete(path);
    }
  };

  const createHoverHandler = (path: string, options?: PrefetchOptions) => ({
    onMouseEnter: () => prefetchRoute(path, options),
  });

  const prefetchPriorityRoutes = () => {
    const priorityRoutes = ['/admin/contents', '/admin/students', '/admin/settings'];
    priorityRoutes.forEach(route => {
      prefetchRoute(route, { delay: 2000, priority: 'low' });
    });
  };

  return {
    prefetchRoute,
    createHoverHandler,
    prefetchPriorityRoutes,
    isPrefetched: (path: string) => prefetchCache.has(path)
  };
};

export const useAutoPrefetch = () => {
  const { prefetchPriorityRoutes } = useSmartPrefetch();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.hasFocus() && navigator.onLine) {
        prefetchPriorityRoutes();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [prefetchPriorityRoutes]);
}; 