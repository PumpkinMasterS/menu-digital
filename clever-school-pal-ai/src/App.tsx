// =====================================================
// APP UNIFICADO 2025
// Sistema de autenticação simplificado e moderno
// APENAS Supabase Auth - Zero dependências admin_users
// =====================================================

import React, { useEffect, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/components/ui/notification-system";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { UnifiedAuthProvider, useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/Sidebar";
import { AutoLogoutProvider } from "@/components/auth/AutoLogoutProvider";
import { logger } from './lib/logger';
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Lazy loading para páginas mais fluidas
import { lazy, Suspense } from 'react';

// Páginas críticas (carregamento imediato)
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import FirstAccess from "@/pages/FirstAccess";
import Debug401 from "@/pages/Debug401";

// Lazy-loaded pages
const Index = lazy(() => import("@/pages/Index"));
const Schools = lazy(() => import("@/pages/Schools"));
const Classes = lazy(() => import("@/pages/Classes"));
const Students = lazy(() => import("@/pages/Students"));
const Subjects = lazy(() => import("@/pages/Subjects"));
const Contents = lazy(() => import("@/pages/Contents"));
const Settings = lazy(() => import("@/pages/Settings"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const SecurityMonitoring = lazy(() => import("@/pages/SecurityMonitoring"));
const BotConfig = lazy(() => import("@/pages/BotConfig"));
const ContextManagement = lazy(() => import("@/pages/ContextManagement"));
const AdminManagement = lazy(() => import("@/pages/AdminManagement"));
const Tags = lazy(() => import("@/pages/Tags"));
const Help = lazy(() => import("@/pages/Help"));
const Users = lazy(() => import("@/pages/Users"));
const OCRVision = lazy(() => import("@/pages/OCRVision"));
const TeacherManagement = lazy(() => import("@/pages/TeacherManagement"));
const ProfessorDashboard = lazy(() => import("@/pages/ProfessorDashboard"));
const SchoolAssignment = lazy(() => import("@/pages/SchoolAssignment"));
const DiscordManagement = lazy(() => import("@/pages/DiscordManagement"));

// QueryClient otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading Components otimizados
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground">Carregando sistema unificado 2025...</p>
    </div>
  </div>
);

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center p-8 min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Carregando página...</p>
    </div>
  </div>
);

// SafeRouteWrapper sem Suspense para evitar erro de suspensão síncrona
const SafeRouteWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="fade-in page-transition">
    {children}
  </div>
);

// LazyWrapper para componentes lazy-loaded
const LazyWrapper = ({ children }: { children: React.ReactNode }) => {
  const [suspenseKey, setSuspenseKey] = React.useState(0);
  
  // Reset Suspense on browser extension errors
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.stack?.includes('hook.js') || 
          event.error?.stack?.includes('overrideMethod') ||
          event.error?.message?.includes('Connect AI application error')) {
        console.warn('🔧 Resetting Suspense due to browser extension interference');
        setSuspenseKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  return (
    <Suspense key={suspenseKey} fallback={<PageLoadingFallback />}>
      {children}
    </Suspense>
  );
};

// Componente para redirecionamento baseado em role
function RoleBasedRedirect() {
  const { user, isLoading, isPendingTotp } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !user || isPendingTotp) {
      // 🆕 Não navegar se TOTP está pendente
      if (isPendingTotp) {
        logger.info('🔐 TOTP pending - skipping role-based redirect');
      }
      return;
    }

    logger.info('Processing role-based redirect', { 
      role: user.role, 
      currentPath: location.pathname,
      schoolId: user.school_id 
    });

    // Definir rota padrão baseada no role
    let defaultRoute = '';
    
    switch (user.role) {
      case 'super_admin':
        // Super admin sempre vai para o painel administrativo
        defaultRoute = '/admin';
        break;
      case 'diretor':
      case 'coordenador':
        if (user.school_id) {
          defaultRoute = `/escola/${user.school_id}`;
        } else {
          logger.warn('School user without school_id - redirecting to school assignment', { user });
          startTransition(() => {
            navigate('/atribuir-escola', { replace: true });
          });
          return;
        }
        break;
      case 'professor':
        defaultRoute = '/professor/dashboard';
        break;
      default:
        logger.error('Unknown user role', { role: user.role });
        startTransition(() => {
          navigate('/login', { replace: true });
        });
        return;
    }

    // Se estamos na rota raiz, redirecionar para a rota padrão
    if (location.pathname === '/') {
      logger.info('Redirecting from root to default route', { defaultRoute });
      startTransition(() => {
        navigate(defaultRoute, { replace: true });
      });
    }
  }, [user, isLoading, isPendingTotp, location.pathname, navigate]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return null;
}

// Componente para proteção de rotas
function ProtectedRoute({ children, allowedRoles }: { 
  children: React.ReactNode; 
  allowedRoles?: ('super_admin' | 'diretor' | 'coordenador' | 'professor')[];
}) {
  const { user, isLoading, isAuthenticated, isPendingTotp } = useUnifiedAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 🆕 Se TOTP está pendente, redirecionar para login
  if (isPendingTotp) {
    logger.info('🔐 TOTP pending - redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthenticated || !user) {
    logger.warn('Unauthenticated access attempt', { path: location.pathname });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o role do usuário tem permissão para acessar a rota
  if (allowedRoles && !allowedRoles.includes(user.role as 'super_admin' | 'diretor' | 'coordenador' | 'professor')) {
    logger.warn('Unauthorized access attempt', { 
      userRole: user.role, 
      allowedRoles, 
      path: location.pathname 
    });
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Main Layout Component
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="main-content">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

// Main App Component
function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/primeiro-acesso" element={<FirstAccess />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      {/* Debug route for 401 reproduction */}
      <Route path="/debug-401" element={<Debug401 />} />

      {/* Root Route - Role-based redirect */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes (Super Admin only) */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Index />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/schools" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Schools />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Users />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Settings />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/analytics" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Analytics />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/security" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <SecurityMonitoring />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/bot" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <BotConfig />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/context" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <ContextManagement />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/management" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <AdminManagement />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/discord" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <DiscordManagement />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Rotas adicionais para super admin */}
      <Route 
        path="/admin/classes" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Classes />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/students" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Students />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/subjects" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Subjects />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/contents" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Contents />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/tags" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Tags />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/ocr" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <OCRVision />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/teachers" 
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <TeacherManagement />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* School Routes (Diretores and Coordenadores) */}
      <Route 
        path="/escola/:schoolId" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Index />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/classes" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Classes />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/students" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Students />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/subjects" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Subjects />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/contents" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Contents />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/tags" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <Tags />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/ocr" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <OCRVision />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/settings" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <Settings />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/analytics" 
        element={
          <ProtectedRoute allowedRoles={['diretor']}>
            <MainLayout>
              <SafeRouteWrapper>
                <Analytics />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/bot" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <BotConfig />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/context" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <ContextManagement />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/teachers" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <TeacherManagement />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Professor Routes */}
      <Route 
        path="/professor/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['professor']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <ProfessorDashboard />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Shared Routes (All authenticated users) */}
      <Route 
        path="/help" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <SafeRouteWrapper>
                <Help />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/admin/help" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <SafeRouteWrapper>
                <Help />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/escola/:schoolId/help" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <Help />
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* School assignment route for users without school_id */}
      <Route 
        path="/atribuir-escola" 
        element={
          <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
            <MainLayout>
              <SafeRouteWrapper>
                <LazyWrapper>
                  <SchoolAssignment />
                </LazyWrapper>
              </SafeRouteWrapper>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
            <p className="text-muted-foreground mt-2">Página não encontrada</p>
          </div>
        </div>
      } />
    </Routes>
  );
}

// ================================================================
// MAIN APP EXPORT
// ================================================================

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="connect-ai-theme">
            <Router>
              <UnifiedAuthProvider>
                <AutoLogoutProvider>
                  <AppProvider>
                    <NotificationProvider>
                      <AppContent />
                      <Toaster />
                    </NotificationProvider>
                  </AppProvider>
                </AutoLogoutProvider>
              </UnifiedAuthProvider>
            </Router>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;