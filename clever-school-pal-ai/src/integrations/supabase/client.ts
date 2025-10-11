// Supabase Client - SEGURO PARA PRODUÇÃO
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { logger } from '@/lib/logger';

// ✅ SEGURANÇA: Apenas variáveis de ambiente, sem fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ VALIDAÇÃO: Verificar se variáveis estão definidas
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required');
}

// ✅ VALIDAÇÃO: Verificar formato das URLs
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error('Invalid VITE_SUPABASE_URL format');
}

// Cliente Supabase seguro para produção
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage
  }
});

/**
 * Limpeza segura do Supabase Auth
 */
export function clearSupabaseAuth() {
  try {
    logger.debug('Clearing Supabase auth...');
    supabase.auth.signOut();
    
    // Limpar storage interno do Supabase
    if (typeof window !== 'undefined') {
      const storageKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || 
        key.includes('gotrue')
      );
      
      storageKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    }
    
    logger.debug('Supabase auth cleared');
  } catch (error) {
    logger.error('Erro ao limpar Supabase auth', { error });
  }
}
