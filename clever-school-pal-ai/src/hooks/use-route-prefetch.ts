import { useEffect, startTransition } from 'react';
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
 * Carrega páginas em background quando o usuário faz hover
 */
export const useRoutePrefetch = () => {
  const navigate = useNavigate();

  const prefetchRoute = async (path: string, options: PrefetchOptions = {}) => {
    const { delay = 150, priority = 'low', condition = () => true } = options;

    // Se já está no cache ou carregando, retorna
    if (prefetchCache.has(path) || prefetchPromises.has(path)) {
      return;
    }

    // Verifica condições
    if (!condition()) {
      return;
    }

    // Aguarda delay antes de iniciar prefetch
    await new Promise(resolve => setTimeout(resolve, delay));

    // Mapeia rotas para seus componentes lazy
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
      // Inicia o carregamento
      const loadPromise = moduleLoader();
      prefetchPromises.set(path, loadPromise);

      // Aguarda o carregamento
      await loadPromise;
      prefetchCache.add(path);
      prefetchPromises.delete(path);

      console.log(`🚀 Route prefetched: ${path}`);
    } catch (error) {
      console.warn(`⚠️ Failed to prefetch route: ${path}`, error);
      prefetchPromises.delete(path);
    }
  };

  const createHoverHandler = (path: string, options?: PrefetchOptions) => ({
    onMouseEnter: () => prefetchRoute(path, options),
  });

  const createFocusHandler = (path: string, options?: PrefetchOptions) => ({
    onFocus: () => prefetchRoute(path, options),
  });

  // Prefetch por prioridade (páginas mais acessadas)
  const prefetchPriorityRoutes = () => {
    const priorityRoutes = [
      '/admin/contents',
      '/admin/students', 
      '/admin/settings'
    ];

    priorityRoutes.forEach(route => {
      prefetchRoute(route, { 
        delay: 2000, 
        priority: 'low',
        condition: () => navigator.connection?.effectiveType !== '2g'
      });
    });
  };

  return {
    prefetchRoute,
    createHoverHandler,
    createFocusHandler,
    prefetchPriorityRoutes,
    isPrefetched: (path: string) => prefetchCache.has(path),
    clearCache: () => {
      prefetchCache.clear();
      prefetchPromises.clear();
    }
  };
};

/**
 * Hook para inicialização automática de prefetch
 */
export const useAutoPrefetch = () => {
  const { prefetchPriorityRoutes } = useRoutePrefetch();

  useEffect(() => {
    // Prefetch automático após 3 segundos de inatividade
    const timer = setTimeout(() => {
      if (document.hasFocus() && navigator.onLine) {
        prefetchPriorityRoutes();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [prefetchPriorityRoutes]);
};

/**
 * Componente wrapper para links com prefetch automático
 */
export const PrefetchLink: React.FC<{
  to: string;
  children: React.ReactNode;
  className?: string;
  prefetchOptions?: PrefetchOptions;
}> = ({ to, children, className, prefetchOptions }) => {
  const { createHoverHandler } = useRoutePrefetch();
  const navigate = useNavigate();

  return (
    <button
      className={className}
      onClick={() => startTransition(() => navigate(to))}
      {...createHoverHandler(to, prefetchOptions)}
    >
      {children}
    </button>
  );
};