/**
 * 🚀 SISTEMA DE AUTENTICAÇÃO SIMPLIFICADO 2025
 * Usa apenas auth.users com metadados JWT - Zero duplicação
 * Padrão da indústria: Auth0, Firebase, Clerk
 */

import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

// ================================================================
// TIPOS MODERNOS - JWT FIRST
// ================================================================

export interface ModernUser {
  id: string;
  email: string;
  role: 'super_admin' | 'diretor' | 'coordenador';
  school_id?: string;
  name: string;
  avatar_url?: string;
  is_active: boolean;
  // Dados diretamente do JWT
  school_name?: string;
  phone?: string;
}

export interface ModernSession {
  user: ModernUser;
  supabase_session: Session;
  expires_at: number;
}

// ================================================================
// FUNÇÕES PRINCIPAIS - SIMPLIFICADAS
// ================================================================

/**
 * 🔧 LOGIN SIMPLIFICADO - COM JWT NATIVO
 * Versão simplificada usando apenas JWT do Supabase Auth
 */
export async function loginSimplified(
  email: string,
  password: string,
  totpCode?: string
): Promise<ModernSession> {
  console.log('🔧 loginSimplified INICIADO', { email, hasPassword: !!password, hasTotpCode: !!totpCode });
  try {
    // 🚀 SEMPRE FAZER LOGIN FRESCO - IGUAL AO SISTEMA NORMAL
    // Isso resolve o problema de sessões em estado inconsistente
    console.log('🔧 Fazendo signInWithPassword (sempre fresco)...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    console.log('🔧 signInWithPassword concluído', { hasError: !!error, hasData: !!data });

    if (error) {
      logger.error('Supabase Auth login failed', { error: error.message, email });
      const errorMessage = error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : 
                          error.message === 'Email not confirmed' ? 'Email não confirmado' :
                          error.message === 'Too many requests' ? 'Muitas tentativas. Tente novamente em alguns minutos.' :
                          error.message || 'Erro de autenticação';
      throw new Error(errorMessage);
    }

    if (!data.user || !data.session) {
      throw new Error('Dados de login inválidos');
    }

    console.log('🔧 Login básico bem-sucedido, processando TOTP...');
    
    // Processar TOTP se necessário (pode lançar TOTP_REQUIRED)
    const finalUser = await handleTOTPIfNeeded(data.user, totpCode);

    console.log('🔧 ✅ TOTP processado com sucesso, criando sessão moderna...');
    
    // Criar usuário moderno a partir do JWT
    const modernUser = extractUserFromJWT(finalUser);

    // Criar sessão moderna
    const modernSession: ModernSession = {
      user: modernUser,
      supabase_session: data.session,
      expires_at: new Date(data.session.expires_at!).getTime()
    };

    // Salvar sessão
    saveModernSession(modernSession);

    console.log('🔧 ✅ Login moderno concluído com sucesso!');
    logger.info('Modern login successful', { email: modernUser.email, role: modernUser.role });
    return modernSession;

  } catch (error: any) {
    console.log('🔧 ERRO em loginSimplified:', error.message);
    logger.error('Modern login error', { error: error.message || error, email });
    throw error;
  }
}

/**
 * 📤 LOGOUT MODERNO
 */
export async function logoutSimplified(): Promise<void> {
  try {
    // Limpar sessão inline
    try {
      localStorage.removeItem('edu_modern_session');
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('gotrue')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignorar erros
    }
    
    await supabase.auth.signOut();
    logger.info('Modern logout successful');
  } catch (error: any) {
    logger.error('Logout error', { error: error.message });
    // Force clear inline
    try {
      localStorage.removeItem('edu_modern_session');
    } catch {
      // Ignorar erros
    }
  }
}

/**
 * 👤 EXTRAIR USUÁRIO DO JWT - Zero queries!
 */
function extractUserFromJWT(authUser: User): ModernUser {
  const appMeta = authUser.app_metadata || {};
  const userMeta = authUser.user_metadata || {};

  return {
    id: authUser.id,
    email: authUser.email!,
    role: appMeta.role || 'coordenador',
    school_id: appMeta.school_id,
    name: userMeta.name || authUser.email!.split('@')[0],
    avatar_url: userMeta.avatar_url,
    is_active: !!authUser.email_confirmed_at,
    school_name: userMeta.school_name,
    phone: userMeta.phone
  };
}

/**
 * 🔐 HANDLE TOTP - EXATAMENTE IGUAL AO SISTEMA NORMAL
 */
async function handleTOTPIfNeeded(user: User, totpCode?: string): Promise<User> {
  console.log('🔐 handleTOTPIfNeeded INICIADO', { userId: user.id, hasTotpCode: !!totpCode });
  
  // 🚨 BYPASS TEMPORÁRIO PARA DEBUG - REMOVER EM PRODUÇÃO
  const BYPASS_TOTP = localStorage.getItem('debug_bypass_totp') === 'true';
  if (BYPASS_TOTP) {
    console.log('🚨 BYPASS TOTP ATIVO - Pulando verificação TOTP');
    return user;
  }
  
  try {
    console.log('🔐 Listando fatores MFA...');
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp?.filter(f => f.status === 'verified') || [];
    
    console.log('🔐 Fatores TOTP encontrados:', totpFactors.length);
    
    if (totpFactors.length === 0) {
      console.log('🔐 ✅ SEM TOTP configurado - retornando usuário');
      return user; // Sem TOTP
    }

    console.log('🔐 Verificando AAL...');
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    console.log('🔐 AAL atual:', aal?.currentLevel);
    
    if (aal?.currentLevel === 'aal1') {
      console.log('🔐 AAL1 - TOTP necessário');
      if (!totpCode) {
        console.log('🔐 Código TOTP não fornecido');
        throw new Error('TOTP_REQUIRED');
      }

      const factor = totpFactors[0];
      console.log('🔐 Criando desafio TOTP...');
      
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id
      });
      
      if (challengeError) {
        console.log('🔐 Erro no desafio:', challengeError);
        throw new Error('Erro no desafio TOTP');
      }

      console.log('🔐 Verificando código TOTP com DEBUG DETALHADO...');
      console.log('🔐 📋 Parâmetros da verificação:', {
        factorId: factor.id,
        challengeId: challenge.id,
        code: totpCode,
        codeLength: totpCode.length,
        timestamp: new Date().toISOString()
      });
      
      // ADICIONAR LOGS ANTES E DEPOIS DA CHAMADA
      console.log('🔐 ⏰ ANTES de chamar supabase.auth.mfa.verify()...');
      console.log('🔐 ⏰ Timestamp:', Date.now());
      
      try {
        // CRIAR TIMEOUT PARA FORÇAR DEBUG
        const verifyPromise = supabase.auth.mfa.verify({
          factorId: factor.id,
          challengeId: challenge.id,
          code: totpCode
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log('🔐 ⏰ TIMEOUT DEBUG: mfa.verify() demorou mais de 10 segundos');
            console.log('🔐 ⏰ Isso confirma que a Promise está travada');
            reject(new Error('DEBUG_TIMEOUT: mfa.verify() não retornou em 10 segundos'));
          }, 10000);
        });
        
        console.log('🔐 🏁 Iniciando Promise.race entre verify e timeout...');
        const verifyResult = await Promise.race([verifyPromise, timeoutPromise]) as any;
        
        console.log('🔐 ✅ DEPOIS de chamar supabase.auth.mfa.verify()');
        console.log('🔐 ✅ Timestamp:', Date.now());
        console.log('🔐 ✅ Resultado completo:', {
          hasData: !!verifyResult?.data,
          hasError: !!verifyResult?.error,
          dataType: typeof verifyResult?.data,
          errorType: typeof verifyResult?.error,
          rawResult: verifyResult
        });
        
        const { data: verified, error: verifyError } = verifyResult || {};
        
        if (verifyError) {
          console.log('🔐 ❌ Erro na verificação:', verifyError);
          console.log('🔐 ❌ Erro detalhado:', JSON.stringify(verifyError, null, 2));
          throw new Error('Código TOTP inválido');
        }

        if (!verified) {
          console.log('🔐 ❌ Verificação sem dados válidos');
          throw new Error('Resposta inválida da verificação TOTP');
        }

        console.log('🔐 ✅ TOTP verificado com sucesso!');
        console.log('🔐 ✅ User retornado:', !!verified.user);
        return verified.user || user;
        
      } catch (verifyException: any) {
        console.log('🔐 💥 EXCEÇÃO capturada em mfa.verify():');
        console.log('🔐 💥 Tipo da exceção:', verifyException.constructor.name);
        console.log('🔐 💥 Mensagem:', verifyException.message);
        console.log('🔐 💥 Stack trace:', verifyException.stack);
        throw verifyException;
      }
    }

    console.log('🔐 AAL2 já ativo - retornando usuário');
    return user;
  } catch (error: any) {
    console.log('🔐 ERRO em handleTOTPIfNeeded:', error.message);
    logger.error('TOTP handling error', { error: error.message });
    throw error;
  }
}

// ================================================================
// SESSÃO SIMPLIFICADA
// ================================================================

const MODERN_SESSION_KEY = 'edu_modern_session';

export function saveModernSession(session: ModernSession): void {
  try {
    localStorage.setItem(MODERN_SESSION_KEY, JSON.stringify(session));
  } catch (error: any) {
    logger.error('Failed to save session', { error: error.message });
  }
}

export function loadModernSession(): ModernSession | null {
  try {
    const saved = localStorage.getItem(MODERN_SESSION_KEY);
    if (!saved) return null;

    const session = JSON.parse(saved) as ModernSession;
    
    // Verificar se não expirou
    if (Date.now() > session.expires_at) {
      clearModernSession();
      return null;
    }

    return session;
  } catch (error: any) {
    logger.error('Failed to load session', { error: error.message });
    clearModernSession();
    return null;
  }
}

export function clearModernSession(): void {
  try {
    localStorage.removeItem(MODERN_SESSION_KEY);
    // Limpar também chaves do Supabase
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('gotrue')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error: any) {
    logger.error('Failed to clear session', { error: error.message });
  }
}

/**
 * 🧹 FUNÇÃO DE LIMPEZA COMPLETA PARA DEBUG
 * Remove todas as sessões e dados de autenticação
 */
export function clearAllAuthData(): void {
  try {
    console.log('🧹 Limpando todos os dados de autenticação...');
    
    // Limpar sessão moderna
    localStorage.removeItem(MODERN_SESSION_KEY);
    
    // Limpar todas as chaves relacionadas a auth
    const keysToRemove: string[] = [];
    Object.keys(localStorage).forEach(key => {
      if (
        key.includes('supabase') || 
        key.includes('gotrue') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('edu_')
      ) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🧹 Removido:', key);
    });
    
    // Limpar cookies de auth se existirem
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.includes('supabase') || name.includes('auth')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    
    console.log('🧹 Limpeza completa realizada!');
    logger.info('All auth data cleared for debug');
    
  } catch (error: any) {
    console.error('🧹 Erro na limpeza:', error);
    logger.error('Failed to clear all auth data', { error: error.message });
  }
}

// Expor função globalmente para debug no console
(window as any).clearAllAuthData = clearAllAuthData;

// ================================================================
// UTILIDADES
// ================================================================

export function getCurrentModernUser(): ModernUser | null {
  const session = loadModernSession();
  return session?.user || null;
}

export function isModernAuthenticated(): boolean {
  return loadModernSession() !== null;
}

export function hasModernRole(role: string): boolean {
  const user = getCurrentModernUser();
  return user?.role === role;
}

export function isModernSuperAdmin(): boolean {
  return hasModernRole('super_admin');
}

/**
 * 🔄 AUTH STATE LISTENER - Moderno
 */
export function onModernAuthStateChange(
  callback: (user: ModernUser | null, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    logger.debug('Auth state changed', { event });

    if (event === 'SIGNED_IN' && session?.user) {
      const modernUser = extractUserFromJWT(session.user);
      callback(modernUser, session);
    } else if (event === 'SIGNED_OUT') {
      clearModernSession();
      callback(null, null);
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      const modernUser = extractUserFromJWT(session.user);
      const modernSession: ModernSession = {
        user: modernUser,
        supabase_session: session,
        expires_at: new Date(session.expires_at!).getTime()
      };
      saveModernSession(modernSession);
      callback(modernUser, session);
    }
  });
}

// ================================================================
// HELPERS
// ================================================================



// ================================================================
// INICIALIZAÇÃO
// ================================================================

export function initializeModernAuth(): void {
  logger.info('Modern auth system initialized');
  
  // Limpar sessões antigas incompatíveis
  const oldSession = localStorage.getItem('supabase.auth.token');
  if (oldSession) {
    logger.info('Migrating from old session format');
    localStorage.removeItem('supabase.auth.token');
  }
} 