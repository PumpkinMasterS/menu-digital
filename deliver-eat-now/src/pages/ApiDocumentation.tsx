import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Code, 
  Copy, 
  ExternalLink, 
  Shield, 
  Zap,
  Database,
  Webhook,
  Key,
  Users,
  ShoppingCart,
  Building2,
  Eye
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ApiDocumentation = () => {
  const { toast } = useToast()
  const [activeEndpoint, setActiveEndpoint] = useState('')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Código copiado para a área de transferência"
    })
  }

  const apiEndpoints = [
    {
      category: "Autenticação",
      icon: Shield,
      endpoints: [
        {
          method: "POST",
          path: "/auth/signup",
          description: "Registar novo utilizador",
          params: ["email", "password", "full_name", "role?", "organization_id?"],
          example: `{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "João Silva",
  "role": "customer"
}`
        },
        {
          method: "POST",
          path: "/auth/signin",
          description: "Fazer login",
          params: ["email", "password"],
          example: `{
  "email": "user@example.com",
  "password": "securepassword"
}`
        }
      ]
    },
    {
      category: "Restaurantes",
      icon: Building2,
      endpoints: [
        {
          method: "GET",
          path: "/api/restaurants",
          description: "Listar restaurantes",
          params: ["organization_id?", "is_active?", "category?"],
          example: `GET /api/restaurants?organization_id=123&is_active=true`
        },
        {
          method: "GET",
          path: "/api/restaurants/:id",
          description: "Obter detalhes do restaurante",
          params: ["id"],
          example: `GET /api/restaurants/550e8400-e29b-41d4-a716-446655440000`
        },
        {
          method: "GET",
          path: "/api/restaurants/:id/meals",
          description: "Listar refeições do restaurante",
          params: ["id", "category_id?", "is_available?"],
          example: `GET /api/restaurants/123/meals?is_available=true`
        }
      ]
    },
    {
      category: "Pedidos",
      icon: ShoppingCart,
      endpoints: [
        {
          method: "POST",
          path: "/functions/v1/process-order",
          description: "Criar novo pedido",
          params: ["user_id", "restaurant_id", "items[]", "delivery_address"],
          example: `{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "restaurant_id": "550e8400-e29b-41d4-a716-446655440001",
  "items": [
    {
      "meal_id": "550e8400-e29b-41d4-a716-446655440002",
      "quantity": 2,
      "unit_price": 12.50
    }
  ],
  "subtotal": 25.00,
  "delivery_fee": 2.50,
  "total_amount": 27.50,
  "delivery_address": "Rua das Flores, 123, Lisboa"
}`
        },
        {
          method: "GET",
          path: "/api/orders",
          description: "Listar pedidos do utilizador",
          params: ["user_id", "status?", "limit?"],
          example: `GET /api/orders?user_id=123&status=delivered&limit=10`
        },
        {
          method: "PATCH",
          path: "/api/orders/:id/status",
          description: "Atualizar status do pedido",
          params: ["id", "status"],
          example: `{
  "status": "preparing"
}`
        }
      ]
    },
    {
      category: "Organizações",
      icon: Users,
      endpoints: [
        {
          method: "GET",
          path: "/api/organizations",
          description: "Listar organizações (Platform Owner)",
          params: ["is_active?", "subscription_tier?"],
          example: `GET /api/organizations?is_active=true`
        },
        {
          method: "POST",
          path: "/api/organizations",
          description: "Criar nova organização",
          params: ["name", "slug", "billing_email", "subscription_tier"],
          example: `{
  "name": "Restaurante do João",
  "slug": "restaurante-do-joao",
  "billing_email": "joao@restaurante.com",
  "subscription_tier": "starter"
}`
        }
      ]
    }
  ]

  const edgeFunctions = [
    {
      name: "process-order",
      description: "Processar pedidos com validações e criação de itens",
      url: "https://misswwtaysshbnnsjhtv.functions.supabase.co/process-order",
      method: "POST"
    },
    {
      name: "generate-daily-deliveries",
      description: "Gerar entregas diárias para subscrições ativas",
      url: "https://misswwtaysshbnnsjhtv.functions.supabase.co/generate-daily-deliveries",
      method: "POST"
    },
    {
      name: "stripe-webhook",
      description: "Webhook para processar eventos do Stripe",
      url: "https://misswwtaysshbnnsjhtv.functions.supabase.co/stripe-webhook",
      method: "POST"
    },
    {
      name: "mbway-webhook",
      description: "Webhook para processar pagamentos MB WAY",
      url: "https://misswwtaysshbnnsjhtv.functions.supabase.co/mbway-webhook",
      method: "POST"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Code className="h-8 w-8 text-emerald-600" />
            Documentação da API
          </h1>
          <p className="text-gray-600 mt-2">
            Documentação completa para desenvolvedores da plataforma SaborPortuguês
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="auth">Autenticação</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="examples">Exemplos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-600" />
                  Informações Gerais
                </CardTitle>
                <CardDescription>
                  API RESTful baseada em Supabase com Edge Functions para operações complexas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <Database className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <div className="font-semibold">Base URL</div>
                    <div className="text-sm text-gray-600">https://misswwtaysshbnnsjhtv.supabase.co</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Key className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold">Autenticação</div>
                    <div className="text-sm text-gray-600">JWT Bearer Token</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="font-semibold">Segurança</div>
                    <div className="text-sm text-gray-600">RLS + Multi-tenancy</div>
                  </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Headers Obrigatórios</h4>
                  <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`Authorization: Bearer <your-jwt-token>
apikey: <your-anon-key>
Content-Type: application/json`}
                  </pre>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => copyToClipboard(`Authorization: Bearer <your-jwt-token>
apikey: <your-anon-key>
Content-Type: application/json`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Edge Functions</CardTitle>
                  <CardDescription>Funções serverless para operações complexas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {edgeFunctions.map((func, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{func.name}</div>
                          <div className="text-sm text-gray-600">{func.description}</div>
                        </div>
                        <Badge variant={func.method === 'POST' ? 'default' : 'secondary'}>
                          {func.method}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rate Limits</CardTitle>
                  <CardDescription>Limites de utilização da API</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Requests por minuto</span>
                      <Badge>1000</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Concurrent connections</span>
                      <Badge>100</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Upload file size</span>
                      <Badge>5MB</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Request timeout</span>
                      <Badge>30s</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sistema de Autenticação</CardTitle>
                <CardDescription>
                  Autenticação baseada em JWT com roles e multi-tenancy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Registar Utilizador</h4>
                  <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "data": {
    "full_name": "João Silva",
    "role": "customer",
    "organization_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}`}
                  </pre>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Login</h4>
                  <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Badge variant="secondary">customer</Badge>
                  <Badge variant="secondary">driver</Badge>
                  <Badge variant="secondary">restaurant_admin</Badge>
                  <Badge variant="secondary">super_admin</Badge>
                  <Badge variant="secondary">platform_owner</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            {apiEndpoints.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-emerald-600" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.endpoints.map((endpoint, endpointIndex) => (
                      <div key={endpointIndex} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              endpoint.method === 'GET' ? 'secondary' : 
                              endpoint.method === 'POST' ? 'default' : 
                              'destructive'
                            }>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm font-mono">{endpoint.path}</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setActiveEndpoint(
                              activeEndpoint === `${categoryIndex}-${endpointIndex}` 
                                ? '' 
                                : `${categoryIndex}-${endpointIndex}`
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {endpoint.params.map((param, paramIndex) => (
                            <Badge key={paramIndex} variant="outline" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>

                        {activeEndpoint === `${categoryIndex}-${endpointIndex}` && (
                          <div className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                            <pre>{endpoint.example}</pre>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => copyToClipboard(endpoint.example)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-emerald-600" />
                  Webhooks Disponíveis
                </CardTitle>
                <CardDescription>
                  Endpoints para integração com serviços externos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Stripe Webhook</h4>
                    <code className="text-sm bg-gray-100 p-2 rounded block mb-2">
                      https://misswwtaysshbnnsjhtv.functions.supabase.co/stripe-webhook
                    </code>
                    <p className="text-sm text-gray-600">
                      Processa eventos de pagamento do Stripe (subscrições, faturas, etc.)
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">MB WAY Webhook</h4>
                    <code className="text-sm bg-gray-100 p-2 rounded block mb-2">
                      https://misswwtaysshbnnsjhtv.functions.supabase.co/mbway-webhook
                    </code>
                    <p className="text-sm text-gray-600">
                      Processa confirmações de pagamento MB WAY via SIBS Pay
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exemplos de Integração</CardTitle>
                <CardDescription>
                  Código de exemplo para integrar com a API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">JavaScript / TypeScript</h4>
                  <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://misswwtaysshbnnsjhtv.supabase.co',
  'your-anon-key'
)

// Fazer login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Buscar restaurantes
const { data: restaurants } = await supabase
  .from('restaurants')
  .select('*')
  .eq('is_active', true)

// Criar pedido
const { data: order } = await supabase.functions.invoke('process-order', {
  body: {
    user_id: user.id,
    restaurant_id: 'restaurant-id',
    items: [{ meal_id: 'meal-id', quantity: 2, unit_price: 12.50 }],
    delivery_address: 'Rua das Flores, 123'
  }
})`}
                  </pre>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => copyToClipboard(`import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://misswwtaysshbnnsjhtv.supabase.co',
  'your-anon-key'
)

// Fazer login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Buscar restaurantes
const { data: restaurants } = await supabase
  .from('restaurants')
  .select('*')
  .eq('is_active', true)

// Criar pedido
const { data: order } = await supabase.functions.invoke('process-order', {
  body: {
    user_id: user.id,
    restaurant_id: 'restaurant-id',
    items: [{ meal_id: 'meal-id', quantity: 2, unit_price: 12.50 }],
    delivery_address: 'Rua das Flores, 123'
  }
})`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">cURL</h4>
                  <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`# Login
curl -X POST 'https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/token?grant_type=password' \\
-H 'apikey: your-anon-key' \\
-H 'Content-Type: application/json' \\
-d '{
  "email": "user@example.com",
  "password": "password"
}'

# Buscar restaurantes
curl -X GET 'https://misswwtaysshbnnsjhtv.supabase.co/rest/v1/restaurants?is_active=eq.true' \\
-H 'apikey: your-anon-key' \\
-H 'Authorization: Bearer your-jwt-token' \\
-H 'Content-Type: application/json'`}
                  </pre>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => copyToClipboard(`# Login
curl -X POST 'https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/token?grant_type=password' \\
-H 'apikey: your-anon-key' \\
-H 'Content-Type: application/json' \\
-d '{
  "email": "user@example.com",
  "password": "password"
}'

# Buscar restaurantes
curl -X GET 'https://misswwtaysshbnnsjhtv.supabase.co/rest/v1/restaurants?is_active=eq.true' \\
-H 'apikey: your-anon-key' \\
-H 'Authorization: Bearer your-jwt-token' \\
-H 'Content-Type: application/json'`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Links Úteis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a 
                    href="https://supabase.com/docs/reference/javascript/introduction" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Documentação Supabase</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  
                  <a 
                    href="https://supabase.com/docs/guides/api/rest/introduction" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>REST API Reference</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  
                  <a 
                    href="https://supabase.com/docs/guides/auth" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Authentication Guide</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  
                  <a 
                    href="https://supabase.com/docs/guides/database/postgres/row-level-security" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Row Level Security</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ApiDocumentation 