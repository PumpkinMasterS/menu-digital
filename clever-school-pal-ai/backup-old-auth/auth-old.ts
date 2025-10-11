/**
 * Sistema de Autenticação JWT Profissional
 * Production-ready authentication system with JWT tokens
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

// Types unificados - PADRÃO 2025
export interface UnifiedUser {
  id: string;
  email: string;
  role: 'super_admin' | 'diretor' | 'coordenador';
  school_id?: string;
  schoolSlug?: string;
  name: string;
  type: 'admin' | 'school';
  avatar_url?: string;
  verified_at?: string;
  is_active: boolean;
}

export interface AuthSession {
  user: UnifiedUser;
  token: string;
  expires_at: number;
}

export interface AuthState {
  user: UnifiedUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ================================================================
// AUTENTICAÇÃO PRINCIPAL - SUBSTITUI SISTEMA ANTIGO
// ================================================================

/**
 * 🔥 LOGIN PRINCIPAL - Substitui authenticateAdmin
 */
export async function authenticateAdmin(
  email: string,
  password: string,
  totpCode?: string
): Promise<AuthSession> {
  try {
    logger.info('Starting unified login', { email });

    // 1. Login com Supabase Auth nativo
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.error('Supabase Auth login failed', { error: error.message, email });
      throw new Error(getErrorMessage(error));
    }

    if (!data.user || !data.session) {
      throw new Error('Dados de login inválidos');
    }

    // 2. Processar TOTP se necessário
    const finalUser = await handleTOTPIfNeeded(data.user, totpCode);

    // 3. Buscar/criar dados do usuário unificado
    const unifiedUser = await getOrCreateUnifiedUser(finalUser);

    // 4. Criar sessão compatível
    const session: AuthSession = {
      user: unifiedUser,
      token: data.session.access_token,
      expires_at: new Date(data.session.expires_at!).getTime()
    };

    // 5. Salvar sessão
    saveSession(session);

    logger.info('Unified login successful', { 
      email: unifiedUser.email, 
      role: unifiedUser.role,
      type: unifiedUser.type 
    });

    return session;
  } catch (error: any) {
    logger.error('Unified login error', { error: error.message || error, email });
    throw error;
  }
}

/**
 * 🚀 LOGIN COM GOOGLE
 */
export async function loginWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
    
    logger.info('Google OAuth initiated');
    return data;
  } catch (error: any) {
    logger.error('Google login error', { error: error.message });
    throw error;
  }
}

/**
 * ✨ MAGIC LINK
 */
export async function sendMagicLink(email: string) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
    
    logger.info('Magic link sent', { email });
  } catch (error: any) {
    logger.error('Magic link error', { error: error.message, email });
    throw error;
  }
}

/**
 * 🔐 PASSWORD RESET
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    
    logger.info('Password reset sent', { email });
  } catch (error: any) {
    logger.error('Password reset error', { error: error.message, email });
    throw error;
  }
}

/**
 * 🚪 LOGOUT - Substitui logout()
 */
export async function logout() {
  try {
    // Clear localStorage primeiro
    clearAllUserData();
    
    // Supabase logout
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Logout error', { error });
      // Continue mesmo com erro
    }
    
    logger.info('Logout successful');
  } catch (error: any) {
    logger.error('Logout error', { error: error.message });
    // Force clear mesmo com erro
    clearAllUserData();
  }
}

// ================================================================
// SESSÃO E USUÁRIO - COMPATIBILIDADE
// ================================================================

const AUTH_STORAGE_KEY = 'supabase.auth.token';

/**
 * Salvar sessão no localStorage (compatibilidade)
 */
export function saveSession(session: AuthSession) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    logger.debug('Session saved', { email: session.user.email });
  } catch (error: any) {
    logger.error('Failed to save session', { error: error.message });
  }
}

/**
 * Carregar sessão do localStorage
 */
export function loadSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as AuthSession;
    
    // Verificar se sessão não expirou
    if (session.expires_at && Date.now() > session.expires_at) {
      logger.debug('Session expired, clearing');
      clearSession();
      return null;
    }

    return session;
  } catch (error: any) {
    logger.error('Failed to load session', { error: error.message });
    clearSession();
    return null;
  }
}

/**
 * Limpar sessão
 */
export function clearSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    logger.debug('Session cleared');
  } catch (error: any) {
    logger.error('Failed to clear session', { error: error.message });
  }
}

/**
 * 👤 OBTER USUÁRIO ATUAL
 */
export function getCurrentUser(): UnifiedUser | null {
  const session = loadSession();
  return session?.user || null;
}

/**
 * Verificar se está autenticado
 */
export function isAuthenticated(): boolean {
  const session = loadSession();
  return session !== null;
}

/**
 * Verificar role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * Verificar se é super admin
 */
export function isSuperAdmin(): boolean {
  return hasRole('super_admin');
}

/**
 * 📊 OBTER SESSÃO ATUAL VIA SUPABASE
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error: any) {
    logger.error('Get session error', { error: error.message });
    return null;
  }
}

/**
 * 🔄 SUBSCRIBE TO AUTH CHANGES
 */
export function onAuthStateChange(callback: (user: UnifiedUser | null, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      logger.debug('Auth state change', { event, hasSession: !!session });
      
      if (session?.user) {
        const unifiedUser = await getOrCreateUnifiedUser(session.user);
        
        // Salvar sessão compatível
        const authSession: AuthSession = {
          user: unifiedUser,
          token: session.access_token,
          expires_at: new Date(session.expires_at!).getTime()
        };
        saveSession(authSession);
        
        callback(unifiedUser, session);
      } else {
        clearSession();
        callback(null, null);
      }
    } catch (error: any) {
      logger.error('Auth state change error', { error: error.message, event });
      callback(null, null);
    }
  });
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Buscar ou criar usuário unificado
 */
async function getOrCreateUnifiedUser(authUser: User): Promise<UnifiedUser> {
  try {
    // Extrair dados dos metadados
    const appMeta = authUser.app_metadata || {};
    const userMeta = authUser.user_metadata || {};
    
    const role = appMeta.role || userMeta.role || 'coordenador';
    const school_id = appMeta.school_id || userMeta.school_id;
    const name = userMeta.name || userMeta.full_name || authUser.email?.split('@')[0] || 'Usuário';
    
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
    
    // Sincronizar com admin_users se necessário
    await ensureAdminUserSync(authUser);
    
    return {
      id: authUser.id,
      email: authUser.email!,
      role: role as 'super_admin' | 'diretor' | 'coordenador',
      school_id,
      schoolSlug,
      name,
      type: role === 'super_admin' ? 'admin' : 'school',
      avatar_url: userMeta.avatar_url,
      verified_at: authUser.email_confirmed_at,
      is_active: true
    };
  } catch (error: any) {
    logger.error('Error creating unified user', { error: error.message, userId: authUser.id });
    throw new Error('Erro ao processar dados do usuário');
  }
}

/**
 * Garantir sincronização com admin_users
 */
async function ensureAdminUserSync(authUser: User) {
  try {
    // Usar RPC para sincronização
    const { error } = await supabase.rpc('sync_auth_user_to_admin', {
      auth_user_id: authUser.id
    });
    
    if (error) {
      logger.warn('RPC sync failed, trying direct insert', { error: error.message });
      
      // Fallback: inserir diretamente
      const appMeta = authUser.app_metadata || {};
      const userMeta = authUser.user_metadata || {};
      
      await supabase
        .from('admin_users')
        .upsert({
          email: authUser.email,
          password_hash: 'supabase_auth',
          name: userMeta.name || userMeta.full_name || 'Usuário',
          role: appMeta.role || 'coordenador',
          school_id: appMeta.school_id || null,
          is_active: true,
          auth_user_id: authUser.id
        }, {
          onConflict: 'email'
        });
      
      logger.info('Direct sync completed', { email: authUser.email });
    } else {
      logger.info('RPC sync completed', { email: authUser.email });
    }
  } catch (error: any) {
    logger.warn('Admin users sync failed', { error: error.message, email: authUser.email });
    // Não falhar o login por isso
  }
}

/**
 * Handle TOTP se configurado
 */
async function handleTOTPIfNeeded(user: User, totpCode?: string): Promise<User> {
  console.log('🟢 NORMAL handleTOTPIfNeeded INICIADO', { userId: user.id, hasTotpCode: !!totpCode });
  
  try {
    console.log('🟢 NORMAL Listando fatores MFA...');
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp?.filter(f => f.status === 'verified') || [];
    
    console.log('🟢 NORMAL Fatores TOTP encontrados:', totpFactors.length);
    
    if (totpFactors.length === 0) {
      console.log('🟢 NORMAL ✅ SEM TOTP configurado - retornando usuário');
      return user; // Sem TOTP
    }

    console.log('🟢 NORMAL Verificando AAL...');
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    console.log('🟢 NORMAL AAL atual:', aal?.currentLevel);
    
    if (aal?.currentLevel === 'aal1') {
      console.log('🟢 NORMAL AAL1 - TOTP necessário');
      if (!totpCode) {
        console.log('🟢 NORMAL Código TOTP não fornecido');
        throw new Error('TOTP_REQUIRED');
      }
      
      const factor = totpFactors[0];
      console.log('🟢 NORMAL Criando desafio TOTP...');
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id
      });
      
      if (challengeError) {
        console.log('🟢 NORMAL Erro no desafio:', challengeError);
        throw new Error('Erro no desafio TOTP');
      }

      console.log('🟢 NORMAL Verificando código TOTP...');
      const { data: verified, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: totpCode
      });
      
      if (verifyError) {
        console.log('🟢 NORMAL Erro na verificação:', verifyError);
        throw new Error('Código TOTP inválido');
      }

      console.log('🟢 NORMAL ✅ TOTP verificado com sucesso!');
      return verified.user || user;
    }
    
    console.log('🟢 NORMAL AAL2 já ativo - retornando usuário (BYPASS!)');
    return user;
  } catch (error: any) {
    console.log('🟢 NORMAL ERRO em handleTOTPIfNeeded:', error.message);
    logger.error('TOTP handling error', { error: error.message });
    throw error;
  }
}

/**
 * Limpar todos os dados do usuário
 */
export function clearAllUserData() {
  try {
    // Limpar localStorage
    const keysToRemove = [
      'supabase.auth.token',
      'auth-session',
      'user-preferences',
      'app-cache'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    logger.debug('User data cleared');
  } catch (error: any) {
    logger.error('Error clearing user data', { error: error.message });
  }
}

/**
 * Inicializar auth system
 */
export function initializeAuth() {
  logger.info('Unified auth system initialized', { 
    version: '2025-modern',
    features: ['supabase-native', 'oauth', 'magic-links', 'totp', 'unified']
  });
}

/**
 * Traduzir mensagens de erro
 */
function getErrorMessage(error: AuthError): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
    'Too many requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
    'User not found': 'Usuário não encontrado',
    'Invalid email': 'Email inválido',
    'Password should be at least 6 characters': 'Senha deve ter pelo menos 6 caracteres',
    'Signup not allowed for this instance': 'Cadastro não permitido'
  };
  
  return errorMap[error.message] || error.message || 'Erro de autenticação';
}

// Tipos para compatibilidade com sistema atual
export type AdminUser = UnifiedUser;
export { type UnifiedUser as ModernUser };

// Export principal
export default supabase; 