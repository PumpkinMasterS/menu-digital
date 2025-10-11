import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Store, 
  Users, 
  BarChart3, 
  MapPin, 
  Plus,
  Eye,
  Settings,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
// import CreateRestaurantDialog from '@/components/admin/CreateRestaurantDialog'

interface Restaurant {
  id: string
  name: string
  address: string
  phone: string
  email: string
  is_active: boolean
  created_at: string
  cuisine_type?: string
  delivery_radius?: number
}

interface OrganizationStats {
  total_restaurants: number
  active_restaurants: number
  total_orders_today: number
  total_revenue_today: number
  pending_orders: number
}

const OrganizationDashboard = () => {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const { id: organizationId } = useParams()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [stats, setStats] = useState<OrganizationStats>({
    total_restaurants: 0,
    active_restaurants: 0,
    total_orders_today: 0,
    total_revenue_today: 0,
    pending_orders: 0
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [organizationData, setOrganizationData] = useState<any>(null)

  // Verificar permissões
  useEffect(() => {
    if (!loading && (!user || !profile)) {
      navigate('/auth')
      return
    }

    if (!loading && !['super_admin', 'platform_owner'].includes(profile?.role || '')) {
      navigate('/') // Redirect se não for super_admin ou platform_owner
      return
    }

    // Para super_admin, verificar se tem organization_id ou se foi passado na URL
    if (!loading && profile?.role === 'super_admin' && !profile.organization_id && !organizationId) {
      console.error('Super admin sem organization_id e sem ID na URL')
      navigate('/auth')
      return
    }
  }, [loading, user, profile, navigate, organizationId])

  // Buscar dados da organização
  useEffect(() => {
    const targetOrgId = organizationId || profile?.organization_id
    if (targetOrgId) {
      fetchOrganizationData(targetOrgId)
    }
  }, [organizationId, profile?.organization_id])

  const fetchOrganizationData = async (orgId: string) => {
    try {
      // Buscar dados da organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError) {
        console.error('Error fetching organization:', orgError)
        navigate('/admin')
        return
      }

      setOrganizationData(orgData)

      // Buscar restaurantes da organização
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (restaurantsError) {
        console.error('Error fetching restaurants:', restaurantsError)
      } else {
        setRestaurants(restaurantsData || [])
      }

      // Calcular estatísticas básicas
      const activeRestaurants = restaurantsData?.filter(r => r.is_active).length || 0
      setStats({
        total_restaurants: restaurantsData?.length || 0,
        active_restaurants: activeRestaurants,
        total_orders_today: 0,
        total_revenue_today: 0,
        pending_orders: 0
      })
    } catch (error) {
      console.error('Error in fetchOrganizationData:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleViewRestaurant = async (restaurantId: string) => {
    try {
      // Buscar dados do restaurante para obter slug
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('id', restaurantId)
        .single()
      
      const restaurantIdentifier = restaurantData?.slug || restaurantId
      navigate(`/restaurant/${restaurantIdentifier}/dashboard`)
    } catch (error) {
      // Fallback para ID se erro
      navigate(`/restaurant/${restaurantId}/dashboard`)
    }
  }

  const handleToggleRestaurantStatus = async (restaurantId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: !currentStatus })
      .eq('id', restaurantId)

    if (!error) {
      const targetOrgId = organizationId || profile?.organization_id
      if (targetOrgId) {
        fetchOrganizationData(targetOrgId)
      }
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!profile || !['super_admin', 'platform_owner'].includes(profile.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile?.role === 'platform_owner' && (
              <Button 
                variant="outline"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {organizationData ? `Dashboard - ${organizationData.name}` : 'Dashboard da Organização'}
              </h1>
              <p className="text-gray-600 mt-1">
                Gestão dos restaurantes da organização
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Restaurante
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Restaurantes</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_restaurants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restaurantes Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.active_restaurants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders_today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.total_revenue_today.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_orders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Restaurants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Meus Restaurantes
            </CardTitle>
            <CardDescription>
              Gerir os restaurantes da sua organização/região
            </CardDescription>
          </CardHeader>
          <CardContent>
            {restaurants.length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum restaurante encontrado</h3>
                <p className="text-gray-600 mb-4">Comece criando o seu primeiro restaurante</p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Restaurante
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.map((restaurant) => (
                  <Card key={restaurant.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                        <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                          {restaurant.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span className="text-sm text-gray-600">{restaurant.address}</span>
                      </div>
                      
                      {restaurant.cuisine_type && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Cozinha: {restaurant.cuisine_type}</span>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleViewRestaurant(restaurant.id)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/admin/restaurant/${restaurant.id}/settings`)}
                          title="Configurações do Restaurante"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleToggleRestaurantStatus(restaurant.id, restaurant.is_active)}
                        >
                          {restaurant.is_active ? 'Pausar' : 'Ativar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Restaurant Dialog - TODO: Implementar */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold mb-4">Criar Novo Restaurante</h3>
            <p className="text-gray-600 mb-4">Funcionalidade em desenvolvimento</p>
            <Button onClick={() => setShowCreateDialog(false)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrganizationDashboard