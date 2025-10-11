import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/useAuth'
import { ViewScopeProvider } from '@/hooks/useViewScope'
import { CartProvider } from '@/hooks/useCart'
import Index from '@/pages/Index'
import Auth from '@/pages/Auth'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import ErrorBoundary from '@/components/layout/ErrorBoundary'
import AuthCallback from '@/components/AuthCallback'
import { Suspense, lazy } from 'react'
import OrganizationDashboard from '@/pages/OrganizationDashboard'

// Lazy loading para componentes pesados
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'))
const RestaurantDashboard = lazy(() => import('@/pages/RestaurantDashboard'))
const KitchenDashboard = lazy(() => import('@/pages/KitchenDashboard'))
const DriverDashboard = lazy(() => import('@/pages/DriverDashboard'))
const RestaurantMenu = lazy(() => import('@/pages/RestaurantMenu'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const CheckoutMBWay = lazy(() => import('@/pages/CheckoutMBWay'))
const RegisterRestaurant = lazy(() => import('@/pages/RegisterRestaurant'))
const RegisterSuccess = lazy(() => import('@/pages/RegisterSuccess'))
const OrganizationsPortal = lazy(() => import('@/pages/OrganizationsPortal'))
const OrderTracking = lazy(() => import('@/pages/OrderTracking'))
const SubscriptionManagement = lazy(() => import('@/pages/SubscriptionManagement'))
const Subscriptions = lazy(() => import('@/pages/Subscriptions'))
const SubscriptionSuccess = lazy(() => import('@/pages/SubscriptionSuccess'))
const MonetizationManagement = lazy(() => import('@/pages/MonetizationManagement'))
const ApiDocumentation = lazy(() => import('@/pages/ApiDocumentation'))
const HelpCenter = lazy(() => import('@/pages/HelpCenter'))
const HelpDocumentation = lazy(() => import('@/pages/HelpDocumentation'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const DriverActivation = lazy(() => import('@/pages/DriverActivation'))

// Add the new import
const RestaurantSettings = lazy(() => import('@/pages/RestaurantSettings'))

const queryClient = new QueryClient()

// Loading component para suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
  </div>
)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ViewScopeProvider>
            <CartProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/driver/activate" element={<DriverActivation />} />
                    <Route path="/register-restaurant" element={<RegisterRestaurant />} />
                    <Route path="/register-success" element={<RegisterSuccess />} />
                    <Route path="/restaurant/:id" element={<RestaurantMenu />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/checkout-mbway" element={<CheckoutMBWay />} />
                    <Route path="/order/:orderId" element={<OrderTracking />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/subscriptions/success" element={<SubscriptionSuccess />} />
                    
                    <Route path="/customer" element={
                      <ProtectedRoute requiredRole="customer">
                        <CustomerDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/restaurant-admin" element={
                      <ProtectedRoute requiredRole="restaurant_admin">
                        <RestaurantDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/restaurant-dashboard/:restaurantId" element={
                      <ProtectedRoute requiredRole={["restaurant_admin", "super_admin", "platform_owner"]}>
                        <RestaurantDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/restaurant/:slug/dashboard" element={
                      <ProtectedRoute requiredRole={["restaurant_admin", "super_admin", "platform_owner"]}>
                        <RestaurantDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/subscription-management" element={
                      <ProtectedRoute requiredRole="restaurant_admin">
                        <SubscriptionManagement />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/kitchen" element={
                      <ProtectedRoute requiredRole={["kitchen", "restaurant_admin"]}>
                        <KitchenDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/driver" element={
                      <ProtectedRoute requiredRole="driver">
                        <DriverDashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/platform-owner" element={
                      <ProtectedRoute requiredRole="platform_owner">
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Legacy redirect */}
                            <Route path="/admin" element={<ProtectedRoute requiredRole={["super_admin", "platform_owner"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/restaurant/:restaurantId/settings" element={<ProtectedRoute requiredRole={["super_admin", "platform_owner"]}><RestaurantSettings /></ProtectedRoute>} />
        <Route path="/admin/restaurant/:slug/config" element={<ProtectedRoute requiredRole={["super_admin", "platform_owner"]}><RestaurantSettings /></ProtectedRoute>} />
        <Route path="/restaurant-dashboard" element={<ProtectedRoute requiredRole={["restaurant_admin", "kitchen", "super_admin", "platform_owner"]}><RestaurantDashboard /></ProtectedRoute>} />
                    
                    <Route path="/monetization" element={
                      <ProtectedRoute requiredRole={["platform_owner", "super_admin"]}>
                        <MonetizationManagement />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/organizations" element={
                      <ProtectedRoute requiredRole="platform_owner">
                        <OrganizationsPortal />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/api-docs" element={
                      <ProtectedRoute requiredRole="super_admin">
                        <ApiDocumentation />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/help" element={<HelpCenter />} />
                    <Route path="/help/docs" element={<HelpDocumentation />} />
                    

                    
                            <Route path="/organization-dashboard" element={
          <ProtectedRoute requiredRole={["super_admin", "platform_owner"]}>
            <OrganizationDashboard />
          </ProtectedRoute>
        } />
        <Route path="/organization/:id" element={
          <ProtectedRoute requiredRole={["super_admin", "platform_owner"]}>
            <OrganizationDashboard />
          </ProtectedRoute>
        } />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </CartProvider>
          </ViewScopeProvider>
        </AuthProvider>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
