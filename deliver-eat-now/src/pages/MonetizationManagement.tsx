import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Star,
  CreditCard,
  Building,
  Users,
  Calendar,
  Package,
  AlertTriangle,
  Plus,
  Edit,
  Eye,
  Percent
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Feature {
  id: string
  name: string
  description: string
  feature_code: string
  feature_type: string
  monthly_price: number
  setup_fee: number
  is_active: boolean
  is_global: boolean
}

interface CommissionConfig {
  id?: string
  super_admin_percent: number
  platform_owner_percent: number
  driver_percent: number
  driver_fixed_amount: number
  payment_cycle: string
}

interface PaymentSplit {
  id: string
  order_id: string
  restaurant_id: string
  total_order_amount: number
  restaurant_amount: number
  super_admin_amount: number
  platform_owner_amount: number
  driver_amount: number
  is_paid: boolean
  created_at: string
  restaurants?: { name: string }
}

const MonetizationManagement = () => {
  const { user, profile, loading } = useAuth()
  const [features, setFeatures] = useState<Feature[]>([])
  const [globalCommissionConfig, setGlobalCommissionConfig] = useState<CommissionConfig | null>(null)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [restaurantCommissions, setRestaurantCommissions] = useState<any[]>([])
  
  // Form states
  const [editingGlobalCommission, setEditingGlobalCommission] = useState(false)
  const [newFeature, setNewFeature] = useState({
    name: '',
    description: '',
    feature_code: '',
    feature_type: 'advanced',
    monthly_price: 0,
    setup_fee: 0
  })

  // Redirect if not authorized
  if (!loading && (!user || !['platform_owner', 'super_admin'].includes(profile?.role))) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user && ['platform_owner', 'super_admin'].includes(profile?.role)) {
      fetchFeatures()
      fetchGlobalCommissionConfig()
      fetchPaymentSplits()
      fetchRestaurants()
      fetchRestaurantCommissions()
    }
  }, [user, profile])

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeatures(data || [])
    } catch (error) {
      console.error('Error fetching features:', error)
    }
  }

  const fetchGlobalCommissionConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('global_commission_defaults')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error
      setGlobalCommissionConfig(data)
    } catch (error) {
      console.error('Error fetching global commission config:', error)
    }
  }

  const fetchPaymentSplits = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_splits')
        .select(`
          *,
          restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setPaymentSplits(data || [])
    } catch (error) {
      console.error('Error fetching payment splits:', error)
    }
  }

  const fetchRestaurants = async () => {
    try {
      let query = supabase.from('restaurants').select('*')
      
      // If super admin, only show restaurants from their organization
      if (profile?.role === 'super_admin') {
        query = query.eq('organization_id', profile.organization_id)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Error fetching restaurants:', error)
    }
  }

  const fetchRestaurantCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_config')
        .select(`
          *,
          restaurants(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRestaurantCommissions(data || [])
    } catch (error) {
      console.error('Error fetching restaurant commissions:', error)
    }
  }

  const updateGlobalCommissionConfig = async (config: Partial<CommissionConfig>) => {
    try {
      const { error } = await supabase
        .from('global_commission_defaults')
        .update({
          ...config,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', globalCommissionConfig?.id)

      if (error) throw error

      toast({
        title: "Configuração Atualizada",
        description: "Configuração global de comissões atualizada com sucesso"
      })

      fetchGlobalCommissionConfig()
      setEditingGlobalCommission(false)
    } catch (error) {
      console.error('Error updating global commission config:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração de comissões",
        variant: "destructive"
      })
    }
  }

  const createFeature = async () => {
    try {
      const { error } = await supabase
        .from('features')
        .insert([{
          ...newFeature,
          feature_code: newFeature.feature_code || newFeature.name.toLowerCase().replace(/\s+/g, '_')
        }])

      if (error) throw error

      toast({
        title: "Feature Criada",
        description: `Feature "${newFeature.name}" criada com sucesso`
      })

      setNewFeature({
        name: '',
        description: '',
        feature_code: '',
        feature_type: 'advanced',
        monthly_price: 0,
        setup_fee: 0
      })

      fetchFeatures()
    } catch (error) {
      console.error('Error creating feature:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar feature",
        variant: "destructive"
      })
    }
  }

  const toggleFeatureStatus = async (featureId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('features')
        .update({ is_active: isActive })
        .eq('id', featureId)

      if (error) throw error

      toast({
        title: "Status Atualizado",
        description: `Feature ${isActive ? 'ativada' : 'desativada'} com sucesso`
      })

      fetchFeatures()
    } catch (error) {
      console.error('Error toggling feature status:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da feature",
        variant: "destructive"
      })
    }
  }

  const setRestaurantCommission = async (restaurantId: string, commissionData: Partial<CommissionConfig>) => {
    try {
      const { error } = await supabase
        .from('commission_config')
        .upsert({
          restaurant_id: restaurantId,
          ...commissionData,
          created_by: user?.id,
          is_active: true
        })

      if (error) throw error

      toast({
        title: "Comissão Configurada",
        description: "Comissão do restaurante configurada com sucesso"
      })

      fetchRestaurantCommissions()
    } catch (error) {
      console.error('Error setting restaurant commission:', error)
      toast({
        title: "Erro",
        description: "Erro ao configurar comissão do restaurante",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const totalRevenue = paymentSplits.reduce((sum, split) => sum + split.total_order_amount, 0)
  const totalPlatformCommission = paymentSplits.reduce((sum, split) => sum + split.platform_owner_amount, 0)
  const totalSuperAdminCommission = paymentSplits.reduce((sum, split) => sum + split.super_admin_amount, 0)
  const unpaidSplits = paymentSplits.filter(split => !split.is_paid).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <DollarSign className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gestão de Monetização</h1>
                <p className="text-sm text-gray-500">
                  {profile?.role === 'platform_owner' ? 'Controlo Total' : 'Gestão Regional'}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {profile?.role === 'platform_owner' ? 'Platform Owner' : 'Super Admin'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">€{totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Últimos 50 pedidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Plataforma</CardTitle>
              <Percent className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">€{totalPlatformCommission.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {globalCommissionConfig?.platform_owner_percent}% atual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Regional</CardTitle>
              <Building className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">€{totalSuperAdminCommission.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Super Admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unpaidSplits}</div>
              <p className="text-xs text-gray-500 mt-1">A processar</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="commissions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
            <TabsTrigger value="features">Features Premium</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Global Commission Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Configuração Global</span>
                  </CardTitle>
                  <CardDescription>
                    Configurações padrão de comissão para toda a plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {globalCommissionConfig && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Super Admin %</Label>
                          <Input
                            type="number"
                            value={globalCommissionConfig.super_admin_percent}
                            onChange={(e) => setGlobalCommissionConfig({
                              ...globalCommissionConfig,
                              super_admin_percent: parseFloat(e.target.value)
                            })}
                            disabled={!editingGlobalCommission}
                            min="0"
                            max="50"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label>Platform Owner % (1-5%)</Label>
                          <Input
                            type="number"
                            value={globalCommissionConfig.platform_owner_percent}
                            onChange={(e) => setGlobalCommissionConfig({
                              ...globalCommissionConfig,
                              platform_owner_percent: parseFloat(e.target.value)
                            })}
                            disabled={!editingGlobalCommission}
                            min="1"
                            max="5"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label>Driver % (Opcional)</Label>
                          <Input
                            type="number"
                            value={globalCommissionConfig.driver_percent}
                            onChange={(e) => setGlobalCommissionConfig({
                              ...globalCommissionConfig,
                              driver_percent: parseFloat(e.target.value)
                            })}
                            disabled={!editingGlobalCommission}
                            min="0"
                            max="20"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label>Driver Valor Fixo (€)</Label>
                          <Input
                            type="number"
                            value={globalCommissionConfig.driver_fixed_amount}
                            onChange={(e) => setGlobalCommissionConfig({
                              ...globalCommissionConfig,
                              driver_fixed_amount: parseFloat(e.target.value)
                            })}
                            disabled={!editingGlobalCommission}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Ciclo de Pagamento</Label>
                        <Select
                          value={globalCommissionConfig.payment_cycle}
                          onValueChange={(value) => setGlobalCommissionConfig({
                            ...globalCommissionConfig,
                            payment_cycle: value as any
                          })}
                          disabled={!editingGlobalCommission}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="quinzenal">Quinzenal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex space-x-2">
                        {editingGlobalCommission ? (
                          <>
                            <Button onClick={() => updateGlobalCommissionConfig(globalCommissionConfig)}>
                              Guardar
                            </Button>
                            <Button variant="outline" onClick={() => setEditingGlobalCommission(false)}>
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => setEditingGlobalCommission(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Restaurant-specific Commissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>Comissões por Restaurante</span>
                  </CardTitle>
                  <CardDescription>
                    Configure comissões específicas para restaurantes individuais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Selecionar Restaurante</Label>
                    <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher restaurante" />
                      </SelectTrigger>
                      <SelectContent>
                        {restaurants.map((restaurant) => (
                          <SelectItem key={restaurant.id} value={restaurant.id}>
                            {restaurant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRestaurant && (
                    <RestaurantCommissionForm 
                      restaurantId={selectedRestaurant}
                      onSave={setRestaurantCommission}
                      globalDefaults={globalCommissionConfig}
                    />
                  )}

                  {/* List of existing restaurant commissions */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Configurações Existentes</h4>
                    {restaurantCommissions.map((config) => (
                      <div key={config.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{config.restaurants?.name}</span>
                          <div className="text-sm text-gray-600">
                            Super Admin: {config.super_admin_percent}% | 
                            Platform: {config.platform_owner_percent}%
                          </div>
                        </div>
                        <Badge variant="secondary">{config.payment_cycle}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Features Premium</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Feature
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Feature Premium</DialogTitle>
                    <DialogDescription>
                      Adicione uma nova feature ao sistema pay-per-feature
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={newFeature.name}
                        onChange={(e) => setNewFeature({...newFeature, name: e.target.value})}
                        placeholder="Nome da feature"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newFeature.description}
                        onChange={(e) => setNewFeature({...newFeature, description: e.target.value})}
                        placeholder="Descrição da feature"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Preço Mensal (€)</Label>
                        <Input
                          type="number"
                          value={newFeature.monthly_price}
                          onChange={(e) => setNewFeature({...newFeature, monthly_price: parseFloat(e.target.value)})}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Taxa de Setup (€)</Label>
                        <Input
                          type="number"
                          value={newFeature.setup_fee}
                          onChange={(e) => setNewFeature({...newFeature, setup_fee: parseFloat(e.target.value)})}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={newFeature.feature_type}
                        onValueChange={(value) => setNewFeature({...newFeature, feature_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment">Pagamento</SelectItem>
                          <SelectItem value="subscription">Subscrição</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="mobile_app">App Mobile</SelectItem>
                          <SelectItem value="advanced">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createFeature} className="w-full">
                      Criar Feature
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{feature.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {feature.feature_type}
                        </Badge>
                      </div>
                      <Switch
                        checked={feature.is_active}
                        onCheckedChange={(checked) => toggleFeatureStatus(feature.id, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Preço Mensal:</span>
                        <span className="font-medium">€{feature.monthly_price}</span>
                      </div>
                      {feature.setup_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Taxa Setup:</span>
                          <span className="font-medium">€{feature.setup_fee}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm">Status:</span>
                        <Badge variant={feature.is_active ? "default" : "secondary"}>
                          {feature.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-2xl font-bold">Histórico de Pagamentos</h2>
            
            <div className="space-y-4">
              {paymentSplits.map((split) => (
                <Card key={split.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="font-medium">{split.restaurants?.name}</p>
                        <p className="text-sm text-gray-600">
                          Pedido #{split.order_id.slice(-8)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">€{split.total_order_amount}</p>
                        <p className="text-sm text-gray-600">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">€{split.restaurant_amount}</p>
                        <p className="text-sm text-gray-600">Restaurante</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">€{split.super_admin_amount}</p>
                        <p className="text-sm text-gray-600">Super Admin</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">€{split.platform_owner_amount}</p>
                        <p className="text-sm text-gray-600">Platform</p>
                      </div>
                      <div className="text-center">
                        <Badge variant={split.is_paid ? "default" : "secondary"}>
                          {split.is_paid ? "Pago" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Analytics Financeiros</h2>
            
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Dashboard de analytics avançados em desenvolvimento. 
                Em breve: gráficos de receita, comissões por período, performance por restaurante.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Ciclo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">€{totalRevenue.toFixed(2)}</div>
                  <p className="text-sm text-gray-600 mt-2">Último ciclo de pagamento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comissão Média</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {globalCommissionConfig?.platform_owner_percent}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Platform Owner</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Restaurantes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{restaurants.length}</div>
                  <p className="text-sm text-gray-600 mt-2">Com comissões configuradas</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Component for restaurant-specific commission form
const RestaurantCommissionForm = ({ 
  restaurantId, 
  onSave, 
  globalDefaults 
}: { 
  restaurantId: string
  onSave: (restaurantId: string, data: any) => void
  globalDefaults: any 
}) => {
  const [formData, setFormData] = useState({
    super_admin_percent: globalDefaults?.super_admin_percent || 15,
    platform_owner_percent: globalDefaults?.platform_owner_percent || 1,
    driver_percent: globalDefaults?.driver_percent || 0,
    driver_fixed_amount: globalDefaults?.driver_fixed_amount || 3,
    payment_cycle: globalDefaults?.payment_cycle || 'semanal'
  })

  const handleSave = () => {
    onSave(restaurantId, formData)
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium">Configuração Específica</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Super Admin %</Label>
          <Input
            type="number"
            value={formData.super_admin_percent}
            onChange={(e) => setFormData({...formData, super_admin_percent: parseFloat(e.target.value)})}
            min="0"
            max="50"
            step="0.01"
          />
        </div>
        <div>
          <Label>Platform Owner % (1-5%)</Label>
          <Input
            type="number"
            value={formData.platform_owner_percent}
            onChange={(e) => setFormData({...formData, platform_owner_percent: parseFloat(e.target.value)})}
            min="1"
            max="5"
            step="0.01"
          />
        </div>
        <div>
          <Label>Driver %</Label>
          <Input
            type="number"
            value={formData.driver_percent}
            onChange={(e) => setFormData({...formData, driver_percent: parseFloat(e.target.value)})}
            min="0"
            max="20"
            step="0.01"
          />
        </div>
        <div>
          <Label>Driver Fixo (€)</Label>
          <Input
            type="number"
            value={formData.driver_fixed_amount}
            onChange={(e) => setFormData({...formData, driver_fixed_amount: parseFloat(e.target.value)})}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <Label>Ciclo de Pagamento</Label>
        <Select value={formData.payment_cycle} onValueChange={(value) => setFormData({...formData, payment_cycle: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="quinzenal">Quinzenal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} className="w-full">
        Configurar Comissão
      </Button>
    </div>
  )
}

export default MonetizationManagement 