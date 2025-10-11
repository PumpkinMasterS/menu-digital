import React, { useEffect, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/components/ui/notification-system";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/Sidebar";
import { logger } from './lib/logger';
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TOTPAlert } from "@/components/settings/TOTPAlert";

// Lazy loading para páginas mais fluidas
import { lazy, Suspense } from 'react';

// Páginas críticas (carregamento imediato)
import Login from "@/pages/Login";
import LoginModern from "@/pages/LoginModern";
import FirstAccess from "@/pages/FirstAccess";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Páginas não-críticas (lazy loading)
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

// Debug components for environment check
const EnvironmentCheck = lazy(() => import("@/components/debug/EnvironmentCheck"));
const ViteCheck = lazy(() => import("@/components/debug/ViteCheck"));

// QueryClient otimizado para prevenir tela branca
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true, // Revalidar quando voltar ao foco
      refetchOnReconnect: true, // Revalidar quando reconectar
      refetchOnMount: true, // Revalidar ao montar
      // Não pausar queries quando página oculta
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
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
  </div>
);

// Loading suave para lazy loading
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center p-8 min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
    </div>
  </div>
);

// SafeRouteWrapper com Suspense para páginas lazy
const SafeRouteWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoadingFallback />}>
    <div className="fade-in page-transition">
      {children}
    </div>
  </Suspense>
);

// Componente para redirecionamento baseado em role
function RoleBasedRedirect() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !user) return;

    // Usar startTransition para navegação não urgente
    startTransition(() => {
      logger.info('Processing role-based redirect', { 
        role: user.role, 
        currentPath: location.pathname,
        schoolSlug: user.schoolSlug 
      });

      // Definir rota padrão baseada no role
      let defaultRoute = '';
      
      switch (user.role) {
        case 'super_admin':
          defaultRoute = '/admin';
          break;
        case 'diretor':
        case 'coordenador':
          if (user.schoolSlug) {
            defaultRoute = `/escola/${user.schoolSlug}`;
          } else {
            logger.error('School user without schoolSlug', { user });
            navigate('/login', { replace: true });
            return;
          }
          break;
        default:
          logger.error('Unknown user role', { role: user.role });
          navigate('/login', { replace: true });
          return;
      }

      // Se estamos na rota raiz, redirecionar para a rota padrão
      if (location.pathname === '/') {
        logger.info('Redirecting from root to default route', { defaultRoute });
        navigate(defaultRoute, { replace: true });
      }
    });
  }, [user, isLoading, location.pathname, navigate]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return null;
}

// Componente para proteção de rotas
function ProtectedRoute({ children, allowedRoles }: { 
  children: React.ReactNode; 
  allowedRoles?: ('super_admin' | 'diretor' | 'coordenador')[];
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    logger.warn('Unauthenticated access attempt', { path: location.pathname });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o role do usuário tem permissão para acessar a rota
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    logger.warn('Unauthorized access attempt', { 
      userRole: user.role, 
      allowedRoles, 
      path: location.pathname 
    });
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Main Layout Component - OTIMIZADO com espaçamento mínimo global
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="main-content">
          {children}
        </main>
        <TOTPAlert />
      </div>
    </SidebarProvider>
  );
};

// Main App Component
function AppContent() {
  // Auto-prefetch desabilitado temporariamente para debug
  // useAutoPrefetch();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/login-modern" element={<LoginModern />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/primeiro-acesso" element={<FirstAccess />} />
      
      {/* Debug Routes */}
      <Route path="/debug/environment" element={
        <SafeRouteWrapper>
          <EnvironmentCheck />
        </SafeRouteWrapper>
      } />
      <Route path="/debug/vite" element={
        <SafeRouteWrapper>
          <ViteCheck />
        </SafeRouteWrapper>
      } />

      {/* Root Route - Role-based redirect */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        } 
      />

      {/* Admin Routes - Super Admin Only */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Index />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Bot Config - APENAS SUPER_ADMIN */}
      <Route path="/admin/bot-config" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SafeRouteWrapper>
            <BotConfig />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />

      {/* Context Management - APENAS SUPER_ADMIN */}
      <Route path="/admin/context-management" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SafeRouteWrapper>
            <ContextManagement />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/schools" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Schools />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Users />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/classes" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Classes />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/students" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SafeRouteWrapper>
            <Students />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/subjects" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SafeRouteWrapper>
            <Subjects />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/contents" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SafeRouteWrapper>
            <Contents />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/settings" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SafeRouteWrapper>
            <Settings />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/tags" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Tags />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/analytics" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Analytics />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/management" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <AdminManagement />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/security" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <SecurityMonitoring />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/help" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Help />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/ocr-vision" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout>
            <SafeRouteWrapper>
              <OCRVision />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* School Routes - Director and Coordinator */}
      <Route path="/escola/:schoolSlug" element={
        <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Index />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/escola/:schoolSlug/classes" element={
        <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Classes />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/escola/:schoolSlug/students" element={
        <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
          <SafeRouteWrapper>
            <Students />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/escola/:schoolSlug/subjects" element={
        <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
          <SafeRouteWrapper>
            <Subjects />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/escola/:schoolSlug/contents" element={
        <ProtectedRoute allowedRoles={['diretor', 'coordenador']}>
          <SafeRouteWrapper>
            <Contents />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      {/* Settings - Director only for schools */}
      <Route path="/escola/:schoolSlug/settings" element={
        <ProtectedRoute allowedRoles={['diretor']}>
          <SafeRouteWrapper>
            <Settings />
          </SafeRouteWrapper>
        </ProtectedRoute>
      } />
      
      {/* Analytics - Director only */}
      <Route path="/escola/:schoolSlug/analytics" element={
        <ProtectedRoute allowedRoles={['diretor']}>
          <MainLayout>
            <SafeRouteWrapper>
              <Analytics />
            </SafeRouteWrapper>
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary onError={(error) => {
      // Log erro crítico que pode causar tela branca
      logger.error('Critical app error caught by boundary', { error });
    }}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <AppProvider>
                <NotificationProvider>
                  <AppContent />
                  <Toaster />
                </NotificationProvider>
              </AppProvider>
            </Router>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
