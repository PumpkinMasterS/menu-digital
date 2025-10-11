import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'
import { Database, Building2, Store, Users, Truck, ShoppingCart, DollarSign } from 'lucide-react'

const ModernSeedData = () => {
  const { user, profile } = useAuth()
  const [isSeeding, setIsSeeding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')

  const updateProgress = (step: string, percent: number) => {
    setCurrentStep(step)
    setProgress(percent)
  }

  const seedCompleteData = async () => {
    if (!user || !profile) {
      toast({
        title: "Erro",
        description: "Precisa estar autenticado para criar dados de seed",
        variant: "destructive"
      })
      return
    }

    setIsSeeding(true)
    updateProgress('Iniciando...', 0)

    try {
      // 1. Criar Organizações
      updateProgress('Criando organizações...', 10)
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: 'Lisboa Food Network',
            slug: 'lisboa-food',
            domain: 'lisboa.saborportuguês.com',
            tier: 'enterprise',
            billing_email: 'billing@lisboa.food'
          },
          {
            name: 'Porto Gourmet Group',
            slug: 'porto-gourmet',
            domain: 'porto.saborportuguês.com', 
            tier: 'premium',
            billing_email: 'billing@porto.gourmet'
          },
          {
            name: 'Coimbra Restaurants',
            slug: 'coimbra-restaurants',
            domain: 'coimbra.saborportuguês.com',
            tier: 'basic',
            billing_email: 'billing@coimbra.rest'
          }
        ])
        .select()

      if (orgError) throw orgError

      // 2. Criar Super Admins
      updateProgress('Criando super admins...', 20)
      const { data: superAdmins, error: adminError } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: user.id, // Current user becomes super admin
            organization_id: organizations![0].id,
            role: 'super_admin',
            full_name: 'João Silva',
            phone: '+351 91 123 4567'
          }
        ])
        .select()

      if (adminError) throw adminError

      // 3. Criar Restaurantes
      updateProgress('Criando restaurantes...', 30)
      const restaurantsData = [
        // Lisboa
        {
          organization_id: organizations![0].id,
          name: 'Taberna Real Lisboa',
          description: 'Cozinha tradicional portuguesa no coração de Lisboa',
          address: 'Rua Augusta, 100, 1100-048 Lisboa',
          phone: '+351 21 123 4567',
          email: 'lisboa@tabernareal.pt',
          delivery_fee: 2.50,
          minimum_order: 15.00,
          delivery_time_min: 30,
          delivery_time_max: 45,
          rating: 4.5,
          is_active: true,
          restaurant_admin_id: user.id
        },
        {
          organization_id: organizations![0].id,
          name: 'Marisqueira Oceano',
          description: 'Especialidades em peixes e mariscos frescos',
          address: 'Cais do Sodré, 25, 1200-109 Lisboa',
          phone: '+351 21 987 6543',
          email: 'oceano@marisqueira.pt',
          delivery_fee: 3.00,
          minimum_order: 20.00,
          delivery_time_min: 25,
          delivery_time_max: 40,
          rating: 4.7,
          is_active: true,
          restaurant_admin_id: user.id
        },
        // Porto
        {
          organization_id: organizations![1].id,
          name: 'Francesinha da Casa Porto',
          description: 'A melhor francesinha da cidade',
          address: 'Rua de Santa Catarina, 200, 4000-450 Porto',
          phone: '+351 22 555 1234',
          email: 'porto@francesinha.pt',
          delivery_fee: 2.00,
          minimum_order: 12.00,
          delivery_time_min: 20,
          delivery_time_max: 35,
          rating: 4.8,
          is_active: true,
          restaurant_admin_id: user.id
        },
        {
          organization_id: organizations![1].id,
          name: 'Tripas à Moda do Porto',
          description: 'Especialidades nortenhas autênticas',
          address: 'Rua de Cedofeita, 50, 4050-175 Porto',
          phone: '+351 22 444 5678',
          email: 'tripas@porto.pt',
          delivery_fee: 2.50,
          minimum_order: 18.00,
          delivery_time_min: 35,
          delivery_time_max: 50,
          rating: 4.3,
          is_active: true,
          restaurant_admin_id: user.id
        },
        // Coimbra
        {
          organization_id: organizations![2].id,
          name: 'Estudantes Gourmet',
          description: 'Comida caseira para estudantes e famílias',
          address: 'Largo da Portagem, 15, 3000-337 Coimbra',
          phone: '+351 23 999 8877',
          email: 'gourmet@estudantes.pt',
          delivery_fee: 1.50,
          minimum_order: 10.00,
          delivery_time_min: 25,
          delivery_time_max: 35,
          rating: 4.1,
          is_active: true,
          restaurant_admin_id: user.id
        }
      ]

      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .insert(restaurantsData)
        .select()

      if (restError) throw restError

      // 4. Criar Motoristas
      updateProgress('Criando motoristas...', 40)
      const driversData = [
        {
          organization_id: organizations![0].id,
          profile_id: user.id,
          vehicle_type: 'motorcycle',
          license_plate: 'AB-12-34',
          phone: '+351 91 111 2222',
          status: 'online',
          is_available: true
        },
        {
          organization_id: organizations![0].id,
          profile_id: user.id,
          vehicle_type: 'car',
          license_plate: 'CD-56-78',
          phone: '+351 91 333 4444',
          status: 'online',
          is_available: true
        },
        {
          organization_id: organizations![1].id,
          profile_id: user.id,
          vehicle_type: 'bicycle',
          license_plate: 'BIKE-01',
          phone: '+351 91 555 6666',
          status: 'online',
          is_available: true
        }
      ]

      const { data: drivers, error: driverError } = await supabase
        .from('drivers')
        .insert(driversData)
        .select()

      if (driverError) throw driverError

      // 5. Criar Categorias de Menu
      updateProgress('Criando categorias de menu...', 50)
      const categoriesData = restaurants!.map(restaurant => [
        {
          restaurant_id: restaurant.id,
          name: 'Entradas',
          description: 'Pratos para começar bem a refeição',
          sort_order: 1
        },
        {
          restaurant_id: restaurant.id,
          name: 'Pratos Principais',
          description: 'Os nossos melhores pratos tradicionais',
          sort_order: 2
        },
        {
          restaurant_id: restaurant.id,
          name: 'Sobremesas',
          description: 'Doces tradicionais para finalizar',
          sort_order: 3
        }
      ]).flat()

      const { data: categories, error: catError } = await supabase
        .from('menu_categories')
        .insert(categoriesData)
        .select()

      if (catError) throw catError

      // 6. Criar Itens de Menu
      updateProgress('Criando itens de menu...', 60)
      const menuItemsData = []
      
      restaurants!.forEach((restaurant, idx) => {
        const restCategories = categories!.filter(c => c.restaurant_id === restaurant.id)
        
        // Entradas
        const entradaCat = restCategories.find(c => c.name === 'Entradas')
        if (entradaCat) {
          menuItemsData.push({
            restaurant_id: restaurant.id,
            category_id: entradaCat.id,
            name: 'Caldo Verde',
            description: 'Sopa tradicional com couve, batata e chouriço',
            base_price: 6.50,
            is_available: true,
            sort_order: 1
          })
        }

        // Pratos principais
        const pratosCat = restCategories.find(c => c.name === 'Pratos Principais')
        if (pratosCat) {
          menuItemsData.push(
            {
              restaurant_id: restaurant.id,
              category_id: pratosCat.id,
              name: idx === 0 ? 'Bacalhau à Brás' : idx === 1 ? 'Caldeirada' : idx === 2 ? 'Francesinha' : 'Tripas à Moda do Porto',
              description: 'Especialidade da casa com ingredientes frescos',
              base_price: Math.round((12 + Math.random() * 8) * 100) / 100,
              is_available: true,
              is_featured: true,
              sort_order: 1
            },
            {
              restaurant_id: restaurant.id,
              category_id: pratosCat.id,
              name: 'Bife à Portuguesa',
              description: 'Bife grelhado com ovo e batatas fritas',
              base_price: Math.round((14 + Math.random() * 6) * 100) / 100,
              is_available: true,
              sort_order: 2
            }
          )
        }

        // Sobremesas
        const sobremesasCat = restCategories.find(c => c.name === 'Sobremesas')
        if (sobremesasCat) {
          menuItemsData.push({
            restaurant_id: restaurant.id,
            category_id: sobremesasCat.id,
            name: 'Pastéis de Nata',
            description: '6 pastéis de nata tradicionais com canela',
            base_price: 7.20,
            is_available: true,
            sort_order: 1
          })
        }
      })

      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .insert(menuItemsData)
        .select()

      if (menuError) throw menuError

      // 7. Criar Pedidos de Exemplo
      updateProgress('Criando pedidos de exemplo...', 70)
      const ordersData = []
      const today = new Date()
      
      for (let i = 0; i < 25; i++) {
        const randomRestaurant = restaurants![Math.floor(Math.random() * restaurants!.length)]
        const orderDate = new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
        
        ordersData.push({
          user_id: user.id,
          restaurant_id: randomRestaurant.id,
          total_amount: Math.round((15 + Math.random() * 35) * 100) / 100,
          delivery_fee: randomRestaurant.delivery_fee,
          status: ['delivered', 'delivered', 'delivered', 'preparing', 'pending'][Math.floor(Math.random() * 5)],
          delivery_address: 'Rua de Exemplo, 123, Lisboa',
          phone: '+351 91 999 8888',
          created_at: orderDate.toISOString(),
          delivered_at: Math.random() > 0.3 ? new Date(orderDate.getTime() + 45 * 60 * 1000).toISOString() : null
        })
      }

      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .insert(ordersData)
        .select()

      if (orderError) throw orderError

      // 8. Criar Utilizadores Extra
      updateProgress('Criando utilizadores extras...', 80)
      const extraUsersData = [
        {
          user_id: user.id,
          organization_id: organizations![0].id,
          role: 'customer',
          full_name: 'Maria Santos',
          phone: '+351 91 777 8888'
        },
        {
          user_id: user.id,
          organization_id: organizations![0].id,
          role: 'driver',
          full_name: 'Pedro Costa',
          phone: '+351 91 666 7777'
        },
        {
          user_id: user.id,
          organization_id: organizations![1].id,
          role: 'restaurant_admin',
          full_name: 'Ana Ferreira',
          phone: '+351 91 555 6666'
        }
      ]

      const { data: extraUsers, error: userError } = await supabase
        .from('profiles')
        .insert(extraUsersData)
        .select()

      if (userError) throw userError

      updateProgress('Concluído!', 100)

      toast({
        title: "🎉 Dados criados com sucesso!",
        description: `Criados: ${organizations?.length} organizações, ${restaurants?.length} restaurantes, ${orders?.length} pedidos, ${menuItems?.length} itens de menu`,
      })

    } catch (error: any) {
      console.error('Seed error:', error)
      toast({
        title: "Erro ao criar dados",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSeeding(false)
      setProgress(0)
      setCurrentStep('')
    }
  }

  const clearAllData = async () => {
    if (!user || profile?.role !== 'platform_owner') {
      toast({
        title: "Sem permissão",
        description: "Apenas Platform Owners podem limpar dados",
        variant: "destructive"
      })
      return
    }

    setIsSeeding(true)
    updateProgress('Limpando dados...', 50)

    try {
      // Delete in correct order due to foreign keys
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('menu_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('restaurants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('profiles').delete().neq('user_id', user.id) // Keep current user
      await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      updateProgress('Concluído!', 100)
      
      toast({
        title: "Dados limpos",
        description: "Todos os dados de teste foram removidos"
      })
    } catch (error: any) {
      console.error('Clear error:', error)
      toast({
        title: "Erro ao limpar",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSeeding(false)
      setProgress(0)
      setCurrentStep('')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Modern Seed Data
          </CardTitle>
          <CardDescription>
            Criar dados de teste realistas para demonstrar todos os recursos da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          {isSeeding && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Stats Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center space-y-1 p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">3 Organizações</span>
              <span className="text-xs text-gray-500">Lisboa, Porto, Coimbra</span>
            </div>
            <div className="flex flex-col items-center space-y-1 p-3 bg-emerald-50 rounded-lg">
              <Store className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-medium">5 Restaurantes</span>
              <span className="text-xs text-gray-500">Com menus completos</span>
            </div>
            <div className="flex flex-col items-center space-y-1 p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Utilizadores</span>
              <span className="text-xs text-gray-500">Vários roles</span>
            </div>
            <div className="flex flex-col items-center space-y-1 p-3 bg-orange-50 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium">25 Pedidos</span>
              <span className="text-xs text-gray-500">Últimos 7 dias</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={seedCompleteData}
              disabled={isSeeding || !user}
              className="flex-1"
            >
              {isSeeding ? 'A criar dados...' : '🚀 Criar Dados Completos'}
            </Button>
            
            {profile?.role === 'platform_owner' && (
              <Button 
                onClick={clearAllData}
                disabled={isSeeding}
                variant="destructive"
                className="flex-1"
              >
                🗑️ Limpar Todos os Dados
              </Button>
            )}
          </div>

          {!user && (
            <p className="text-sm text-gray-500 text-center">
              ⚠️ Precisa estar autenticado para criar dados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ModernSeedData 