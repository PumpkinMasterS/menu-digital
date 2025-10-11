/**
 * 🚀 CONTEXTO DE AUTENTICAÇÃO MODERNO 2025
 * Usa apenas auth.users + JWT - Sistema Simplificado
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import {
  ModernUser,
  loginSimplified,
  logoutSimplified,
  loadModernSession,
  onModernAuthStateChange,
  initializeModernAuth
} from '@/lib/auth-simplified';
import { logger } from '@/lib/logger';

// ================================================================
// INTERFACE DO CONTEXTO
// ================================================================

interface ModernAuthContextType {
  // Estado
  user: ModernUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Ações
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Utilitários
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
}

// ================================================================
// CRIAÇÃO DO CONTEXTO
// ================================================================

const ModernAuthContext = createContext<ModernAuthContextType | undefined>(undefined);

export const useModernAuth = (): ModernAuthContextType => {
  const context = useContext(ModernAuthContext);
  if (context === undefined) {
    throw new Error('useModernAuth must be used within a ModernAuthProvider');
  }
  return context;
};

// ================================================================
// PROVIDER MODERNO
// ================================================================

interface ModernAuthProviderProps {
  children: ReactNode;
}

export const ModernAuthProvider: React.FC<ModernAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ModernUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ================================================================
  // INICIALIZAÇÃO
  // ================================================================

  useEffect(() => {
    logger.info('🚀 Modern Auth Provider initializing...');
    
    // Inicializar sistema moderno
    initializeModernAuth();
    
    // Carregar sessão existente
    const existingSession = loadModernSession();
    if (existingSession) {
      setUser(existingSession.user);
      setSession(existingSession.supabase_session);
      logger.info('Session restored', { email: existingSession.user.email });
    }
    
    // Configurar listener de mudanças
    const { data: { subscription } } = onModernAuthStateChange((user, session) => {
      logger.debug('Auth state changed', { user: user?.email, hasSession: !!session });
      setUser(user);
      setSession(session);
    });
    
    setIsLoading(false);
    
    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // ================================================================
  // AÇÕES DE AUTENTICAÇÃO
  // ================================================================

  const login = async (email: string, password: string, totpCode?: string) => {
    console.log('🔍 ModernAuthContext.login INICIADO', { email, hasPassword: !!password, hasTotpCode: !!totpCode });
    try {
      setIsLoading(true);
      console.log('🔍 setIsLoading(true) executado');
      
      console.log('🔍 Chamando loginSimplified...');
      const modernSession = await loginSimplified(email, password, totpCode);
      console.log('🔍 loginSimplified retornou:', { user: modernSession.user.email, role: modernSession.user.role });
      
      setUser(modernSession.user);
      setSession(modernSession.supabase_session);
      console.log('🔍 Estados setados com sucesso');
      
      toast.success(`🎉 Bem-vindo, ${modernSession.user.name}!`, {
        description: `Logado como ${modernSession.user.role}`
      });
      console.log('🔍 Toast de sucesso mostrado');
      
    } catch (error) {
      console.log('🔍 ERRO em ModernAuthContext.login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Login failed', { error: errorMessage, email });
      
      // Tratamento específico de erros
      if (errorMessage === 'TOTP_REQUIRED') {
        // Não mostrar toast para TOTP_REQUIRED (será tratado pela UI)
      } else if (errorMessage.includes('Timeout')) {
        toast.error('⏱️ Timeout na Verificação', {
          description: 'Verificação TOTP demorou muito. Tente novamente.'
        });
      } else if (errorMessage.includes('Código TOTP')) {
        toast.error('🔐 Código TOTP Inválido', {
          description: errorMessage
        });
      } else {
        toast.error('❌ Erro no Login', {
          description: errorMessage
        });
      }
      
      throw error;
    } finally {
      console.log('🔍 setIsLoading(false) executado');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      await logoutSimplified();
      
      setUser(null);
      setSession(null);
      
      toast.success('👋 Até logo!', {
        description: 'Logout realizado com sucesso'
      });
      
    } catch (error) {
      logger.error('Logout error', { error });
      
      // Force clear mesmo com erro
      setUser(null);
      setSession(null);
      
      toast.error('⚠️ Erro no logout, mas sessão foi limpa');
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // UTILITÁRIOS
  // ================================================================

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  // ================================================================
  // VALOR DO CONTEXTO
  // ================================================================

  const value: ModernAuthContextType = {
    // Estado
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    
    // Ações
    login,
    logout,
    
    // Utilitários
    hasRole,
    isSuperAdmin
  };

  return (
    <ModernAuthContext.Provider value={value}>
      {children}
    </ModernAuthContext.Provider>
  );
};

// ================================================================
// COMPONENTE DE MIGRAÇÃO GRADUAL
// ================================================================

/**
 * Hook de compatibilidade para migração gradual
 * Permite usar o sistema antigo e novo simultaneamente
 */
export const useAuthCompat = () => {
  const modernAuth = useModernAuth();
  
  // Retorna interface compatível com sistema antigo
  return {
    // Moderno
    ...modernAuth,
    
    // Compatibilidade com sistema antigo
    isAuthenticated: modernAuth.isAuthenticated,
    currentUser: modernAuth.user,
    
    // Aliases para facilitar migração
    authenticateAdmin: modernAuth.login,
    signOut: modernAuth.logout
  };
};

// ================================================================
// COMPONENTE DE ROTA PROTEGIDA MODERNA
// ================================================================

interface ModernProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
}

export const ModernProtectedRoute: React.FC<ModernProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback = <div className="p-8 text-center">🔒 Acesso negado</div>
}) => {
  const { isAuthenticated, user, isLoading } = useModernAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}; 