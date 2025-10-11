import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useViewScope } from '@/hooks/useViewScope'
import { supabase } from '@/integrations/supabase/client'
import LayoutWithBreadcrumb from '@/components/layout/LayoutWithBreadcrumb'
import { 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  logo_url?: string
  subscription_tier: string
  is_active: boolean
  created_at: string
  billing_email?: string
  settings: any
  _count?: {
    restaurants: number
    users: number
    orders: number
  }
}

const OrganizationsPortal = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const { enterScope } = useViewScope()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      
      // Get organizations with counts
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          restaurants:restaurants(count),
          profiles:profiles(count),
          orders:orders(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to include counts
      const orgsWithCounts = data?.map(org => ({
        ...org,
        _count: {
          restaurants: org.restaurants?.[0]?.count || 0,
          users: org.profiles?.[0]?.count || 0,
          orders: org.orders?.[0]?.count || 0
        }
      })) || []

      setOrganizations(orgsWithCounts)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as organizações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'pro': return 'bg-blue-100 text-blue-800'
      case 'starter': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <LayoutWithBreadcrumb>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-8 w-8 text-emerald-600" />
                Portal de Organizações
              </h1>
              <p className="text-gray-600 mt-2">
                Gerir todas as organizações na plataforma
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Organização
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar organizações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription>@{org.slug}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTierBadgeColor(org.subscription_tier)}>
                      {org.subscription_tier}
                    </Badge>
                    {org.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {org._count?.restaurants || 0}
                      </div>
                      <div className="text-xs text-gray-500">Restaurantes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {org._count?.users || 0}
                      </div>
                      <div className="text-xs text-gray-500">Utilizadores</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {org._count?.orders || 0}
                      </div>
                      <div className="text-xs text-gray-500">Pedidos</div>
                    </div>
                  </div>

                  {/* Domain */}
                  {org.domain && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Domínio:</span> {org.domain}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // Navegar direto para AdminDashboard dessa organização
                        window.location.href = `/admin?org_id=${org.id}&org_name=${encodeURIComponent(org.name)}`
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Aceder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrg(org)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Gerir
                    </Button>
                    <Button
                      variant={org.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleOrganizationStatus(org.id, org.is_active)}
                    >
                      {org.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Organization Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Nova Organização</CardTitle>
                <CardDescription>
                  Criar uma nova organização na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  createOrganization(new FormData(e.currentTarget))
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Organização</Label>
                    <Input id="name" name="name" required placeholder="Ex: Restaurante do João" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <Input id="slug" name="slug" required placeholder="ex: restaurante-do-joao" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domínio (opcional)</Label>
                    <Input id="domain" name="domain" placeholder="ex: restaurantedojoao.com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="billing_email">Email de Faturação</Label>
                    <Input id="billing_email" name="billing_email" type="email" required placeholder="joao@restaurante.com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tier">Plano</Label>
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

        {/* Organization Details Modal */}
        {selectedOrg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedOrg.name}</CardTitle>
                    <CardDescription>@{selectedOrg.slug}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedOrg(null)}>
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="users">Utilizadores</TabsTrigger>
                    <TabsTrigger value="billing">Faturação</TabsTrigger>
                    <TabsTrigger value="settings">Definições</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Restaurantes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedOrg._count?.restaurants || 0}</div>
                          <p className="text-xs text-muted-foreground">ativos na plataforma</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Utilizadores</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedOrg._count?.users || 0}</div>
                          <p className="text-xs text-muted-foreground">registados</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedOrg._count?.orders || 0}</div>
                          <p className="text-xs text-muted-foreground">total processados</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="users">
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Gestão de utilizadores em desenvolvimento</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="billing">
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Sistema de faturação em desenvolvimento</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings">
                    <div className="space-y-4">
                      <div>
                        <Label>Nome da Organização</Label>
                        <Input value={selectedOrg.name} disabled />
                      </div>
                      <div>
                        <Label>Slug</Label>
                        <Input value={selectedOrg.slug} disabled />
                      </div>
                      <div>
                        <Label>Domínio</Label>
                        <Input value={selectedOrg.domain || ''} disabled />
                      </div>
                      <div>
                        <Label>Email de Faturação</Label>
                        <Input value={selectedOrg.billing_email || ''} disabled />
                      </div>
                      <div>
                        <Label>Plano</Label>
                        <Badge className={getTierBadgeColor(selectedOrg.subscription_tier)}>
                          {selectedOrg.subscription_tier}
                        </Badge>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </LayoutWithBreadcrumb>
  )
}

export default OrganizationsPortal 