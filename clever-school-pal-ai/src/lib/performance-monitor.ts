interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  route?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private cleanupInterval: number | null = null;
  private readonly MAX_METRICS = 20; // Limite muito pequeno
  private readonly CLEANUP_INTERVAL = 60000; // Limpar a cada 1 minuto

  constructor() {
    this.initObservers();
    this.startAutoCleanup();
  }

  private initObservers() {
    // Desabilitado por padrão para evitar memory leaks e logs excessivos
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Só ativar se explicitamente habilitado
    if (!localStorage.getItem('enable_performance_debug')) {
      return;
    }

    try {
      // Observe apenas navegação muito lenta (>5s)
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
            
            // Só registrar se for extremamente lento
            if (loadTime > 5000) {
              this.recordMetric('very_slow_page', loadTime);
            }
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);

    } catch {
      // Silencioso - sem logs de erro
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    return 'other';
  }

  recordMetric(name: string, value: number, route?: string) {
    // Só processar métricas muito críticas
    if (value < 3000) {
      return; // Ignorar métricas normais
    }

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      route: route || window.location.pathname,
    };

    // Manter array muito pequeno
    this.metrics.push(metric);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-10); // Manter apenas as últimas 10
    }

    // Log apenas erros críticos (>8s)
    if (value > 8000) {
      console.error(`CRITICAL Performance: ${name} = ${Math.round(value)}ms`);
    }

    // Analytics apenas para casos extremos
    if (value > 5000) {
      this.sendToAnalytics(metric);
    }
  }

  // Sistema de limpeza automática
  private startAutoCleanup() {
    if (typeof window === 'undefined') return;
    
    this.cleanupInterval = window.setInterval(() => {
      // Limpar métricas antigas (>5 minutos)
      const fiveMinutesAgo = Date.now() - 300000;
      this.metrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);
      
      // Forçar limite máximo
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS);
      }
    }, this.CLEANUP_INTERVAL);
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Enviar para analytics apenas em produção e métricas críticas
    if (!import.meta.env.PROD) return;
    
    try {
      // Implementar envio para sistema de analytics quando disponível
      // Exemplo: DataDog, New Relic, etc.
      if (import.meta.env.DEV) {
        console.log('Analytics:', metric.name, metric.value);
      }
    } catch (error) {
      // Silencioso em produção para evitar spam
      if (import.meta.env.DEV) {
        console.warn('Analytics error:', error);
      }
    }
  }

  measureComponentRender<T>(componentName: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric(`component_render_${componentName}`, end - start);
    
    return result;
  }

  measureAsync<T>(operationName: string, promise: Promise<T>): Promise<T> {
    const start = performance.now();
    
    return promise.finally(() => {
      const end = performance.now();
      this.recordMetric(`async_operation_${operationName}`, end - start);
    });
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsSummary() {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    
    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
    }
    
    return summary;
  }

  // Desabilitar completamente o monitoring
  disable() {
    this.cleanup();
    // Remover da instância global se necessário
    this.recordMetric = () => {}; // No-op
  }

  // Forçar limpeza imediata
  forceCleanup() {
    this.metrics.length = 0;
    if (import.meta.env.DEV) {
      console.log('Performance metrics cleared');
    }
  }

  cleanup() {
    // Limpar observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    
    // Limpar interval de auto-limpeza
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Limpar métricas
    this.metrics.length = 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook simplificado - só mede se habilitado
export function usePerformanceMonitor(componentName: string) {
  const isEnabled = import.meta.env.DEV && localStorage.getItem('enable_performance_debug');
  
  return {
    measure: <T>(fn: () => T) => {
      if (!isEnabled) return fn(); // Skip medição se desabilitado
      return performanceMonitor.measureComponentRender(componentName, fn);
    },
    measureAsync: <T>(operationName: string, promise: Promise<T>) => {
      if (!isEnabled) return promise; // Skip medição se desabilitado
      return performanceMonitor.measureAsync(`${componentName}_${operationName}`, promise);
    },
  };
} 