import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Base para chamadas de Supabase Functions
function getFunctionsBase(): string {
  try {
    return import.meta.env.DEV ? '' : (import.meta.env.VITE_SUPABASE_URL as string);
  } catch {
    return '';
  }
}

// Construir URL final a partir de caminho relativo ou absoluto
function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getFunctionsBase();
  // Garantir prefixo /functions/v1 quando necessário
  const prefixed = path.startsWith('/functions/v1') ? path : `/functions/v1${path}`;
  return `${base}${prefixed}`;
}

// Disparar evento global para tratamento centralizado de não autorizado
function dispatchUnauthorized(detail: Record<string, any>) {
  try {
    const event = new CustomEvent('http:unauthorized', { detail });
    window.dispatchEvent(event);
  } catch {}
}

export async function authorizedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    logger.warn('Authorized fetch without token');
    dispatchUnauthorized({ reason: 'no_token' });
    throw new Error('Usuário não autenticado');
  }

  const url = buildUrl(path);
  const headers: HeadersInit = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    const errorText = await response.text().catch(() => '');
    logger.warn('HTTP unauthorized', { status: response.status, url, errorText });
    dispatchUnauthorized({ status: response.status, url, errorText });
    throw new Error('Não autorizado');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    logger.error('API Error', { status: response.status, url, errorText });
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response;
}