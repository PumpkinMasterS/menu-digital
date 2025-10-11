import { useState, useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { DeliveryAreasManager } from '@/components/admin/DeliveryAreasManager'
import { 
  ArrowLeft, 
  ChevronRight, 
  Settings, 
  MapPin, 
  Store, 
  Image, 
  Clock,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Star,
  Users,
  Save,
  Upload,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface Restaurant {
  id: string
  name: string
  display_name?: string
  description?: string
  address: string
  phone?: string
  email?: string
  cuisine_type?: string
  image_url?: string
  banner_url?: string
  is_active: boolean
  is_open: boolean
  minimum_order?: number
  delivery_fee?: number
  delivery_time_min?: number
  delivery_time_max?: number
  rating?: number
  business_hours?: any
  social_media?: any
  features?: string[]
  payment_methods?: string[]
  marketing_description?: string
  seo_keywords?: string
  latitude?: number
  longitude?: number
}

export default function RestaurantSettings() {
  const { user, profile } = useAuth()
  const params = useParams<{ restaurantId?: string; slug?: string }>()
  const restaurantParam = params.restaurantId || params.slug
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Restaurant>>({})

  // Check permissions
  if (!user || !profile) {
    return <Navigate to="/auth" replace />
  }

  if (!['platform_owner', 'super_admin'].includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  useEffect(() => {
    if (restaurantParam) {
      fetchRestaurant()
    }
  }, [restaurantParam])

  const fetchRestaurant = async () => {
    try {
      let query = supabase.from('restaurants').select('*')
      
      // Check if parameter is a UUID or slug
      if (restaurantParam) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantParam)
        if (isUUID) {
          query = query.eq('id', restaurantParam)
        } else {
          query = query.eq('slug', restaurantParam)
        }
      }

      const { data, error } = await query.single()

      if (error) throw error
      setRestaurant(data)
      setFormData(data)
    } catch (error) {
      console.error('Erro ao buscar restaurante:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do restaurante",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!restaurant) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurants')
        .update(formData)
        .eq('id', restaurant.id)

      if (error) throw error

      setRestaurant({ ...restaurant, ...formData })
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso!"
      })
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Restaurant, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = async (file: File, type: 'image' | 'banner') => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurant?.id}_${type}_${Date.now()}.${fileExt}`
      const filePath = `restaurants/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      const field = type === 'image' ? 'image_url' : 'banner_url'
      handleInputChange(field, urlData.publicUrl)

      toast({
        title: "Sucesso",
        description: `${type === 'image' ? 'Logo' : 'Banner'} carregado com sucesso!`
      })
    } catch (error) {
      console.error('Erro no upload:', error)
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar configurações...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Restaurante não encontrado
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center text-sm text-gray-600">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span>Restaurantes</span>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="font-medium text-gray-900">{restaurant.name}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                {restaurant.is_active ? "Ativo" : "Inativo"}
              </Badge>
              
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Restaurant Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {restaurant.image_url ? (
                    <img src={restaurant.image_url} alt={restaurant.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {restaurant.address}
                  </CardDescription>
                  <div className="flex items-center space-x-4 mt-2">
                    {restaurant.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">{restaurant.rating}</span>
                      </div>
                    )}
                    <Badge variant={restaurant.is_open ? "default" : "secondary"}>
                      {restaurant.is_open ? "Aberto" : "Fechado"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Áreas de Entrega
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center">
                <Image className="h-4 w-4 mr-2" />
                Imagens
              </TabsTrigger>
              <TabsTrigger value="hours" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Horários
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Avançado
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>
                    Configure as informações principais do restaurante
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Restaurante</Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="display_name">Nome de Exibição</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name || ''}
                        onChange={(e) => handleInputChange('display_name', e.target.value)}
                        placeholder="Nome que aparece para os clientes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+351 912 345 678"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="cuisine_type">Tipo de Cozinha</Label>
                      <Input
                        id="cuisine_type"
                        value={formData.cuisine_type || ''}
                        onChange={(e) => handleInputChange('cuisine_type', e.target.value)}
                        placeholder="Ex: Portuguesa, Italiana, Asiática"
                      />
                    </div>

                    <div>
                      <Label htmlFor="minimum_order">Encomenda Mínima (€)</Label>
                      <Input
                        id="minimum_order"
                        type="number"
                        step="0.01"
                        value={formData.minimum_order || ''}
                        onChange={(e) => handleInputChange('minimum_order', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery_fee">Taxa de Entrega (€)</Label>
                      <Input
                        id="delivery_fee"
                        type="number"
                        step="0.01"
                        value={formData.delivery_fee || ''}
                        onChange={(e) => handleInputChange('delivery_fee', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Morada</Label>
                    <Input
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Descrição do restaurante..."
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_active">Restaurante Ativo</Label>
                      <p className="text-sm text-gray-500">
                        Se desativado, o restaurante não aparecerá na aplicação
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active || false}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_open">Restaurante Aberto</Label>
                      <p className="text-sm text-gray-500">
                        Se fechado, os clientes não poderão fazer encomendas
                      </p>
                    </div>
                    <Switch
                      id="is_open"
                      checked={formData.is_open || false}
                      onCheckedChange={(checked) => handleInputChange('is_open', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Delivery Areas Tab */}
            <TabsContent value="delivery" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Áreas de Entrega</CardTitle>
                  <CardDescription>
                    Configure as zonas onde o restaurante faz entregas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DeliveryAreasManager restaurantId={restaurant.id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Imagens do Restaurante</CardTitle>
                  <CardDescription>
                    Faça upload do logo e banner do restaurante
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <Label>Logo do Restaurante</Label>
                    <div className="mt-2 flex items-center space-x-4">
                      <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Store className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'image')
                          }}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label htmlFor="logo-upload">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              Carregar Logo
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Recomendado: 200x200px, PNG ou JPG
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Banner Upload */}
                  <div>
                    <Label>Banner do Restaurante</Label>
                    <div className="mt-2">
                      <div className="h-32 w-full bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {formData.banner_url ? (
                          <img src={formData.banner_url} alt="Banner" className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <Image className="h-8 w-8 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">Sem banner</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'banner')
                          }}
                          className="hidden"
                          id="banner-upload"
                        />
                        <label htmlFor="banner-upload">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              Carregar Banner
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Recomendado: 1200x400px, PNG ou JPG
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hours Tab */}
            <TabsContent value="hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Horários de Funcionamento</CardTitle>
                  <CardDescription>
                    Configure os horários de abertura e entrega
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery_time_min">Tempo Mínimo de Entrega (min)</Label>
                      <Input
                        id="delivery_time_min"
                        type="number"
                        value={formData.delivery_time_min || ''}
                        onChange={(e) => handleInputChange('delivery_time_min', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery_time_max">Tempo Máximo de Entrega (min)</Label>
                      <Input
                        id="delivery_time_max"
                        type="number"
                        value={formData.delivery_time_max || ''}
                        onChange={(e) => handleInputChange('delivery_time_max', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Os horários detalhados por dia da semana podem ser configurados numa versão futura.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Avançadas</CardTitle>
                  <CardDescription>
                    Configurações técnicas e de marketing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="marketing_description">Descrição de Marketing</Label>
                    <Textarea
                      id="marketing_description"
                      value={formData.marketing_description || ''}
                      onChange={(e) => handleInputChange('marketing_description', e.target.value)}
                      placeholder="Descrição promocional para usar em campanhas..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="seo_keywords">Palavras-chave SEO</Label>
                    <Input
                      id="seo_keywords"
                      value={formData.seo_keywords || ''}
                      onChange={(e) => handleInputChange('seo_keywords', e.target.value)}
                      placeholder="comida portuguesa, lisboa, entrega rápida"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || null)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || null)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 