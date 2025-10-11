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
  Tablet,
  ArrowLeft,
  FileText,
  Code,
  Layout,
  Settings,
  Users,
  BarChart3,
  Package,
  CreditCard,
  MapPin,
  Bell,
  Camera,
  Upload,
  Database,
  Zap,
  Palette,
  Type,
  Grid,
  List,
  Eye,
  Edit,
  Plus,
  Filter,
  RefreshCw,
  Download,
  Share,
  Star,
  Heart,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  ExternalLink,
  Github,
  Figma,
  Chrome,
  Layers,
  Component,
  Workflow,
  Terminal,
  Cpu,
  Server,
  Cloud,
  Lock,
  Key,
  UserCheck,
  UserX,
  UserPlus,
  Building,
  Home,
  ShoppingCart,
  Menu,
  Navigation,
  Compass,
  Route,
  Car,
  Bike,
  Plane,
  Ship
} from 'lucide-react'

const HelpDocumentation = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 📊 DASHBOARDS E PÁGINAS PRINCIPAIS
  const dashboards = [
    {
      name: 'AdminDashboard',
      path: '/admin',
      file: 'src/pages/AdminDashboard.tsx',
      description: 'Dashboard principal de administração com estatísticas, gestão de utilizadores, restaurantes e motoristas',
      features: ['Estatísticas em tempo real', 'Gestão de utilizadores', 'Gestão de restaurantes', 'Gestão de motoristas', 'Filtros por organização'],
      roles: ['super_admin', 'platform_owner'],
      status: 'active',
      category: 'admin'
    },
    {
      name: 'OrganizationDashboard',
      path: '/organization/:id',
      file: 'src/pages/OrganizationDashboard.tsx',
      description: 'Dashboard específico para cada organização com métricas e gestão',
      features: ['Métricas da organização', 'Gestão de restaurantes', 'Gestão de utilizadores', 'Configurações'],
      roles: ['super_admin', 'admin'],
      status: 'active',
      category: 'admin'
    },
    {
      name: 'OrganizationsPortal',
      path: '/organizations',
      file: 'src/pages/OrganizationsPortal.tsx',
      description: 'Portal global para gestão de todas as organizações',
      features: ['Lista de organizações', 'Criação de organizações', 'Estatísticas globais'],
      roles: ['platform_owner'],
      status: 'active',
      category: 'admin'
    },
    {
      name: 'CustomerDashboard',
      path: '/customer',
      file: 'src/pages/CustomerDashboard.tsx',
      description: 'Dashboard do cliente com histórico de pedidos e perfil',
      features: ['Histórico de pedidos', 'Perfil do cliente', 'Endereços', 'Métodos de pagamento'],
      roles: ['customer'],
      status: 'active',
      category: 'customer'
    },
    {
      name: 'RestaurantDashboard',
      path: '/restaurant',
      file: 'src/pages/RestaurantDashboard.tsx',
      description: 'Dashboard do restaurante com gestão de pedidos e menu',
      features: ['Gestão de pedidos', 'Gestão de menu', 'Estatísticas', 'Configurações'],
      roles: ['restaurant_admin', 'restaurant_staff'],
      status: 'active',
      category: 'restaurant'
    },
    {
      name: 'KitchenDashboard',
      path: '/kitchen',
      file: 'src/pages/KitchenDashboard.tsx',
      description: 'Dashboard da cozinha para gestão de pedidos em tempo real',
      features: ['Pedidos em tempo real', 'Status de preparação', 'Tempos de entrega'],
      roles: ['kitchen_staff'],
      status: 'active',
      category: 'restaurant'
    },
    {
      name: 'DriverDashboard',
      path: '/driver',
      file: 'src/pages/DriverDashboard.tsx',
      description: 'Dashboard do motorista com entregas e estatísticas',
      features: ['Entregas ativas', 'Histórico', 'Estatísticas', 'Mapa'],
      roles: ['driver'],
      status: 'active',
      category: 'driver'
    },
    {
      name: 'MonetizationManagement',
      path: '/monetization',
      file: 'src/pages/MonetizationManagement.tsx',
      description: 'Gestão de monetização, comissões e receitas',
      features: ['Configuração de comissões', 'Relatórios financeiros', 'Análise de receitas'],
      roles: ['platform_owner', 'super_admin'],
      status: 'active',
      category: 'admin'
    },
    {
      name: 'HelpCenter',
      path: '/help-center',
      file: 'src/pages/HelpCenter.tsx',
      description: 'Centro de ajuda completo com documentação e guias',
      features: ['Documentação completa', 'Guias de uso', 'FAQ', 'Suporte técnico'],
      roles: ['all'],
      status: 'active',
      category: 'support'
    }
  ]

  // 🧩 COMPONENTES ADMINISTRATIVOS
  const adminComponents = [
    {
      name: 'DriverManagement',
      file: 'src/components/admin/DriverManagement.tsx',
      description: 'Gestão completa de motoristas com aprovação/rejeição',
      features: ['Lista de motoristas', 'Aprovação/Rejeição', 'Envio de emails', 'Filtros avançados', 'Notificações push'],
      category: 'admin',
      status: 'active'
    },
    {
      name: 'UserManagementDialog',
      file: 'src/components/admin/UserManagementDialog.tsx',
      description: 'Dialog para criação e edição de utilizadores',
      features: ['Criação de utilizadores', 'Edição de perfis', 'Gestão de roles', 'Validação de dados'],
      category: 'admin',
      status: 'active'
    },
    {
      name: 'UserRoleManagement',
      file: 'src/components/admin/UserRoleManagement.tsx',
      description: 'Gestão avançada de roles e permissões',
      features: ['Atribuição de roles', 'Gestão de permissões', 'Hierarquia de acesso'],
      category: 'admin',
      status: 'active'
    },
    {
      name: 'CreateRestaurantDialog',
      file: 'src/components/admin/CreateRestaurantDialog.tsx',
      description: 'Dialog para criação de novos restaurantes',
      features: ['Criação de restaurantes', 'Upload de imagens', 'Configuração inicial'],
      category: 'admin',
      status: 'active'
    },
    {
      name: 'DeliveryAreasManager',
      file: 'src/components/admin/DeliveryAreasManager.tsx',
      description: 'Gestão de áreas de entrega com mapas',
      features: ['Definição de áreas', 'Mapas interativos', 'Cálculo de distâncias'],
      category: 'admin',
      status: 'active'
    },
    {
      name: 'MenuBuilder',
      file: 'src/components/admin/MenuBuilder.tsx',
      description: 'Construtor visual de menus para restaurantes',
      features: ['Editor visual', 'Categorias', 'Preços', 'Imagens'],
      category: 'admin',
      status: 'active'
    },
    {
      name: 'MenuTemplatesGallery',
      file: 'src/components/admin/MenuTemplatesGallery.tsx',
      description: 'Galeria de templates de menu pré-definidos',
      features: ['Templates prontos', 'Clonagem de menus', 'Personalização'],
      category: 'admin',
      status: 'active'
    }
  ]

  // 📱 COMPONENTES DO APP DRIVER
  const driverAppComponents = [
    {
      name: 'ActivationScreen',
      file: 'Driver/src/screens/auth/ActivationScreen.tsx',
      description: 'Tela de ativação de conta do motorista via deep linking',
      features: ['Deep linking', 'Definição de password', 'Validação de token', 'Ativação automática'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'LoginScreen',
      file: 'Driver/src/screens/auth/LoginScreen.tsx',
      description: 'Tela de login do motorista',
      features: ['Autenticação', 'Validação', 'Recuperação de password'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'HomeScreen',
      file: 'Driver/src/screens/delivery/HomeScreen.tsx',
      description: 'Tela principal do motorista com entregas disponíveis',
      features: ['Lista de entregas', 'Status online/offline', 'Notificações'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'ActiveDeliveryScreen',
      file: 'Driver/src/screens/delivery/ActiveDeliveryScreen.tsx',
      description: 'Tela de entrega ativa com navegação',
      features: ['Navegação GPS', 'Status da entrega', 'Comunicação com cliente'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'ProfileScreen',
      file: 'Driver/src/screens/profile/ProfileScreen.tsx',
      description: 'Perfil do motorista com estatísticas',
      features: ['Dados pessoais', 'Estatísticas', 'Configurações', 'Documentos'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'HistoryScreen',
      file: 'Driver/src/screens/profile/HistoryScreen.tsx',
      description: 'Histórico completo de entregas do motorista',
      features: ['Lista de entregas', 'Filtros', 'Detalhes', 'Ganhos'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'MapScreen',
      file: 'Driver/src/screens/delivery/MapScreen.tsx',
      description: 'Mapa com localização e entregas próximas',
      features: ['Mapa interativo', 'Localização em tempo real', 'Entregas próximas'],
      category: 'driver-app',
      status: 'active'
    },
    {
      name: 'DeliveryTracking',
      file: 'Driver/src/components/delivery/DeliveryTracking.tsx',
      description: 'Componente de tracking de entrega em tempo real',
      features: ['Tracking GPS', 'Atualizações automáticas', 'Status da entrega'],
      category: 'driver-app',
      status: 'active'
    }
  ]

  // 🏠 COMPONENTES DE LAYOUT E UI
  const layoutComponents = [
    {
      name: 'Header',
      file: 'src/components/layout/Header.tsx',
      description: 'Cabeçalho principal da aplicação',
      features: ['Navegação', 'Menu de utilizador', 'Notificações'],
      category: 'layout',
      status: 'active'
    },
    {
      name: 'ProtectedRoute',
      file: 'src/components/layout/ProtectedRoute.tsx',
      description: 'Componente para proteção de rotas por role',
      features: ['Autenticação', 'Autorização', 'Redirecionamento'],
      category: 'layout',
      status: 'active'
    },
    {
      name: 'ScopeNavigationBar',
      file: 'src/components/layout/ScopeNavigationBar.tsx',
      description: 'Barra de navegação com contexto de organização',
      features: ['Navegação contextual', 'Filtros de scope', 'Breadcrumbs'],
      category: 'layout',
      status: 'active'
    },
    {
      name: 'ViewScopeBreadcrumb',
      file: 'src/components/layout/ViewScopeBreadcrumb.tsx',
      description: 'Breadcrumb com informação de scope atual',
      features: ['Navegação hierárquica', 'Contexto visual'],
      category: 'layout',
      status: 'active'
    }
  ]

  // 💳 COMPONENTES DE PAGAMENTO
  const paymentComponents = [
    {
      name: 'StripeCheckout',
      file: 'src/components/payment/StripeCheckout.tsx',
      description: 'Checkout integrado com Stripe',
      features: ['Pagamentos por cartão', 'Validação', 'Segurança PCI'],
      category: 'payment',
      status: 'active'
    },
    {
      name: 'MBWayPayment',
      file: 'src/components/payment/MBWayPayment.tsx',
      description: 'Pagamento via MB Way',
      features: ['Integração MB Way', 'Validação de número', 'Confirmação automática'],
      category: 'payment',
      status: 'active'
    },
    {
      name: 'MultibancoPayment',
      file: 'src/components/payment/MultibancoPayment.tsx',
      description: 'Pagamento via Multibanco',
      features: ['Referência Multibanco', 'QR Code', 'Validação automática'],
      category: 'payment',
      status: 'active'
    }
  ]

  // 📤 COMPONENTES DE UPLOAD
  const uploadComponents = [
    {
      name: 'ImageUpload',
      file: 'src/components/upload/ImageUpload.tsx',
      description: 'Upload de imagens com preview e validação',
      features: ['Drag & drop', 'Preview', 'Compressão', 'Validação'],
      category: 'upload',
      status: 'active'
    },
    {
      name: 'MenuImageUpload',
      file: 'src/components/upload/MenuImageUpload.tsx',
      description: 'Upload específico para imagens de menu',
      features: ['Upload otimizado', 'Redimensionamento', 'Formatos múltiplos'],
      category: 'upload',
      status: 'active'
    }
  ]

  // 🏪 COMPONENTES DE RESTAURANTE
  const restaurantComponents = [
    {
      name: 'RestaurantCard',
      file: 'src/components/home/RestaurantCard.tsx',
      description: 'Card de restaurante na página inicial',
      features: ['Informações do restaurante', 'Avaliações', 'Tempo de entrega'],
      category: 'restaurant',
      status: 'active'
    },
    {
      name: 'PopularRestaurants',
      file: 'src/components/home/PopularRestaurants.tsx',
      description: 'Secção de restaurantes populares',
      features: ['Lista de populares', 'Filtros', 'Ordenação'],
      category: 'restaurant',
      status: 'active'
    },
    {
      name: 'Categories',
      file: 'src/components/home/Categories.tsx',
      description: 'Categorias de restaurantes e comida',
      features: ['Grid de categorias', 'Ícones', 'Navegação'],
      category: 'restaurant',
      status: 'active'
    }
  ]

  // 🔧 EDGE FUNCTIONS (BACKEND)
  const edgeFunctions = [
    {
      name: 'admin-create-user',
      file: 'supabase/functions/admin-create-user/index.ts',
      description: 'Criação de utilizadores pelo admin com fluxo específico para drivers',
      features: ['Criação no Supabase Auth', 'Geração de senha temporária', 'Trigger automático para drivers', 'Validação de dados', 'Integração com profiles'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'send-driver-activation',
      file: 'supabase/functions/send-driver-activation/index.ts',
      description: 'Sistema completo de ativação de motoristas via email com deep linking',
      features: ['Email HTML personalizado', 'Deep linking para app móvel', 'Template Brevo', 'Geração de link de ativação', 'Senha temporária', 'Validação de token', 'Atualização de status'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'notify-driver-status',
      file: 'supabase/functions/notify-driver-status/index.ts',
      description: 'Notificação de aprovação/rejeição de motoristas',
      features: ['Email de aprovação/rejeição', 'Push notifications', 'Templates HTML', 'Atualização de status'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'send-push-notification',
      file: 'supabase/functions/send-push-notification/index.ts',
      description: 'Envio de notificações push para motoristas',
      features: ['Expo Push API', 'Gestão de tokens', 'Log de notificações', 'Targeting por utilizador'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'process-order',
      file: 'supabase/functions/process-order/index.ts',
      description: 'Processamento de pedidos e gestão de estados',
      features: ['Validação de pedidos', 'Gestão de estados', 'Notificações automáticas'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'generate-daily-deliveries',
      file: 'supabase/functions/generate-daily-deliveries/index.ts',
      description: 'Geração automática de entregas diárias',
      features: ['Algoritmo de otimização', 'Distribuição por zonas', 'Agendamento automático'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'stripe-webhook',
      file: 'supabase/functions/stripe-webhook/index.ts',
      description: 'Webhook para processamento de pagamentos Stripe',
      features: ['Validação de webhooks', 'Atualização de estados', 'Logs de transações'],
      category: 'backend',
      status: 'active'
    },
    {
      name: 'mbway-webhook',
      file: 'supabase/functions/mbway-webhook/index.ts',
      description: 'Webhook para processamento de pagamentos MB Way',
      features: ['Validação de webhooks', 'Confirmação automática', 'Integração com pedidos'],
      category: 'backend',
      status: 'active'
    }
  ]

  // 🚚 SISTEMA DE ATIVAÇÃO DE DRIVERS (FLUXO COMPLETO)
  const driverActivationSystem = [
    {
      name: 'Fluxo de Criação de Driver',
      description: 'Sistema completo estilo UberEats para onboarding de motoristas',
      features: [
        'Criação automática de contas',
        'Email de ativação personalizado',
        'Deep linking para app móvel',
        'Gestão de estados completa',
        'Aprovação manual pelo admin'
      ],
      steps: [
        '1. Admin cria driver via AdminDashboard',
        '2. Edge Function admin-create-user processa dados',
        '3. Criação no Supabase Auth (email_confirm: false)',
        '4. Trigger automático cria entrada na tabela drivers',
        '5. Edge Function send-driver-activation envia email',
        '6. Driver recebe email com link de ativação',
        '7. Deep linking abre app móvel',
        '8. Driver define nova senha',
        '9. Conta ativada automaticamente',
        '10. Admin aprova/rejeita manualmente'
      ],
      components: [
        'AdminDashboard (criação)',
        'DriverManagement (gestão)',
        'admin-create-user (backend)',
        'send-driver-activation (email)',
        'ActivationScreen (app móvel)',
        'notify-driver-status (aprovação)'
      ],
      status: 'active',
      category: 'driver-system'
    },
    {
      name: 'Estados do Driver',
      description: 'Gestão de estados durante o processo de ativação',
      features: [
        'Gestão de estados completa',
        'Transições automáticas',
        'Validação de estados',
        'Histórico de mudanças'
      ],
      states: [
        'pending_activation - Aguarda ativação via email',
        'active - Conta ativada, aguarda aprovação',
        'approved - Aprovado pelo admin, pode trabalhar',
        'rejected - Rejeitado pelo admin',
        'suspended - Suspenso temporariamente'
      ],
      transitions: [
        'pending_activation → active (via app móvel)',
        'active → approved/rejected (via admin)',
        'approved → suspended (via admin)',
        'suspended → approved (via admin)'
      ],
      status: 'active',
      category: 'driver-system'
    },
    {
      name: 'Segurança e Validações',
      description: 'Medidas de segurança implementadas no sistema',
      features: [
        'Tokens de ativação únicos e temporários',
        'Validação de email obrigatória',
        'Senhas temporárias seguras',
        'Deep linking com validação',
        'CORS configurado corretamente',
        'Logs de todas as operações',
        'Rate limiting nas Edge Functions',
        'Validação de dados em múltiplas camadas'
      ],
      status: 'active',
      category: 'driver-system'
    }
  ]

  // Combinar todos os componentes
  const allComponents = [
    ...dashboards.map(item => ({ ...item, type: 'dashboard' })),
    ...adminComponents.map(item => ({ ...item, type: 'component' })),
    ...driverAppComponents.map(item => ({ ...item, type: 'component' })),
    ...layoutComponents.map(item => ({ ...item, type: 'component' })),
    ...paymentComponents.map(item => ({ ...item, type: 'component' })),
    ...uploadComponents.map(item => ({ ...item, type: 'component' })),
    ...restaurantComponents.map(item => ({ ...item, type: 'component' })),
    ...edgeFunctions.map(item => ({ ...item, type: 'function' })),
    ...driverActivationSystem.map(item => ({ ...item, type: 'system' }))
  ]

  // Filtrar componentes
  const filteredComponents = allComponents.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', name: 'Todos', icon: Grid, count: allComponents.length },
    { id: 'admin', name: 'Administração', icon: Shield, count: allComponents.filter(c => c.category === 'admin').length },
    { id: 'driver-app', name: 'App Motorista', icon: Truck, count: allComponents.filter(c => c.category === 'driver-app').length },
    { id: 'driver-system', name: 'Sistema Drivers', icon: UserCheck, count: allComponents.filter(c => c.category === 'driver-system').length },
    { id: 'customer', name: 'Cliente', icon: User, count: allComponents.filter(c => c.category === 'customer').length },
    { id: 'restaurant', name: 'Restaurante', icon: Store, count: allComponents.filter(c => c.category === 'restaurant').length },
    { id: 'payment', name: 'Pagamentos', icon: CreditCard, count: allComponents.filter(c => c.category === 'payment').length },
    { id: 'layout', name: 'Layout', icon: Layout, count: allComponents.filter(c => c.category === 'layout').length },
    { id: 'upload', name: 'Upload', icon: Upload, count: allComponents.filter(c => c.category === 'upload').length },
    { id: 'backend', name: 'Backend', icon: Server, count: allComponents.filter(c => c.category === 'backend').length },
    { id: 'support', name: 'Suporte', icon: HelpCircle, count: allComponents.filter(c => c.category === 'support').length }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'beta': return 'bg-yellow-100 text-yellow-800'
      case 'deprecated': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dashboard': return Monitor
      case 'component': return Component
      case 'function': return Zap
      case 'system': return Workflow
      default: return FileText
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dashboard': return 'bg-blue-100 text-blue-800'
      case 'component': return 'bg-purple-100 text-purple-800'
      case 'function': return 'bg-orange-100 text-orange-800'
      case 'system': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>
              <div className="h-6 w-px bg-slate-300" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">📚 Documentação Técnica</h1>
                <p className="text-sm text-slate-600">Dashboards, Componentes TSX e Edge Functions</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {allComponents.length} Componentes
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar componentes, dashboards ou funções..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="ml-1">
                    {category.count}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComponents.map((component, index) => {
            const TypeIcon = getTypeIcon(component.type)
            return (
              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <TypeIcon className="h-5 w-5 text-slate-600" />
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {component.name}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge className={getTypeColor(component.type)}>
                        {component.type}
                      </Badge>
                      <Badge className={getStatusColor(component.status)}>
                        {component.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-slate-600 text-sm leading-relaxed">
                    {component.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* File Path */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-xs text-slate-600">
                        <FileText className="h-3 w-3" />
                        <code className="font-mono">{component.file}</code>
                      </div>
                    </div>

                    {/* Path (for dashboards) */}
                    {component.path && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-xs text-blue-700">
                          <Globe className="h-3 w-3" />
                          <code className="font-mono">{component.path}</code>
                        </div>
                      </div>
                    )}

                    {/* Roles (for dashboards) */}
                    {component.roles && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-2">Roles:</p>
                        <div className="flex flex-wrap gap-1">
                          {component.roles.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features */}
                    {component.features && component.features.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-2">Funcionalidades:</p>
                        <ul className="text-xs text-slate-600 space-y-1 max-h-40 overflow-y-auto">
                          {component.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Steps (for driver system) */}
                    {component.steps && component.steps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-2">Fluxo:</p>
                        <ul className="text-xs text-slate-600 space-y-1 max-h-48 overflow-y-auto">
                          {component.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                                {idx + 1}
                              </div>
                              <span>{step.replace(/^\d+\.\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* States (for driver system) */}
                    {component.states && component.states.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-2">Estados:</p>
                        <ul className="text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                          {component.states.map((state, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0"></div>
                              <span>{state}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Components (for driver system) */}
                    {component.components && component.components.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-2">Componentes:</p>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {component.components.map((comp, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {component.path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(component.path, '_blank')}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(component.file)}
                        className="flex-1"
                      >
                        <Code className="h-3 w-3 mr-1" />
                        Copiar Path
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* No Results */}
        {filteredComponents.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-slate-600">Tente ajustar os filtros ou termo de pesquisa.</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-12 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Resumo do Sistema</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboards.length}</div>
              <div className="text-sm text-slate-600">Dashboards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {adminComponents.length + driverAppComponents.length + layoutComponents.length + paymentComponents.length + uploadComponents.length + restaurantComponents.length}
              </div>
              <div className="text-sm text-slate-600">Componentes TSX</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{edgeFunctions.length}</div>
              <div className="text-sm text-slate-600">Edge Functions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{driverActivationSystem.length}</div>
              <div className="text-sm text-slate-600">Sistemas Drivers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{allComponents.filter(c => c.status === 'active').length}</div>
              <div className="text-sm text-slate-600">Ativos</div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">🔗 Links Rápidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="justify-start h-auto p-4"
            >
              <Shield className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Admin Dashboard</div>
                <div className="text-xs text-slate-600">Gestão principal</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/organizations')}
              className="justify-start h-auto p-4"
            >
              <Building2 className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Organizações</div>
                <div className="text-xs text-slate-600">Portal global</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/help-center')}
              className="justify-start h-auto p-4"
            >
              <HelpCircle className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Centro de Ajuda</div>
                <div className="text-xs text-slate-600">Documentação completa</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpDocumentation