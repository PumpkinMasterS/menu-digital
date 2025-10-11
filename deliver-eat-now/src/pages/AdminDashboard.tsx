import { useEffect, useState } from 'react'
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScoping } from '@/hooks/useScoping'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Shield, Users, Building, Truck, TrendingUp, Building2, BarChart3, LogOut, Store, Settings, Menu, ChefHat, BarChart, HelpCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import UserManagementDialog from '@/components/admin/UserManagementDialog'
import { UserRoleManagement } from '@/components/admin/UserRoleManagement'
import ModernSeedData from '@/components/data/ModernSeedData'
import DriverManagement from '@/components/admin/DriverManagement'


const AdminDashboard = () => {
  const { user, profile, loading, signOut } = useAuth()
  const { getRestaurantFilter, getUserFilter, getOrderFilter, canSeeAll, currentRole } = useScoping()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Detectar se estamos a ver uma organização específica
  const viewingOrgId = searchParams.get('org_id')
  const viewingOrgName = searchParams.get('org_name')

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalDrivers: 0,
    totalOrders: 0,
    todayOrders: 0,
    revenue: 0
  })
  const [users, setUsers] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (user && profile) {
      fetchStats()
      fetchUsers()
      // fetchDrivers() // Temporarily disabled to test
      
      if (viewingOrgId) {
        // If viewing specific organization, fetch its restaurants
        fetchRestaurants()
      } else {
        // If in general dashboard, fetch organizations
        fetchOrganizations()
      }
    }
  }, [user, profile, viewingOrgId]) // Atualizar quando org_id mudar

  // Redirect if not authenticated or not admin/platform_owner
  // Wait for both auth loading AND profile to be loaded
  if (!loading && user && profile) {
    // Profile is loaded, now check permissions
    if (!['super_admin', 'platform_owner'].includes(profile.role)) {
      return <Navigate to="/auth" replace />
    }
  } else if (!loading && !user) {
    // Auth loading is done but no user found
    return <Navigate to="/auth" replace />
  } else if (!loading && user && !profile) {
    // User exists but profile not loaded yet - show loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      await fetchStatsLegacy()
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({
        totalUsers: 0,
        totalRestaurants: 0,
        totalDrivers: 0,
        totalOrders: 0,
        todayOrders: 0,
        revenue: 0
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchStatsLegacy = async () => {
    try {
      // Consolidated parallel queries for better performance
      const queries = []
      
      // User count query with filters
      let userQuery = supabase.from('profiles').select('*', { count: 'exact', head: true })
      if (viewingOrgId) {
        userQuery = userQuery.eq('organization_id', viewingOrgId)
      }
      queries.push(userQuery)

      // Restaurant count query with filters
      let restaurantQuery = supabase.from('restaurants').select('*', { count: 'exact', head: true })
      if (viewingOrgId) {
        restaurantQuery = restaurantQuery.eq('organization_id', viewingOrgId)
      }
      queries.push(restaurantQuery)

      // Order count and revenue query
      let orderQuery = supabase.from('orders').select(`
        id, total_amount, status, created_at,
        restaurant:restaurants!inner(organization_id)
      `)
      if (viewingOrgId) {
        orderQuery = orderQuery.eq('restaurant.organization_id', viewingOrgId)
      }
      queries.push(orderQuery)

      // Execute all queries in parallel
      const [usersResult, restaurantsResult, ordersResult] = await Promise.all(queries)

      const orders = ordersResult.data || []
      const todayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === new Date().toDateString()
      )
      const deliveredOrders = orders.filter(order => order.status === 'delivered')
      const revenue = deliveredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      setStats({
        totalUsers: usersResult.count || 0,
        totalRestaurants: restaurantsResult.count || 0,
        totalDrivers: 0, // Placeholder - drivers table may not exist
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        revenue: revenue
      })
    } catch (error) {
      console.error('Error fetching legacy stats:', error)
      setStats({
        totalUsers: 0,
        totalRestaurants: 0,
        totalDrivers: 0,
        totalOrders: 0,
        todayOrders: 0,
        revenue: 0
      })
    }
  }

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      // Filter by organization if viewing specific org
      if (viewingOrgId) {
        query = query.eq('organization_id', viewingOrgId)
      } else {
        // Apply scoping filter
        query = getUserFilter(query)
      }
      
      const { data } = await query
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const createOrganization = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string
      const slug = formData.get('slug') as string
      const domain = formData.get('domain') as string
      const billingEmail = formData.get('billing_email') as string
      const tier = formData.get('tier') as string

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          domain: domain || null,
          billing_email: billingEmail,
          subscription_tier: tier,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Organização criada com sucesso"
      })

      setShowCreateForm(false)
      fetchOrganizations()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast({
        title: "Erro", 
        description: error.message || "Não foi possível criar a organização",
        variant: "destructive"
      })
    }
  }

  const toggleOrganizationStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !currentStatus })
        .eq('id', orgId)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: `Organização ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`
      })

      fetchOrganizations()
    } catch (error) {
      console.error('Error toggling organization status:', error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da organização",
        variant: "destructive"
      })
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'pro': return 'bg-blue-100 text-blue-800'
      case 'starter': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout",
        variant: "destructive"
      })
    }
  }

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching drivers:', error)
        setDrivers([])
        return
      }

      setDrivers(data || [])
    } catch (error) {
      console.error('Error in fetchDrivers:', error)
      setDrivers([])
    }
  }

  const createTestOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: 'Organização de Teste',
          description: 'Organização criada para testar o sistema',
          contact_email: 'teste@exemplo.com',
          contact_phone: '+351 123 456 789',
          address: 'Rua de Teste, 123, Lisboa',
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar organização:', error)
        toast({
          title: "Erro",
          description: "Não foi possível criar a organização de teste",
          variant: "destructive"
        })
      } else {
        console.log('✅ Organização criada:', data)
        toast({
          title: "Sucesso",
          description: "Organização de teste criada com sucesso!"
        })
        fetchOrganizations() // Refresh the list
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching organizations:', error)
        return
      }

      const organizationsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          const [restaurantCount, userCount, orderCount] = await Promise.all([
            supabase
              .from('restaurants')
              .select('id', { count: 'exact' })
              .eq('organization_id', org.id)
              .then(({ count }) => count || 0),
            supabase
              .from('profiles')
              .select('id', { count: 'exact' })
              .eq('organization_id', org.id)
              .then(({ count }) => count || 0),
            supabase
              .from('orders')
              .select('id', { count: 'exact' })
              .eq('organization_id', org.id)
              .then(({ count }) => count || 0)
          ])

          return {
            ...org,
            restaurant_count: restaurantCount,
            user_count: userCount,
            order_count: orderCount
          }
        })
      )

      setOrganizations(organizationsWithCounts)
    } catch (error) {
      console.error('Error in fetchOrganizations:', error)
      setOrganizations([])
    }
  }

  const fetchOrganizationsLegacy = async () => {
    try {
      // Get organizations with counts
      const { data: orgsData, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (orgsData) {
        // For each organization, get counts
        const enrichedOrgs = await Promise.all(
          orgsData.map(async (org) => {
            // Get restaurant IDs for this organization first
            const { data: orgRestaurants } = await supabase
              .from('restaurants')
              .select('id')
              .eq('organization_id', org.id)

            const restaurantIds = orgRestaurants?.map(r => r.id) || []

            const [
              { count: restaurantCount },
              { count: userCount },
              { data: ordersData }
            ] = await Promise.all([
              supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
              restaurantIds.length > 0 
                ? supabase.from('orders').select('id, total_amount, status').in('restaurant_id', restaurantIds)
                : Promise.resolve({ data: [] })
            ])

            return {
              ...org,
              _count: {
                restaurants: restaurantCount || 0,
                users: userCount || 0,
                orders: ordersData?.length || 0
              }
            }
          })
        )
        
        setOrganizations(enrichedOrgs)
      }
    } catch (error) {
      console.error('Error fetching organizations legacy:', error)
    }
  }

  const fetchRestaurants = async () => {
    try {
      let query = supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter by organization if viewing specific org
      if (viewingOrgId) {
        query = query.eq('organization_id', viewingOrgId)
      } else {
        // Apply scoping filter for general dashboard
        query = getRestaurantFilter(query)
      }
      
      const { data } = await query
      setRestaurants(data || [])
    } catch (error) {
      console.error('Error fetching restaurants:', error)
    }
  }

  const toggleRestaurantStatus = async (restaurantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: !currentStatus })
        .eq('id', restaurantId)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: `Restaurante ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      })

      fetchRestaurants()
    } catch (error) {
      console.error('Error toggling restaurant status:', error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do restaurante",
        variant: "destructive"
      })
    }
  }



  // Show loading while auth or profile is loading
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-2xl">
        {/* Main Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {viewingOrgId ? decodeURIComponent(viewingOrgName || '') : 'Plataforma DeliverEat'}
                </h1>
                <p className="text-blue-200 text-sm font-medium">
                  {viewingOrgId ? 'Dashboard da Organização' : 'Painel de Administração Global'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {viewingOrgId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                >
                  ← Voltar
                </Button>
              )}
              
              <Link to="/monetization">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg transition-all duration-200">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Monetização
                </Button>
              </Link>
              
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <Users className="h-4 w-4 text-white" />
                  <span className="text-white font-medium text-sm">Super Admin</span>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-red-500/20 hover:border-red-300/30 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Utilizadores</h3>
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-1">{stats.totalUsers}</div>
              <div className="text-xs text-slate-500 font-medium">Total na plataforma</div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-6 border border-emerald-200/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Restaurantes</h3>
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
                  <Building className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-1">{stats.totalRestaurants}</div>
              <div className="text-xs text-slate-500 font-medium">Parceiros ativos</div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl p-6 border border-orange-200/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Motoristas</h3>
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-lg">
                  <Truck className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-1">{stats.totalDrivers}</div>
              <div className="text-xs text-slate-500 font-medium">Fleet disponível</div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-6 border border-purple-200/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Receita</h3>
                <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-1">€{stats.revenue.toFixed(2)}</div>
              <div className="text-xs text-slate-500 font-medium">Revenue total</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl shadow-slate-900/5">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-slate-100/50 rounded-xl p-1 m-4 mb-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                Utilizadores
              </TabsTrigger>
              <TabsTrigger value="organizations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                Organizações
              </TabsTrigger>
              {viewingOrgId && (
                <TabsTrigger value="restaurants" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                  Restaurantes
                </TabsTrigger>
              )}
              <TabsTrigger value="drivers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                Motoristas
              </TabsTrigger>
              <TabsTrigger value="roles" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                Gestão de Roles
              </TabsTrigger>
              <TabsTrigger value="seed-data" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200">
                Dados de Teste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Pedidos Hoje</h3>
                  <div className="text-4xl font-bold text-blue-600 mb-2">{stats.todayOrders}</div>
                  <p className="text-sm text-slate-500 font-medium">
                    {stats.totalOrders} pedidos no total
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Estatísticas Rápidas</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">Taxa de conversão:</span>
                      <span className="text-sm font-bold text-emerald-600">12.3%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">Pedido médio:</span>
                      <span className="text-sm font-bold text-blue-600">€23.50</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">Tempo médio entrega:</span>
                      <span className="text-sm font-bold text-orange-600">32 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Utilizadores</h2>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{stats.totalUsers} total</Badge>
                <UserManagementDialog mode="create" onUserUpdated={() => { fetchStats(); fetchUsers(); }} />
              </div>
            </div>

            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{user.full_name || 'Sem nome'}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                      </div>
                      <Badge variant={user.role === 'customer' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Registado: {new Date(user.created_at).toLocaleDateString('pt-PT')}
                      </span>
                      <div className="flex gap-2">
                        <UserManagementDialog 
                          mode="view" 
                          user={user}
                          onUserUpdated={() => { fetchStats(); fetchUsers(); }} 
                        />
                        <UserManagementDialog 
                          mode="edit" 
                          user={user}
                          onUserUpdated={() => { fetchStats(); fetchUsers(); }} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

            <TabsContent value="organizations" className="space-y-6 p-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Organizações</h2>
                  <p className="text-slate-600">Gerir organizações parceiras da plataforma</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-4 py-2 rounded-full">
                    <span className="text-sm font-semibold text-slate-700">{organizations.length} Organizações</span>
                  </div>
                  <Button 
                    onClick={() => setShowCreateForm(true)} 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    + Nova Organização
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {organizations.map((org) => (
                  <div key={org.id} className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-slate-300/60 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 border-b border-slate-100">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-800 mb-1">{org.name}</h3>
                          <p className="text-slate-500 text-sm font-medium">@{org.slug}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getTierBadgeColor(org.subscription_tier)}`}>
                            {org.subscription_tier}
                          </span>
                          <div className={`h-3 w-3 rounded-full ${org.is_active ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-red-400 shadow-red-400/50'} shadow-lg`}></div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white/60 rounded-xl">
                          <div className="text-2xl font-bold text-emerald-600 mb-1">
                            {org._count?.restaurants || 0}
                          </div>
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Restaurantes</div>
                        </div>
                        <div className="text-center p-3 bg-white/60 rounded-xl">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {org._count?.users || 0}
                          </div>
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Utilizadores</div>
                        </div>
                        <div className="text-center p-3 bg-white/60 rounded-xl">
                          <div className="text-2xl font-bold text-purple-600 mb-1">
                            {org._count?.orders || 0}
                          </div>
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pedidos</div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {org.domain && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Domínio</span>
                          <div className="text-sm font-medium text-slate-700">{org.domain}</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs"
                          onClick={() => {
                            navigate(`/organization/${org.id}`)
                          }}
                        >
                          Aceder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-slate-300"
                          onClick={() => setSelectedOrg(org)}
                        >
                          Gerir
                        </Button>
                        <Button
                          variant={org.is_active ? "destructive" : "default"}
                          size="sm"
                          className="text-xs"
                          onClick={() => toggleOrganizationStatus(org.id, org.is_active)}
                        >
                          {org.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            {/* Create Organization Form */}
            {showCreateForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Nova Organização</CardTitle>
                    <CardDescription>Criar uma nova organização na plataforma</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      createOrganization(new FormData(e.currentTarget))
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Nome da Organização</label>
                        <input id="name" name="name" required placeholder="Ex: Restaurante do João" className="w-full p-2 border rounded-md" />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="slug" className="text-sm font-medium">Slug (URL)</label>
                        <input id="slug" name="slug" required placeholder="ex: restaurante-do-joao" className="w-full p-2 border rounded-md" />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="domain" className="text-sm font-medium">Domínio (opcional)</label>
                        <input id="domain" name="domain" placeholder="ex: restaurantedojoao.com" className="w-full p-2 border rounded-md" />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="billing_email" className="text-sm font-medium">Email de Faturação</label>
                        <input id="billing_email" name="billing_email" type="email" required placeholder="joao@restaurante.com" className="w-full p-2 border rounded-md" />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="tier" className="text-sm font-medium">Plano</label>
                        <select id="tier" name="tier" className="w-full p-2 border rounded-md" required>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                          Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                          Criar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {viewingOrgId && (
            <TabsContent value="restaurants" className="space-y-6 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Restaurantes</h2>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{restaurants.length} total</Badge>
                </div>
              </div>

              <div className="grid gap-4">
                {restaurants.map((restaurant) => (
                  <Card key={restaurant.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                          <CardDescription>{restaurant.address}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={restaurant.is_active ? 'default' : 'secondary'}>
                            {restaurant.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleRestaurantStatus(restaurant.id, restaurant.is_active)}
                          >
                            {restaurant.is_active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                        <div>
                          <span className="text-gray-500">Avaliação:</span>
                          <div className="font-medium">{restaurant.rating || "4.5"} ⭐</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Taxa entrega:</span>
                          <div className="font-medium">€{restaurant.delivery_fee}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Pedido mínimo:</span>
                          <div className="font-medium">€{restaurant.minimum_order}</div>
                        </div>
                      </div>

                      {/* Restaurant Management Actions */}
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-semibold text-slate-700">Management Dashboard</h4>
                          <div className="text-xs text-slate-500">Estilo Uber Eats</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs"
                            onClick={() => {
                              console.log('Navigating to restaurant dashboard:', restaurant.id)
                              console.log('Current user role:', profile?.role)
                              navigate(`/restaurant/${restaurant.slug || restaurant.id}/dashboard?tab=dashboard`)
                            }}
                          >
                            <Store className="h-3 w-3 mr-1" />
                            Dashboard
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-slate-300"
                            onClick={() => {
                              navigate(`/restaurant/${restaurant.slug || restaurant.id}/dashboard?tab=menu`)
                            }}
                          >
                            <Menu className="h-3 w-3 mr-1" />
                            Menu
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-slate-300"
                            onClick={() => {
                              navigate(`/restaurant/${restaurant.slug || restaurant.id}/dashboard?tab=orders`)
                            }}
                          >
                            <ChefHat className="h-3 w-3 mr-1" />
                            Pedidos
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-slate-300"
                            onClick={() => {
                              navigate(`/restaurant/${restaurant.slug || restaurant.id}/dashboard?tab=analytics`)
                            }}
                          >
                            <BarChart className="h-3 w-3 mr-1" />
                            Relatórios
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-emerald-300 border-2 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              navigate(`/admin/restaurant/${restaurant.slug || restaurant.id}/config`)
                            }}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Configurações
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

            <TabsContent value="drivers" className="space-y-6 p-6">
              <DriverManagement />
            </TabsContent>

            <TabsContent value="roles" className="space-y-6 p-6">
              <UserRoleManagement />
            </TabsContent>
            
            {/* Seed Data Tab */}
            <TabsContent value="seed-data" className="space-y-6 p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">🚀 Dados de Teste</h3>
                <p className="text-slate-600">
                  Criar dados realistas para demonstrar todas as funcionalidades da plataforma
                </p>
              </div>
              <ModernSeedData />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
