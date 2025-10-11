import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para gerenciar Page Visibility API
 * Previne memory leaks parando operações quando página está oculta
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Hook para executar funções apenas quando a página está visível
 * Previne execução desnecessária quando minimizada
 */
export function useVisibleCallback<T extends (...args: any[]) => any>(
  callback: T,
  _deps: any[] = []
): T {
  const isVisible = usePageVisibility();

  return ((...args: any[]) => {
    if (isVisible) {
      return callback(...args);
    }
  }) as T;
}

/**
 * Hook para intervalos que param quando página está oculta
 * Previne memory leaks de timers desnecessários
 */
export function useVisibleInterval(
  callback: () => void,
  delay: number | null,
  immediate = false
) {
  const isVisible = usePageVisibility();
  const callbackRef = useRef(callback);
  
  // Manter callback sempre atualizada
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isVisible || delay === null) {
      return;
    }

    if (immediate) {
      callbackRef.current();
    }

    const interval = setInterval(() => callbackRef.current(), delay);

    return () => {
      clearInterval(interval);
    };
  }, [delay, isVisible, immediate]);
}

/**
 * Hook para timeouts seguros com cleanup automático
 */
export function useSafeTimeout() {
  const timeouts = useState<Set<NodeJS.Timeout>>(() => new Set())[0];

  const setSafeTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      timeouts.delete(timeoutId);
      callback();
    }, delay);

    timeouts.add(timeoutId);
    return timeoutId;
  };

  const clearSafeTimeout = (timeoutId: NodeJS.Timeout) => {
    clearTimeout(timeoutId);
    timeouts.delete(timeoutId);
  };

  // Cleanup automático quando componente desmonta
  useEffect(() => {
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, [timeouts]);

  return { setSafeTimeout, clearSafeTimeout };
}