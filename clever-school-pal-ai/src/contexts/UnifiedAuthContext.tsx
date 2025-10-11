// =====================================================
// UNIFIED AUTH CONTEXT 2025 - PADRÃO MODERNO
// Usa APENAS Supabase Auth (auth.users) sem admin_users
// =====================================================

import React, { createContext, useContext, useEffect, useState, startTransition } from 'react';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import {
  ModernUser,
  loginSimplified,
  logoutSimplified,
  loadModernSession,
  saveModernSession,
  onModernAuthStateChange,
  initializeModernAuth,
  clearAllAuthData,
} from '@/lib/auth-simplified';
import { logger } from '@/lib/logger';

// ================================================================
// INTERFACE UNIFICADA 2025
// ================================================================

interface UnifiedAuthContextType {
  // Estado
  user: ModernUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPendingTotp: boolean;
  
  // Ações
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  cancelTotp: () => void;
  
  // Utilitários de compatibilidade
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;

  // Utilitários de estado local (não persistem no servidor)
  assignSchoolLocally: (schoolId: string, schoolName?: string) => void;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | null>(null);

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth deve ser usado dentro de UnifiedAuthProvider');
  }
  return context;
}

// ================================================================
// PROVIDER UNIFICADO 2025
// ================================================================

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ModernUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingTotp, setIsPendingTotp] = useState(false);

  // ================================================================
  // INICIALIZAÇÃO - Sistema moderno puro
  // ================================================================

  useEffect(() => {
    logger.info('🚀 Unified Auth Provider 2025 initializing...');
    
    // Inicializar sistema moderno (apenas Supabase Auth)
    initializeModernAuth();
    
    // Carregar sessão existente do localStorage
    const existingSession = loadModernSession();
    if (existingSession) {
      setUser(existingSession.user);
      setSession(existingSession.supabase_session);
      logger.info('✅ Session restored from storage', { 
        email: existingSession.user.email,
        role: existingSession.user.role 
      });
    }
    
    // Configurar listener de mudanças de auth state
    const { data: { subscription } } = onModernAuthStateChange((user, session) => {
      logger.debug('🔄 Auth state changed', { 
        user: user?.email, 
        hasSession: !!session,
        role: user?.role 
      });
      startTransition(() => {
        setUser(user);
        setSession(session);
      });
    });
    
    setIsLoading(false);
    logger.info('✅ Unified Auth Provider 2025 ready');
    
    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      window.removeEventListener('http:unauthorized', unauthorizedHandler);
    };
  }, []);

  // ================================================================
  // VERIFICAÇÃO DE AUTH (manual)
  // ================================================================

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      logger.info('🔍 Manual auth check triggered...');

      // Verificar se ainda temos sessão válida
      const currentSession = loadModernSession();
      
      if (currentSession) {
        startTransition(() => {
          setUser(currentSession.user);
          setSession(currentSession.supabase_session);
        });
        logger.info('✅ Auth check - session valid', { 
          email: currentSession.user.email 
        });
      } else {
        startTransition(() => {
          setUser(null);
          setSession(null);
        });
        logger.info('❌ Auth check - no valid session');
      }

    } catch (error) {
      logger.error('💥 Error during auth check', { error: (error as any).message });
      startTransition(() => {
        setUser(null);
        setSession(null);
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // LOGIN - Sistema simplificado puro
  // ================================================================

  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      setIsLoading(true);
      
      // Se temos um código TOTP, limpar o estado pendente
      if (totpCode) {
        setIsPendingTotp(false);
      }
      
      logger.info('🔐 Starting unified login 2025', { email });
      
      // Usar o sistema simplificado que JÁ funciona apenas com Supabase Auth
      const modernSession = await loginSimplified(email, password, totpCode);
      
      startTransition(() => {
        setUser(modernSession.user);
        setSession(modernSession.supabase_session);
        setIsPendingTotp(false); // Limpar estado TOTP após sucesso
      });
      
      logger.info('✅ Unified login successful', { 
        userId: modernSession.user.id,
        role: modernSession.user.role,
        email: modernSession.user.email
      });
      
      toast.success(`🎉 Bem-vindo, ${modernSession.user.name}!`, {
        description: `Logado como ${modernSession.user.role}`
      });
      
    } catch (error) {
      logger.error('❌ Unified login failed', { error: (error as any).message, email });
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Tratamento específico de erros
      if (errorMessage === 'TOTP_REQUIRED') {
        // 🆕 Marcar TOTP como pendente para prevenir navegação automática
        startTransition(() => {
          setIsPendingTotp(true);
          // 🆕 Limpar user e session quando TOTP é necessário para evitar redirecionamento
          setUser(null);
          setSession(null);
        });
        logger.info('🔐 TOTP required - preventing auto navigation, cleared user state');
        throw error;
      } else {
        // Limpar estado TOTP em outros erros
        startTransition(() => {
          setIsPendingTotp(false);
        });
        
        if (errorMessage.includes('Timeout')) {
          toast.error('⏱️ Timeout na Verificação', {
            description: 'Verificação TOTP demorou muito. Tente novamente.'
          });
        } else if (errorMessage.includes('Código TOTP')) {
          toast.error('🔐 Código TOTP Inválido', {
            description: errorMessage
          });
        } else if (errorMessage.includes('Invalid login')) {
          toast.error('❌ Credenciais Inválidas', {
            description: 'Email ou password incorretos'
          });
        } else {
          toast.error('❌ Erro no Login', {
            description: errorMessage
          });
        }
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // LOGOUT - Limpeza total
  // ================================================================

  const logout = async () => {
    try {
      setIsLoading(true);
      logger.info('🚪 Starting unified logout 2025');
      
      // Limpar estado imediatamente
      startTransition(() => {
        setUser(null);
        setSession(null);
        setIsPendingTotp(false);
      });
      
      // Limpeza total do sistema
      await logoutSimplified();
      clearAllAuthData();
      
      // Evento para outros componentes
      const event = new CustomEvent('auth:logout');
      window.dispatchEvent(event);
      
      logger.info('✅ Unified logout successful');
      toast.success('👋 Até logo!', {
        description: 'Logout realizado com sucesso'
      });
      
    } catch (error) {
      logger.error('💥 Error during logout', { error: (error as any).message });
      
      // Force clear mesmo com erro
      startTransition(() => {
        setUser(null);
        setSession(null);
        setIsPendingTotp(false);
      });
      clearAllAuthData();
      
      toast.error('⚠️ Erro no logout, mas sessão foi limpa');
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // LISTENER GLOBAL PARA 401/403
  // ================================================================
  const unauthorizedHandler = (e: Event) => {
    const detail = (e as CustomEvent)?.detail;
    logger.warn('Global unauthorized event', detail);
    // Realizar logout para limpar estado e forçar reautenticação
    logout();
    // Opcional: exibir toast informativo
    toast('Sessão expirada ou acesso não autorizado. Faça login novamente.');
  };

  useEffect(() => {
    window.addEventListener('http:unauthorized', unauthorizedHandler);
    return () => window.removeEventListener('http:unauthorized', unauthorizedHandler);
  }, []);

  // ================================================================
  // UTILITÁRIOS DE COMPATIBILIDADE
  // ================================================================

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  const refreshUser = async (): Promise<void> => {
    try {
      logger.info('🔄 Refreshing user data...');
      
      // Recarregar sessão do localStorage
      const currentSession = loadModernSession();
      
      if (currentSession) {
        startTransition(() => {
          setUser(currentSession.user);
          setSession(currentSession.supabase_session);
        });
        logger.info('✅ User data refreshed', { 
          email: currentSession.user.email,
          name: currentSession.user.name 
        });
      }
    } catch (error) {
      logger.error('💥 Error refreshing user data', { error: (error as any).message });
    }
  };

  const cancelTotp = (): void => {
    startTransition(() => {
      setIsPendingTotp(false);
    });
    logger.info('🔐 TOTP cancelled by user');
  };

  // ================================================================
  // UTILITÁRIO LOCAL: Atribuir escola na sessão local
  // ================================================================

  const assignSchoolLocally = (schoolId: string, schoolName?: string): void => {
    try {
      const cur = loadModernSession();
      if (!cur) {
        logger.warn('assignSchoolLocally called with no active session');
        return;
      }

      cur.user.school_id = schoolId;
      if (schoolName) cur.user.school_name = schoolName;

      saveModernSession(cur);
      startTransition(() => {
        setUser({ ...cur.user });
        setSession(cur.supabase_session);
      });

      logger.info('🏫 School assigned locally to user', { schoolId, schoolName });

      // Disparar evento para demais partes do app reagirem (ex: AppContext)
      const evt = new CustomEvent('school:assigned', { detail: { schoolId, schoolName } });
      window.dispatchEvent(evt);

      toast.success('🏫 Escola atribuída com sucesso');
    } catch (e) {
      logger.error('Failed to assign school locally', { error: (e as any).message });
    }
  };

  // ================================================================
  // VALOR DO CONTEXTO
  // ================================================================

  const value: UnifiedAuthContextType = {
    // Estado
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    isPendingTotp,
    
    // Ações
    login,
    logout,
    checkAuth,
    refreshUser,
    cancelTotp,
    
    // Utilitários
    hasRole,
    isSuperAdmin,

    // Estado local
    assignSchoolLocally
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}