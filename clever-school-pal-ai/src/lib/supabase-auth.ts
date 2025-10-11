// ================================================================
// SISTEMA DE AUTENTICAÇÃO SUPABASE NATIVO MODERNO - 2025
// Usando @supabase/ssr + patterns modernos
// ================================================================

import { createBrowserClient } from '@supabase/ssr';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { logger } from './logger';

// Types modernos compatíveis com sistema atual
export interface ModernUser {
  id: string;
  email: string;
  role: 'super_admin' | 'diretor' | 'coordenador';
  school_id?: string;
  schoolSlug?: string;
  name: string;
  type: 'admin' | 'school';
  // Novos campos 2025
  avatar_url?: string;
  phone?: string;
  verified_at?: string;
}

export interface AuthState {
  user: ModernUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Cliente Supabase moderno com SSR
export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * 🔥 MODERN AUTH METHODS - 2025 STANDARDS
 */

/**
 * Login com email/senha + TOTP opcional
 */
export async function signInWithPassword(
  email: string,
  password: string,
  totpCode?: string
): Promise<{ user: ModernUser; session: Session }> {
  try {
    // 1. Login básico
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.error('Login failed', { error: error.message, email });
      throw new Error(getErrorMessage(error));
    }

    if (!data.user || !data.session) {
      throw new Error('Dados de login inválidos');
    }

    // 2. Verificar TOTP se configurado
    const processedUser = await handleTOTPIfRequired(data.user, totpCode);

    // 3. Processar metadados do usuário
    const modernUser = await processUserMetadata(processedUser);

    logger.info('Login successful', { 
      email: modernUser.email, 
      role: modernUser.role,
      type: modernUser.type 
    });

    return { user: modernUser, session: data.session };
  } catch (error) {
    logger.error('Sign in error', { error, email });
    throw error;
  }
}

/**
 * Login com OAuth (Google, GitHub, etc.) - NOVO 2025
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'apple') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('OAuth sign in error', { error, provider });
    throw error;
  }
}

/**
 * Magic Link Login - NOVO 2025
 */
export async function signInWithMagicLink(email: string) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;

    logger.info('Magic link sent', { email });
  } catch (error) {
    logger.error('Magic link error', { error, email });
    throw error;
  }
}

/**
 * Reset Password - AUTOMÁTICO 2025
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`
    });

    if (error) throw error;

    logger.info('Password reset sent', { email });
  } catch (error) {
    logger.error('Password reset error', { error, email });
    throw error;
  }
}

/**
 * Logout moderno
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Logout error', { error });
      throw error;
    }

    logger.info('Logout successful');
  } catch (error) {
    logger.error('Sign out error', { error });
    throw error;
  }
}

/**
 * 🔐 TOTP/MFA METHODS
 */

/**
 * Configurar TOTP para usuário
 */
export async function setupTOTP() {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp'
    });

    if (error) throw error;

    return {
      id: data.id,
      type: data.type,
      totp: data.totp
    };
  } catch (error) {
    logger.error('TOTP setup error', { error });
    throw error;
  }
}

/**
 * Verificar código TOTP
 */
export async function verifyTOTP(factorId: string, code: string) {
  try {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: '', // Will be set by challenge
      code
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('TOTP verification error', { error });
    throw error;
  }
}

/**
 * 🛠️ HELPER FUNCTIONS
 */

/**
 * Processar TOTP se necessário
 */
async function handleTOTPIfRequired(user: User, totpCode?: string): Promise<User> {
  try {
    // Verificar fatores MFA
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp?.filter(f => f.status === 'verified') || [];

    if (totpFactors.length === 0) {
      return user; // Sem TOTP configurado
    }

    // Verificar nível de garantia
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aal?.currentLevel === 'aal1') {
      if (!totpCode) {
        throw new Error('TOTP_REQUIRED');
      }

      // Criar e verificar desafio
      const factor = totpFactors[0];
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id
      });

      if (challengeError) {
        throw new Error('Erro no desafio TOTP');
      }

      const { data: verified, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: totpCode
      });

      if (verifyError) {
        throw new Error('Código TOTP inválido');
      }

      return verified.user || user;
    }

    return user;
  } catch (error) {
    logger.error('TOTP handling error', { error });
    throw error;
  }
}

/**
 * Processar metadados do usuário para compatibilidade
 */
async function processUserMetadata(user: User): Promise<ModernUser> {
  const appMeta = user.app_metadata || {};
  const userMeta = user.user_metadata || {};

  const role = appMeta.role || userMeta.role;
  const school_id = appMeta.school_id || userMeta.school_id;
  const name = userMeta.name || userMeta.full_name || user.email || 'Usuário';

  if (!role) {
    throw new Error('Usuário sem role definida');
  }

  // Buscar dados da escola se necessário
  let schoolSlug: string | undefined;
  if (school_id && role !== 'super_admin') {
    try {
      const { data: school } = await supabase
        .from('schools')
        .select('slug')
        .eq('id', school_id)
        .single();
      
      schoolSlug = school?.slug;
    } catch (error) {
      logger.warn('Failed to fetch school', { school_id, error });
    }
  }

  return {
    id: user.id,
    email: user.email!,
    role: role as 'super_admin' | 'diretor' | 'coordenador',
    school_id,
    schoolSlug,
    name,
    type: getUserType(role),
    // Campos novos 2025
    avatar_url: userMeta.avatar_url,
    phone: userMeta.phone,
    verified_at: user.email_confirmed_at
  };
}

/**
 * Obter tipo de usuário (compatibilidade)
 */
function getUserType(role: string): 'admin' | 'school' {
  return role === 'super_admin' ? 'admin' : 'school';
}

/**
 * Mapear mensagens de erro para português
 */
function getErrorMessage(error: AuthError): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
    'Too many requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
    'User not found': 'Usuário não encontrado',
    'Invalid email': 'Email inválido',
    'Password should be at least 6 characters': 'Senha deve ter pelo menos 6 caracteres'
  };

  return errorMap[error.message] || error.message || 'Erro desconhecido';
}

/**
 * 📊 UTILITIES 2025
 */

/**
 * Obter sessão atual
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    logger.error('Get session error', { error });
    return null;
  }
}

/**
 * Obter usuário atual
 */
export async function getCurrentUser(): Promise<ModernUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return await processUserMetadata(user);
  } catch (error) {
    logger.error('Get user error', { error });
    return null;
  }
}

/**
 * Subscribe to auth changes - MODERNO 2025
 */
export function onAuthStateChange(callback: (user: ModernUser | null, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (session?.user) {
        const modernUser = await processUserMetadata(session.user);
        callback(modernUser, session);
      } else {
        callback(null, null);
      }
    } catch (error) {
      logger.error('Auth state change error', { error, event });
      callback(null, null);
    }
  });
}

export default supabase;