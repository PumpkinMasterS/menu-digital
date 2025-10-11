import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Globe, 
  User, 
  Store, 
  Truck, 
  Shield, 
  Building2, 
  ChefHat,
  Smartphone,
  Monitor,
  FileText,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Terminal,
  Download,
  Server,
  Code,
  Database,
  Settings,
  Zap,
  Play,
  Target,
  DollarSign,
  Percent,
  CreditCard,
  MapPin,
  Euro,
  Lock,
  Key,
  UserCheck,
  Users,
  Layers,
  GitBranch,
  Activity,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  Clock,
  MapPin as LocationIcon,
  Navigation,
  Compass,
  Map,
  Route,
  Car,
  Bike,
  Wallet,
  CreditCard as CardIcon,
  DollarSign as Money,
  Banknote,
  Calculator,
  Layers as LayersIcon,
  Database as DatabaseIcon,
  Table,
  Filter,
  SortAsc,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Star,
  Heart,
  Bookmark,
  Share,
  MessageSquare,
  Bell,
  Mail,
  Phone,
  Video,
  Camera,
  Mic,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Signal,
  SignalMedium,
  SignalLow,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Grid,
  List,
  Grid3x3,
  Layout,
  Sidebar,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Route {
  path: string
  name: string
  description: string
  roles: string[]
  type: 'web' | 'mobile'
  platform?: 'customer' | 'driver' | 'admin'
  status: 'active' | 'beta' | 'dev'
}

const HelpCenter = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Todas as rotas da aplicação
  const routes: Route[] = [
    // 🌐 ROUTES WEB PÚBLICAS
    { path: '/', name: 'Homepage', description: 'Página inicial da plataforma', roles: ['public'], type: 'web', status: 'active' },
    { path: '/auth', name: 'Autenticação', description: 'Login/Registo de utilizadores', roles: ['public'], type: 'web', status: 'active' },
    { path: '/register-restaurant', name: 'Registo de Restaurante', description: 'Formulário para registar novo restaurante', roles: ['public'], type: 'web', status: 'active' },
    { path: '/register-success', name: 'Registo Concluído', description: 'Confirmação de registo bem-sucedido', roles: ['public'], type: 'web', status: 'active' },
    { path: '/restaurant/:id', name: 'Menu Público', description: 'Visualização pública do menu de um restaurante', roles: ['public'], type: 'web', status: 'active' },
    { path: '/subscriptions', name: 'Planos de Subscrição', description: 'Página de planos disponíveis', roles: ['public'], type: 'web', status: 'active' },
    
    // 🛒 ROUTES DE COMPRA
    { path: '/checkout', name: 'Checkout Stripe', description: 'Finalização de pedido com Stripe', roles: ['customer'], type: 'web', status: 'active' },
    { path: '/checkout-mbway', name: 'Checkout MBWay', description: 'Finalização de pedido com MBWay', roles: ['customer'], type: 'web', status: 'active' },
    { path: '/order/:orderId', name: 'Rastreamento de Pedido', description: 'Acompanhar status do pedido em tempo real', roles: ['customer'], type: 'web', status: 'active' },
    { path: '/subscriptions/success', name: 'Subscrição Confirmada', description: 'Confirmação de subscrição ativa', roles: ['customer'], type: 'web', status: 'active' },
    
    // 👤 CUSTOMER ROUTES
    { path: '/customer', name: 'Dashboard Cliente', description: 'Painel do cliente com pedidos e favoritos', roles: ['customer'], type: 'web', status: 'active' },
    
    // 🍽️ RESTAURANT ROUTES
    { path: '/restaurant-admin', name: 'Dashboard Restaurante', description: 'Painel principal do restaurante', roles: ['restaurant_admin'], type: 'web', status: 'active' },
    { path: '/restaurant-dashboard/:restaurantId', name: 'Dashboard Específico', description: 'Dashboard de restaurante específico', roles: ['restaurant_admin', 'super_admin', 'platform_owner'], type: 'web', status: 'active' },
    { path: '/subscription-management', name: 'Gestão de Subscrições', description: 'Gestão das subscrições do restaurante', roles: ['restaurant_admin'], type: 'web', status: 'active' },
    
    // 👨‍🍳 KITCHEN ROUTES
    { path: '/kitchen', name: 'Dashboard Cozinha', description: 'Interface para staff da cozinha', roles: ['kitchen', 'restaurant_admin'], type: 'web', status: 'active' },
    
    // 🚗 DRIVER ROUTES
    { path: '/driver', name: 'Dashboard Motorista', description: 'Interface para entregadores', roles: ['driver'], type: 'web', status: 'active' },
    
    // 🏢 ORGANIZATION ROUTES
    { path: '/organization-dashboard', name: 'Dashboard Organização', description: 'Painel da organização (Super Admin)', roles: ['super_admin'], type: 'web', status: 'active' },
    { path: '/organization/:id', name: 'Organização Específica', description: 'Dashboard de organização específica', roles: ['super_admin'], type: 'web', status: 'active' },
    
    // 👑 ADMIN ROUTES
    { path: '/admin', name: 'Dashboard Administração', description: 'Painel principal de administração', roles: ['super_admin', 'platform_owner'], type: 'web', status: 'active' },
    { path: '/organizations', name: 'Portal de Organizações', description: 'Gestão global de organizações', roles: ['platform_owner'], type: 'web', status: 'active' },
    { path: '/monetization', name: 'Gestão de Monetização', description: 'Configuração de comissões e receitas', roles: ['platform_owner', 'super_admin'], type: 'web', status: 'active' },
    { path: '/api-docs', name: 'Documentação API', description: 'Documentação técnica da API', roles: ['super_admin'], type: 'web', status: 'beta' },
    
    // 📱 REACT NATIVE - CUSTOMER APP
    { path: 'customer-app://home', name: 'Home Screen', description: 'Tela inicial do app do cliente', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    { path: 'customer-app://auth', name: 'Auth Screen', description: 'Tela de autenticação móvel', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    { path: 'customer-app://splash', name: 'Splash Screen', description: 'Tela de carregamento inicial', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    { path: 'customer-app://restaurant/:id', name: 'Restaurant Screen', description: 'Visualização de restaurante no app', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    { path: 'customer-app://cart', name: 'Cart Screen', description: 'Carrinho de compras móvel', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    { path: 'customer-app://orders', name: 'Orders Screen', description: 'Lista de pedidos do cliente', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    { path: 'customer-app://profile', name: 'Profile Screen', description: 'Perfil do cliente móvel', roles: ['customer'], type: 'mobile', platform: 'customer', status: 'active' },
    
    // 📱 REACT NATIVE - DRIVER APP
    { path: 'driver-app://home', name: 'Driver Home', description: 'Tela principal do app do motorista', roles: ['driver'], type: 'mobile', platform: 'driver', status: 'active' },
    { path: 'driver-app://auth', name: 'Driver Auth', description: 'Autenticação do motorista', roles: ['driver'], type: 'mobile', platform: 'driver', status: 'active' },
    { path: 'driver-app://orders', name: 'Available Orders', description: 'Lista de entregas disponíveis', roles: ['driver'], type: 'mobile', platform: 'driver', status: 'active' },
    { path: 'driver-app://delivery/:id', name: 'Delivery Screen', description: 'Interface de entrega ativa', roles: ['driver'], type: 'mobile', platform: 'driver', status: 'active' },
    { path: 'driver-app://earnings', name: 'Earnings Screen', description: 'Relatório de ganhos do motorista', roles: ['driver'], type: 'mobile', platform: 'driver', status: 'active' },
    { path: 'driver-app://profile', name: 'Driver Profile', description: 'Perfil do motorista móvel', roles: ['driver'], type: 'mobile', platform: 'driver', status: 'active' },
  ]

  // Roles organizados por hierarquia
  const roleHierarchy = [
    { role: 'platform_owner', name: 'Platform Owner', description: 'Acesso total à plataforma', icon: Shield, color: 'bg-red-500' },
    { role: 'super_admin', name: 'Super Admin', description: 'Administrador regional', icon: Building2, color: 'bg-purple-500' },
    { role: 'restaurant_admin', name: 'Restaurant Admin', description: 'Gestor de restaurante', icon: Store, color: 'bg-blue-500' },
    { role: 'kitchen', name: 'Kitchen Staff', description: 'Staff da cozinha', icon: ChefHat, color: 'bg-orange-500' },
    { role: 'driver', name: 'Driver', description: 'Motorista/Entregador', icon: Truck, color: 'bg-green-500' },
    { role: 'customer', name: 'Customer', description: 'Cliente da plataforma', icon: User, color: 'bg-emerald-500' },
  ]

  // Filtrar rotas baseado na pesquisa
  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado!",
      description: `"${text}" foi copiado para a área de transferência`
    })
  }

  const navigateToRoute = (path: string) => {
    if (path.startsWith('http') || path.includes('://')) {
      window.open(path, '_blank')
    } else {
      navigate(path)
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'beta': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'dev': return <Info className="h-4 w-4 text-blue-500" />
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      beta: 'bg-yellow-100 text-yellow-800', 
      dev: 'bg-blue-100 text-blue-800'
    }
    return variants[status as keyof typeof variants] || variants.active
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">📚 Help Center</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
            Documentação completa da plataforma DeliverEat - Web App & Mobile Apps
          </p>
          
          {/* Botão para Documentação Técnica */}
          <div className="flex justify-center">
            <Button 
              onClick={() => navigate('/help/docs')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <FileText className="h-5 w-5 mr-2" />
              📋 Documentação Técnica Completa
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input
            placeholder="Pesquisar rotas, funcionalidades, roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>

        <Tabs defaultValue="routes" className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-8">
            <TabsTrigger value="routes" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Todas as Rotas
            </TabsTrigger>
            <TabsTrigger value="web" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Web App
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Setup
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Gestão Entregas
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="tech" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Tech Stack
            </TabsTrigger>
            <TabsTrigger value="mcp" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              MCP Tools
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Design System
            </TabsTrigger>
          </TabsList>

          {/* All Routes */}
          <TabsContent value="routes" className="space-y-6">
            <div className="grid gap-4">
              {filteredRoutes.map((route, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {route.type === 'web' ? 
                          <Monitor className="h-5 w-5 text-blue-500" /> : 
                          <Smartphone className="h-5 w-5 text-green-500" />
                        }
                        <div>
                          <CardTitle className="text-lg cursor-pointer hover:text-blue-600" onClick={() => navigateToRoute(route.path)}>
                            {route.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <code 
                              className="bg-slate-100 px-2 py-1 rounded text-sm cursor-pointer hover:bg-slate-200" 
                              onClick={() => copyToClipboard(route.path)}
                            >
                              {route.path}
                            </code>
                            {getStatusIcon(route.status)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadge(route.status)}>
                          {route.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(route.path)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-3">{route.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {route.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Web App Only */}
          <TabsContent value="web" className="space-y-6">
            <div className="grid gap-4">
              {filteredRoutes.filter(r => r.type === 'web').map((route, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-blue-500" />
                        <div>
                          <CardTitle className="text-lg">{route.name}</CardTitle>
                          <CardDescription>
                            <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                              http://localhost:8080{route.path}
                            </code>
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(`http://localhost:8080${route.path}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-3">{route.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {route.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Mobile Setup */}
          <TabsContent value="mobile" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Setup Mobile Development</h2>
              <p>Complete guide for React Native development environment setup.</p>
            </div>
          </TabsContent>

          {/* Delivery Management */}
          <TabsContent value="delivery" className="space-y-6">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-4">🚚 Gestão de Entregas e Zonas</h1>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                  Sistema completo de gestão de zonas de entrega, tempos dinâmicos e notificações para entregadores
                </p>
              </div>

              {/* Zonas de Entrega */}
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-blue-600" />
                    🗺️ Gestão de Zonas de Entrega
                  </CardTitle>
                  <CardDescription>
                    Sistema visual para definir áreas de entrega com Google Maps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-blue-700">✨ Funcionalidades Implementadas</h4>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Zonas Circulares e Poligonais:</strong> Desenho visual no mapa</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Cores Diferenciadas:</strong> 8 cores predefinidas para organização</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Edição Visual:</strong> Botões de editar, ativar/desativar, deletar</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Raio Editável:</strong> Ajustar tamanho das zonas circulares</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Zonas Temporárias:</strong> Ativar/desativar por período</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Atualização Tempo Real:</strong> Mudanças instantâneas</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-blue-700">⚙️ Configurações por Zona</h4>
                      <ul className="text-sm space-y-2">
                        <li>• <strong>Taxa de Entrega:</strong> Valor específico por área (€)</li>
                        <li>• <strong>Valor Mínimo:</strong> Pedido mínimo para entrega (€)</li>
                        <li>• <strong>Tempo de Entrega:</strong> Estimativa mínima e máxima (min)</li>
                        <li>• <strong>Raio de Cobertura:</strong> Distância em quilômetros</li>
                        <li>• <strong>Descrição:</strong> Notas e observações opcionais</li>
                        <li>• <strong>Status:</strong> Ativa ou temporariamente desativada</li>
                      </ul>
                      
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs font-medium text-yellow-800">
                          💡 <strong>Zonas Temporárias:</strong> Use o botão de power para ativar/desativar zonas durante eventos especiais, feriados ou manutenção.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notificações Push */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-green-600" />
                    📱 Notificações Push para Entregadores
                  </CardTitle>
                  <CardDescription>
                    Sistema inteligente de notificações baseado em localização
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-green-700">🎯 Como Funcionam</h4>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 bg-white border border-green-200 rounded">
                          <p><strong>1. Detecção de Zona:</strong> Sistema identifica automaticamente a zona do pedido</p>
                        </div>
                        <div className="p-3 bg-white border border-green-200 rounded">
                          <p><strong>2. Filtro por Localização:</strong> Notifica apenas entregadores próximos à zona</p>
                        </div>
                        <div className="p-3 bg-white border border-green-200 rounded">
                          <p><strong>3. Priorização:</strong> Entregadores mais próximos recebem notificação primeiro</p>
                        </div>
                        <div className="p-3 bg-white border border-green-200 rounded">
                          <p><strong>4. Auto-aceite:</strong> Primeiro a aceitar fica com a entrega</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-green-700">💼 Benefícios para o Negócio</h4>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span><strong>Eficiência:</strong> Reduz tempo de resposta</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span><strong>Economia:</strong> Menos quilômetros vazios</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span><strong>Satisfação:</strong> Entregas mais rápidas</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span><strong>Escalabilidade:</strong> Suporta múltiplos entregadores</span>
                        </li>
                      </ul>

                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs font-medium text-green-800">
                          📱 <strong>Exemplo:</strong> Pedido na zona "Centro" notifica apenas entregadores num raio de 2km do centro da cidade.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sobreposição de Zonas */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-600" />
                    🔄 Sobreposição de Zonas
                  </CardTitle>
                  <CardDescription>
                    Gestão inteligente quando várias zonas se cruzam
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-purple-700">⚡ Sistema de Prioridade</h4>
                      <div className="space-y-2 text-sm">
                        <div className="p-2 bg-white border border-purple-200 rounded flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">1</Badge>
                          <span>Zona mais específica (menor área)</span>
                        </div>
                        <div className="p-2 bg-white border border-purple-200 rounded flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800">2</Badge>
                          <span>Taxa de entrega mais baixa</span>
                        </div>
                        <div className="p-2 bg-white border border-purple-200 rounded flex items-center gap-2">
                          <Badge className="bg-yellow-100 text-yellow-800">3</Badge>
                          <span>Tempo de entrega mais rápido</span>
                        </div>
                        <div className="p-2 bg-white border border-purple-200 rounded flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">4</Badge>
                          <span>Zona criada mais recentemente</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-purple-700">🎛️ Resolução Automática</h4>
                      <ul className="text-sm space-y-2">
                        <li>• <strong>Detecção Automática:</strong> Sistema identifica sobreposições</li>
                        <li>• <strong>Algoritmo de Prioridade:</strong> Aplica regras definidas</li>
                        <li>• <strong>Notificação Visual:</strong> Alerta sobre conflitos</li>
                        <li>• <strong>Sugestões:</strong> Recomenda ajustes nas zonas</li>
                        <li>• <strong>Log de Decisões:</strong> Histórico de resoluções</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Previsão Dinâmica */}
              <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    🚦 Previsão de Tempo Dinâmica
                  </CardTitle>
                  <CardDescription>
                    Tempos de entrega adaptativos baseados em tráfego real
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-orange-700">📊 Fontes de Dados</h4>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-orange-500" />
                          <span><strong>Google Maps Traffic:</strong> Condições de tráfego real</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span><strong>Histórico de Entregas:</strong> Dados de performance passada</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-500" />
                          <span><strong>Sazonalidade:</strong> Padrões por hora/dia/época</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-orange-500" />
                          <span><strong>Machine Learning:</strong> Previsões inteligentes</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-orange-700">🎯 Ajustes Automáticos</h4>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 bg-white border border-orange-200 rounded">
                          <p><strong>Rush Hour:</strong> +15-30 min durante picos de tráfego</p>
                        </div>
                        <div className="p-3 bg-white border border-orange-200 rounded">
                          <p><strong>Chuva/Neve:</strong> +10-20 min em condições meteorológicas adversas</p>
                        </div>
                        <div className="p-3 bg-white border border-orange-200 rounded">
                          <p><strong>Eventos:</strong> +20-45 min durante jogos, concertos, etc.</p>
                        </div>
                        <div className="p-3 bg-white border border-orange-200 rounded">
                          <p><strong>Distância Real:</strong> Calcula rota otimizada vs. distância linear</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Access */}
              <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-slate-600" />
                    🚀 Acesso Rápido
                  </CardTitle>
                  <CardDescription>
                    Links diretos para configurar gestão de entregas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => navigateToRoute('/admin/restaurant/taberna-real-fado/config')}
                    >
                      <Map className="h-6 w-6 text-blue-500" />
                      <span className="font-medium">Configurar Zonas</span>
                      <span className="text-xs text-gray-500">Definir áreas de entrega</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => navigateToRoute('/driver')}
                    >
                      <Truck className="h-6 w-6 text-green-500" />
                      <span className="font-medium">Dashboard Entregador</span>
                      <span className="text-xs text-gray-500">Ver interface do driver</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => navigateToRoute('/admin')}
                    >
                      <BarChart3 className="h-6 w-6 text-purple-500" />
                      <span className="font-medium">Relatórios</span>
                      <span className="text-xs text-gray-500">Análise de entregas</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Roles */}
          <TabsContent value="roles" className="space-y-6">
            {/* Role Hierarchy Overview */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  🏗️ Hierarquia de Roles & Permissões
                </CardTitle>
                <CardDescription>
                  Sistema hierárquico de 6 níveis com isolamento de dados por organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg mb-2">Fluxo Hierárquico</h3>
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <Badge className="bg-red-100 text-red-800">Platform Owner</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge className="bg-purple-100 text-purple-800">Super Admin</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge className="bg-blue-100 text-blue-800">Restaurant Admin</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge className="bg-orange-100 text-orange-800">Kitchen</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge className="bg-green-100 text-green-800">Driver</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge className="bg-emerald-100 text-emerald-800">Customer</Badge>
                    </div>
                  </div>
                  <div className="text-center bg-blue-50 p-3 rounded">
                    <p className="text-sm font-medium">⚠️ Importante: Cada nível só pode "Ver Como" os níveis inferiores</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role Details */}
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-500" />
                    👑 Platform Owner
                  </CardTitle>
                  <CardDescription>Dono global da plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">✅ Permissões</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Criar Super Admins regionais</li>
                        <li>• Acesso total a todas as organizações</li>
                        <li>• Configurar comissões globais</li>
                        <li>• Gerir monetização e subscriptions</li>
                        <li>• Ver todos os relatórios</li>
                        <li>• Configurar features globais</li>
                      </ul>
                      <h4 className="font-semibold mb-2 mt-4 text-green-600">🗺️ DELIVERY AREAS</h4>
                      <ul className="text-sm space-y-1 text-green-600">
                        <li>• ✅ Acesso total delivery areas</li>
                        <li>• ✅ Todas as regiões e restaurantes</li>
                        <li>• ✅ Google Maps configuração global</li>
                        <li>• ✅ Override configurações regionais</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔒 RLS Policy</h4>
                      <code className="text-xs bg-slate-100 p-2 rounded block">
                        POLICY "platform_owner_all_access"
                        FOR ALL USING (true)
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-500" />
                    🏢 Super Admin (Regional)
                  </CardTitle>
                  <CardDescription>Administrador de organização regional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">✅ Permissões</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Criar restaurantes na sua região</li>
                        <li>• Gerir Restaurant Admins</li>
                        <li>• Atribuir drivers à organização</li>
                        <li>• Ver estatísticas regionais</li>
                        <li>• Configurar comissões locais</li>
                        <li>• Aprovar novos restaurantes</li>
                      </ul>
                      <h4 className="font-semibold mb-2 mt-4 text-green-600">🗺️ DELIVERY AREAS</h4>
                      <ul className="text-sm space-y-1 text-green-600">
                        <li>• ✅ Configurar delivery areas</li>
                        <li>• ✅ Definir raios de entrega</li>
                        <li>• ✅ Alterar taxas de entrega</li>
                        <li>• ✅ Google Maps settings</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔒 RLS Policy</h4>
                      <code className="text-xs bg-slate-100 p-2 rounded block">
                        POLICY "super_admin_org_access"
                        FOR ALL USING (
                        &nbsp;&nbsp;organization_id = auth.jwt()-&gt;'organization_id'
                        )
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-500" />
                    🍽️ Restaurant Admin
                  </CardTitle>
                  <CardDescription>Gestor de restaurante individual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">✅ Permissões</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Gerir menu digital completo</li>
                        <li>• Ver estatísticas do restaurante</li>
                        <li>• Processar pedidos</li>
                        <li>• Configurar perfil do restaurante</li>
                        <li>• Gerir subscriptions</li>
                        <li>• Acesso a relatórios locais</li>
                      </ul>
                      <h4 className="font-semibold mb-2 mt-4 text-red-600">❌ SEM ACESSO</h4>
                      <ul className="text-sm space-y-1 text-red-600">
                        <li>• ❌ Configurar delivery areas</li>
                        <li>• ❌ Definir raios de entrega</li>
                        <li>• ❌ Alterar taxas de entrega</li>
                        <li>• ❌ Google Maps settings</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔒 RLS Policy</h4>
                      <code className="text-xs bg-slate-100 p-2 rounded block">
                        POLICY "restaurant_admin_access"
                        FOR ALL USING (
                        &nbsp;&nbsp;restaurant_id = auth.jwt()-&gt;'restaurant_id'
                        )
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-500" />
                    👨‍🍳 Kitchen Staff
                  </CardTitle>
                  <CardDescription>Staff interno do restaurante</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">✅ Permissões</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Ver pedidos da cozinha</li>
                        <li>• Atualizar status de preparação</li>
                        <li>• Marcar itens como prontos</li>
                        <li>• Acesso ao dashboard da cozinha</li>
                        <li>• Comunicar com delivery</li>
                        <li>• Ver métricas de performance</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔒 RLS Policy</h4>
                      <code className="text-xs bg-slate-100 p-2 rounded block">
                        POLICY "kitchen_staff_orders"
                        FOR SELECT USING (
                        &nbsp;&nbsp;restaurant_id = auth.jwt()-&gt;'restaurant_id'
                        &nbsp;&nbsp;AND status IN ('confirmed', 'preparing')
                        )
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-500" />
                    🚗 Driver
                  </CardTitle>
                  <CardDescription>Motorista/Entregador regional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">✅ Permissões</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Ver entregas disponíveis</li>
                        <li>• Aceitar/rejeitar entregas</li>
                        <li>• Atualizar localização em tempo real</li>
                        <li>• Marcar entregas como concluídas</li>
                        <li>• Ver histórico de entregas</li>
                        <li>• Gerir ganhos e relatórios</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔒 RLS Policy</h4>
                      <code className="text-xs bg-slate-100 p-2 rounded block">
                        POLICY "driver_org_deliveries"
                        FOR SELECT USING (
                        &nbsp;&nbsp;organization_id = auth.jwt()-&gt;'organization_id'
                        &nbsp;&nbsp;AND status = 'ready_for_delivery'
                        )
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-500" />
                    🧑‍🤝‍🧑 Customer
                  </CardTitle>
                  <CardDescription>Cliente final da plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">✅ Permissões</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Ver menus públicos</li>
                        <li>• Fazer pedidos</li>
                        <li>• Acompanhar entregas</li>
                        <li>• Gerir perfil pessoal</li>
                        <li>• Histórico de pedidos</li>
                        <li>• Avaliações e reviews</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔒 RLS Policy</h4>
                      <code className="text-xs bg-slate-100 p-2 rounded block">
                        POLICY "customer_own_orders"
                        FOR SELECT USING (
                        &nbsp;&nbsp;customer_id = auth.uid()
                        )
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scope Simulation */}
            <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  🔍 Sistema de "Ver Como" (Scope Simulation)
                </CardTitle>
                <CardDescription>
                  Simulação hierárquica sem alteração de role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center bg-green-50 p-3 rounded">
                    <p className="text-sm font-medium">
                      ✨ Platform Owner pode "ver como" Super Admin<br/>
                      ✨ Super Admin pode "ver como" Restaurant Admin<br/>
                      ✨ Sem alteração de role real, apenas contexto simulado
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">🧠 Como Funciona</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Role real nunca muda</li>
                        <li>• Contexto simulado via currentScope</li>
                        <li>• Filtros dinâmicos por organization_id</li>
                        <li>• UI consistente sem troca de dashboards</li>
                        <li>• Segurança baseada no role real</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">💡 Benefícios</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Reutilização de componentes</li>
                        <li>• Suporte facilitado</li>
                        <li>• Auditoria completa</li>
                        <li>• Manutenção simplificada</li>
                        <li>• Escalabilidade para franquias</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Areas & Location Settings */}
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  🗺️ Áreas de Entrega e Configurações de Localização
                </CardTitle>
                <CardDescription>
                  Configurações de delivery areas - Similar ao modelo UberEats/Glovo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center bg-amber-50 p-3 rounded border border-amber-200">
                    <p className="text-sm font-medium text-amber-800">
                      ⚠️ IMPORTANTE: Restaurant Admins NÃO configuram áreas de entrega<br/>
                      📍 Apenas Platform Owner e Super Admin Regional fazem essas configurações
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">🚫 Restaurant Admin - SEM ACESSO</h4>
                      <ul className="text-sm space-y-1 text-slate-600">
                        <li>• ❌ Não define raio de entrega</li>
                        <li>• ❌ Não configura zonas de delivery</li>
                        <li>• ❌ Não altera taxas de entrega</li>
                        <li>• ❌ Não vê delivery areas manager</li>
                        <li>• ✅ Apenas gere menu e perfil</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">✅ Platform Owner & Super Admin</h4>
                      <ul className="text-sm space-y-1 text-green-700">
                        <li>• ✅ Configuram delivery areas</li>
                        <li>• ✅ Definem raios de entrega</li>
                        <li>• ✅ Criam zonas personalizadas</li>
                        <li>• ✅ Configuram taxas por zona</li>
                        <li>• ✅ Gerem Google Maps settings</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <h4 className="font-semibold mb-2 text-blue-800">💡 Modelo Similar UberEats/Glovo</h4>
                    <p className="text-sm text-blue-700">
                      Tal como na UberEats e Glovo, os <strong>restaurantes não escolhem</strong> o raio de entrega nem definem zonas. 
                      Essas configurações são estratégicas da <strong>plataforma</strong> e dos <strong>administradores regionais</strong>, 
                      permitindo controlo centralizado sobre cobertura, logística e otimização de rotas.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                      <h5 className="font-medium text-red-800">🔴 Platform Owner</h5>
                      <p className="text-xs text-red-700">Acesso total<br/>Todas as regiões</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded border border-purple-200">
                      <h5 className="font-medium text-purple-800">🟣 Super Admin</h5>
                      <p className="text-xs text-purple-700">Sua região apenas<br/>Controlo regional</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded border border-gray-200">
                      <h5 className="font-medium text-gray-800">🔘 Restaurant Admin</h5>
                      <p className="text-xs text-gray-700">Sem acesso<br/>Apenas menu</p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <h4 className="font-semibold mb-2 text-green-800">🎯 Configurações Disponíveis</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <h5 className="font-medium text-green-700">Delivery Areas Manager</h5>
                        <ul className="text-xs text-green-600 space-y-1">
                          <li>• Raios circulares por restaurante</li>
                          <li>• Polígonos personalizados</li>
                          <li>• Zonas de exclusão</li>
                          <li>• Taxas diferenciadas por zona</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-green-700">Google Maps Config</h5>
                        <ul className="text-xs text-green-600 space-y-1">
                          <li>• API key management</li>
                          <li>• Geocoding settings</li>
                          <li>• Map display options</li>
                          <li>• Security restrictions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tech Stack */}
          <TabsContent value="tech" className="space-y-6">
            {/* Architecture Overview */}
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-600" />
                  🏗️ Arquitetura da Plataforma
                </CardTitle>
                <CardDescription>
                  Stack tecnológico completo para plataforma de delivery multi-regional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Frontend</h3>
                    <Badge className="bg-blue-100 text-blue-800">React + TypeScript</Badge>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Backend</h3>
                    <Badge className="bg-green-100 text-green-800">Supabase</Badge>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Mobile</h3>
                    <Badge className="bg-purple-100 text-purple-800">React Native</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Tech Stack */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-blue-500" />
                    🌐 Web Frontend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>React</span>
                      <Badge variant="outline">v18.2.0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>TypeScript</span>
                      <Badge variant="outline">v5.2.2</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Vite</span>
                      <Badge variant="outline">v4.4.5</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tailwind CSS</span>
                      <Badge variant="outline">v3.3.0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Shadcn UI</span>
                      <Badge variant="outline">Latest</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>React Router</span>
                      <Badge variant="outline">v6.15.0</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DatabaseIcon className="h-5 w-5 text-green-500" />
                    🗄️ Backend & Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Supabase</span>
                      <Badge variant="outline">Cloud</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PostgreSQL</span>
                      <Badge variant="outline">v15</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Row Level Security</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Edge Functions</span>
                      <Badge variant="outline">Deno</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Real-time</span>
                      <Badge className="bg-blue-100 text-blue-800">WebSocket</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Storage</span>
                      <Badge variant="outline">S3 Compatible</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-purple-500" />
                    📱 Mobile Apps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>React Native</span>
                      <Badge variant="outline">v0.72.0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Expo</span>
                      <Badge variant="outline">v49.0.0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Customer App</span>
                      <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Driver App</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Geolocation</span>
                      <Badge variant="outline">GPS + Maps</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Push Notifications</span>
                      <Badge variant="outline">Firebase</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-yellow-500" />
                    💳 Payment Systems
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Stripe</span>
                      <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>MBWay</span>
                      <Badge className="bg-green-100 text-green-800">Portugal</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PayPal</span>
                      <Badge variant="outline">Planned</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Multibanco</span>
                      <Badge variant="outline">Planned</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Split Payments</span>
                      <Badge className="bg-purple-100 text-purple-800">Automated</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Subscriptions</span>
                      <Badge variant="outline">Monthly</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Database Schema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="h-5 w-5 text-slate-500" />
                  🗃️ Database Schema (Principais Tabelas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Core Tables</h4>
                    <ul className="text-sm space-y-1">
                      <li>• <code>profiles</code> - Utilizadores e roles</li>
                      <li>• <code>organizations</code> - Super Admin regionais</li>
                      <li>• <code>regions</code> - Regiões geográficas</li>
                      <li>• <code>restaurants</code> - Restaurantes com geolocalização</li>
                      <li>• <code>drivers</code> - Motoristas por organização</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Business Tables</h4>
                    <ul className="text-sm space-y-1">
                      <li>• <code>menu_categories</code> - Categorias hierárquicas</li>
                      <li>• <code>menu_items</code> - Itens com modificadores</li>
                      <li>• <code>orders</code> - Pedidos com tracking</li>
                      <li>• <code>payments</code> - Pagamentos multi-método</li>
                      <li>• <code>subscription_plans</code> - Monetização</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security & Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  🔐 Segurança & Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Autenticação</h4>
                    <ul className="text-sm space-y-1">
                      <li>• JWT Tokens</li>
                      <li>• Role-based Access</li>
                      <li>• Session Management</li>
                      <li>• OAuth2 Integration</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Segurança</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Row Level Security</li>
                      <li>• API Rate Limiting</li>
                      <li>• SQL Injection Protection</li>
                      <li>• CORS Configuration</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Performance</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Database Indexing</li>
                      <li>• Real-time Updates</li>
                      <li>• Edge Functions</li>
                      <li>• CDN Integration</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DevOps & Deployment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-gray-500" />
                  🚀 DevOps & Deployment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Development</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Git Version Control</li>
                      <li>• ESLint + Prettier</li>
                      <li>• TypeScript Strict Mode</li>
                      <li>• Hot Module Replacement</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Deployment</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Vercel/Netlify Frontend</li>
                      <li>• Supabase Cloud Backend</li>
                      <li>• CI/CD Pipeline</li>
                      <li>• Environment Variables</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Tools */}
          <TabsContent value="mcp" className="space-y-6">
            {/* MCP Overview */}
            <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-600" />
                  ⚡ MCP Supabase Integration
                </CardTitle>
                <CardDescription>
                  Ferramentas AI-powered para gestão automática da base de dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">🤖 AI Assistant</h3>
                    <Badge className="bg-blue-100 text-blue-800">Claude Sonnet</Badge>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">🗄️ Database</h3>
                    <Badge className="bg-green-100 text-green-800">Supabase</Badge>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">⚙️ Tools</h3>
                    <Badge className="bg-purple-100 text-purple-800">25+ Functions</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Tools */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DatabaseIcon className="h-5 w-5 text-green-500" />
                    🗃️ Database Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>list_tables</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>execute_sql</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>apply_migration</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>list_migrations</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>list_extensions</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>generate_types</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    🏢 Project Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>list_projects</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>get_project</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>create_project</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>pause_project</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>restore_project</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>get_project_url</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-purple-500" />
                    🌿 Branch Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>create_branch</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>list_branches</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>delete_branch</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>merge_branch</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>reset_branch</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>rebase_branch</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-orange-500" />
                    ⚡ Edge Functions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>list_edge_functions</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>deploy_edge_function</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>get_logs</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>get_advisors</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>search_docs</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>get_anon_key</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  📊 Current Project: SaborPortuguês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Project Details</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Project ID: <code>misswwtaysshbnnsjhtv</code></li>
                      <li>• Region: us-east-1</li>
                      <li>• Status: Active</li>
                      <li>• Database: PostgreSQL 15</li>
                      <li>• Plan: Pro</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Available Actions</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Execute SQL queries</li>
                      <li>• Apply migrations</li>
                      <li>• Generate TypeScript types</li>
                      <li>• Monitor performance</li>
                      <li>• Deploy edge functions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How to Use */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-green-500" />
                  🎯 Como Usar o MCP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <h4 className="font-semibold mb-2">💡 Exemplos de Comandos</h4>
                    <div className="space-y-2 text-sm">
                      <p>• <strong>"List all tables in the database"</strong> - Lista todas as tabelas</p>
                      <p>• <strong>"Show me the current migrations"</strong> - Mostra migrações aplicadas</p>
                      <p>• <strong>"Create a new migration to add a column"</strong> - Cria nova migração</p>
                      <p>• <strong>"Generate TypeScript types for the database"</strong> - Gera tipos</p>
                      <p>• <strong>"Check for security advisors"</strong> - Verifica problemas de segurança</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <h4 className="font-semibold mb-2">✨ Features Automáticas</h4>
                    <div className="space-y-2 text-sm">
                      <p>• <strong>Smart Schema Detection</strong> - Deteta automaticamente a estrutura</p>
                      <p>• <strong>RLS Policy Generation</strong> - Cria políticas de segurança</p>
                      <p>• <strong>Migration Suggestions</strong> - Sugere migrações necessárias</p>
                      <p>• <strong>Performance Monitoring</strong> - Monitoriza performance</p>
                      <p>• <strong>Error Detection</strong> - Deteta e corrige erros</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design System 2025 */}
          <TabsContent value="design" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                🎨 Design System 2025
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Sistema de design moderno e unificado para todos os dashboards da plataforma DeliverEat
              </p>
            </div>

            {/* Color Palette */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  🎨 Paleta de Cores 2025
                </CardTitle>
                <CardDescription>Cores principais e gradientes modernos</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Primary Colors */}
                  <div>
                    <h4 className="font-semibold mb-4 text-slate-800">Cores Primárias</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg"></div>
                        <div>
                          <p className="font-medium">Primary Blue</p>
                          <code className="text-sm text-slate-600">from-blue-500 to-blue-600</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg"></div>
                        <div>
                          <p className="font-medium">Success Green</p>
                          <code className="text-sm text-slate-600">from-emerald-500 to-emerald-600</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg"></div>
                        <div>
                          <p className="font-medium">Accent Purple</p>
                          <code className="text-sm text-slate-600">from-purple-500 to-purple-600</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 shadow-lg"></div>
                        <div>
                          <p className="font-medium">Warning Orange</p>
                          <code className="text-sm text-slate-600">from-orange-500 to-red-500</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Colors */}
                  <div>
                    <h4 className="font-semibold mb-4 text-slate-800">Backgrounds & Gradientes</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 shadow-lg border"></div>
                        <div>
                          <p className="font-medium">Main Background</p>
                          <code className="text-sm text-slate-600">from-slate-50 via-blue-50 to-indigo-50</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm shadow-lg border border-white/20"></div>
                        <div>
                          <p className="font-medium">Glass Effect</p>
                          <code className="text-sm text-slate-600">backdrop-blur-sm bg-white/80</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 shadow-lg border border-blue-200/50"></div>
                        <div>
                          <p className="font-medium">Subtle Gradient</p>
                          <code className="text-sm text-slate-600">from-blue-600/10 via-purple-600/10</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  ✍️ Tipografia Moderna
                </CardTitle>
                <CardDescription>Hierarquia tipográfica com gradientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    Heading 1 - Dashboard Title
                  </h1>
                  <code className="text-sm text-slate-600">text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent</code>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                    Heading 2 - Section Title
                  </h2>
                  <code className="text-sm text-slate-600">text-2xl font-semibold text-slate-800</code>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    Heading 3 - Card Title
                  </h3>
                  <code className="text-sm text-slate-600">text-lg font-medium text-slate-700</code>
                </div>
                <div>
                  <p className="text-base text-slate-600 mb-2">
                    Body Text - Descrições e conteúdo principal
                  </p>
                  <code className="text-sm text-slate-600">text-base text-slate-600</code>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    Small Text - Labels e informações secundárias
                  </p>
                  <code className="text-sm text-slate-600">text-sm text-slate-500</code>
                </div>
              </CardContent>
            </Card>

            {/* Components */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  🧩 Componentes Modernos
                </CardTitle>
                <CardDescription>Exemplos de componentes com o novo design</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Buttons */}
                <div>
                  <h4 className="font-semibold mb-4 text-slate-800">Botões</h4>
                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                      Primary Button
                    </Button>
                    <Button variant="outline" className="border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300">
                      Secondary Button
                    </Button>
                    <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300">
                      Success Button
                    </Button>
                    <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300">
                      Warning Button
                    </Button>
                  </div>
                  <div className="mt-3">
                    <code className="text-sm text-slate-600">
                      bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300
                    </code>
                  </div>
                </div>

                {/* Cards */}
                <div>
                  <h4 className="font-semibold mb-4 text-slate-800">Cards</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="backdrop-blur-sm bg-white/80 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-slate-800">Glass Card</CardTitle>
                        <CardDescription>Card com efeito glassmorphism</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600">Conteúdo do card com visual moderno e elegante.</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-slate-800">Gradient Card</CardTitle>
                        <CardDescription>Card com background gradiente</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600">Card com gradiente sutil e bordas suaves.</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-3">
                    <code className="text-sm text-slate-600">
                      backdrop-blur-sm bg-white/80 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]
                    </code>
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <h4 className="font-semibold mb-4 text-slate-800">Badges</h4>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg">
                      Ativo
                    </Badge>
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
                      Pendente
                    </Badge>
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg">
                      Processando
                    </Badge>
                    <Badge variant="outline" className="border-2 border-blue-200 text-blue-700 bg-blue-50">
                      Outline Badge
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <code className="text-sm text-slate-600">
                      bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Principles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-emerald-500" />
                  📐 Princípios de Layout
                </CardTitle>
                <CardDescription>Diretrizes para layouts consistentes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-slate-800">Espaçamento</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li>• <strong>Padding interno:</strong> <code>p-6</code> para cards</li>
                      <li>• <strong>Margem entre elementos:</strong> <code>space-y-4</code></li>
                      <li>• <strong>Gap em grids:</strong> <code>gap-4</code> ou <code>gap-6</code></li>
                      <li>• <strong>Padding de containers:</strong> <code>p-6</code> ou <code>p-8</code></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-slate-800">Responsividade</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li>• <strong>Mobile First:</strong> Design para mobile primeiro</li>
                      <li>• <strong>Breakpoints:</strong> <code>md:grid-cols-2</code>, <code>lg:grid-cols-3</code></li>
                      <li>• <strong>Padding responsivo:</strong> <code>p-4 md:p-6 lg:p-8</code></li>
                      <li>• <strong>Text responsivo:</strong> <code>text-lg md:text-xl lg:text-2xl</code></li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modern Effects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  ✨ Efeitos Modernos
                </CardTitle>
                <CardDescription>Efeitos visuais para uma experiência premium</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-slate-800">Glassmorphism</h4>
                    <div className="p-4 rounded-lg backdrop-blur-sm bg-white/80 border border-white/20 shadow-xl">
                      <p className="text-sm text-slate-600 mb-2">Exemplo de glassmorphism</p>
                      <code className="text-xs text-slate-500">backdrop-blur-sm bg-white/80 border border-white/20</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-slate-800">Transições</h4>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                      <p className="text-sm text-slate-600 mb-2">Hover para ver o efeito</p>
                      <code className="text-xs text-slate-500">transition-all duration-300 hover:scale-[1.02]</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Implementation Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-green-500" />
                  🚀 Guia de Implementação
                </CardTitle>
                <CardDescription>Como aplicar o design system nos dashboards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-slate-800">Classes CSS Principais</h4>
                  <div className="space-y-2 text-sm">
                    <p>• <strong>Container principal:</strong> <code>min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6</code></p>
                    <p>• <strong>Cards modernos:</strong> <code>backdrop-blur-sm bg-white/80 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300</code></p>
                    <p>• <strong>Títulos com gradiente:</strong> <code>bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent</code></p>
                    <p>• <strong>Botões premium:</strong> <code>bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl</code></p>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-slate-800">Dashboards a Atualizar</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <ul className="space-y-1">
                      <li>• AdminDashboard.tsx</li>
                      <li>• CustomerDashboard.tsx</li>
                      <li>• RestaurantDashboard.tsx</li>
                      <li>• KitchenDashboard.tsx</li>
                    </ul>
                    <ul className="space-y-1">
                      <li>• DriverDashboard.tsx</li>
                      <li>• OrganizationDashboard.tsx</li>
                      <li>• RestaurantSettings.tsx</li>
                      <li>• MonetizationManagement.tsx</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">🌐 Web Application</h4>
              <p className="text-sm text-slate-600">React + TypeScript + Vite</p>
              <p className="text-sm text-slate-600">Supabase + Stripe + MBWay</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">📱 Mobile Apps</h4>
              <p className="text-sm text-slate-600">React Native + Expo</p>
              <p className="text-sm text-slate-600">Customer & Driver Apps</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔐 Authentication</h4>
              <p className="text-sm text-slate-600">Supabase Auth + RLS</p>
              <p className="text-sm text-slate-600">Role-based access control</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HelpCenter