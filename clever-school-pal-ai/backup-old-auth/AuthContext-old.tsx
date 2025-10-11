import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { 
  UnifiedUser as AdminUser, 
  AuthSession,
  authenticateAdmin,
  loadSession,
  clearAllUserData,
  logout as authLogout,
  isAuthenticated,
  hasRole,
  initializeAuth,
  onAuthStateChange
} from '@/lib/auth';

interface AuthContextType {
  user: AdminUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>; // Alias para compatibilidade
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false); // 🔒 Prevenir múltiplas inicializações

  // 🚀 SISTEMA MODERNO: Auto-sync com Supabase Auth
  useEffect(() => {
    // Prevenir múltiplas execuções
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let subscription: any = null;

    const initAuth = async () => {
      try {
        // Inicializar sistema de auth único
        initializeAuth();
        
        // Carregar sessão existente
        const existingSession = loadSession();
        setSession(existingSession);
        
        // Subscribe to auth changes (session automático)
        const { data } = onAuthStateChange((user, supabaseSession) => {
          if (user && supabaseSession) {
            // Criar sessão compatível
            const authSession: AuthSession = {
              user,
              token: supabaseSession.access_token,
              expires_at: new Date(supabaseSession.expires_at!).getTime()
            };
            setSession(authSession);
            logger.info('Auth state updated', { email: user.email });
          } else {
            setSession(null);
            logger.info('Auth state cleared');
          }
        });
        
        subscription = data.subscription;
        
        // Log de inicialização
        if (existingSession && import.meta.env.DEV) {
          logger.info('Unified auth initialized', { email: existingSession.user.email });
        }
      } catch (error) {
        logger.error('Auth initialization failed', { error });
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Sistema de recuperação quando página volta a ser visível
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        // Página voltou a ser visível - verificar se sessão ainda é válida
        const currentSession = loadSession();
        if (!currentSession && session) {
          // Sessão foi perdida - forçar relogin
          logger.warn('Session lost while page was hidden, clearing auth state');
          setSession(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // 🔒 DEPENDÊNCIAS VAZIAS - sem [session] para evitar loop

  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      setIsLoading(true);
      
      const newSession = await authenticateAdmin(email, password, totpCode);
      setSession(newSession);
      
      toast.success(`Bem-vindo, ${newSession.user.email}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Login failed', { error: errorMessage, email });
      
      // Não mostrar toast para TOTP_REQUIRED (será tratado pela UI)
      if (errorMessage !== 'TOTP_REQUIRED') {
        toast.error(errorMessage);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // 1. LIMPAR STATE IMEDIATAMENTE
      setSession(null);
      
      // 2. LIMPEZA TOTAL DEFINITIVA
      clearAllUserData();
      
      // 3. RESETAR APP STATE (tentativa segura)
      try {
        // Reset do AppContext se disponível
        const event = new CustomEvent('auth:logout');
        window.dispatchEvent(event);
      } catch (appError) {
        logger.warn('App state reset failed', { error: appError });
      }
      
      // 4. CHAMAR LOGOUT OFICIAL
      await authLogout();
      
      toast.info('✅ Logout realizado com sucesso');
    } catch (error) {
      logger.error('Logout failed', { error });
      
      // FALLBACK DE EMERGÊNCIA
      setSession(null);
      clearAllUserData();
      
      toast.error('Logout forçado - dados limpos');
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user: session?.user || null,
    session,
    isLoading,
    login,
    logout,
    signOut: logout, // Alias para compatibilidade
    isAuthenticated: isAuthenticated(),
    hasRole: (role: string) => hasRole(role)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
