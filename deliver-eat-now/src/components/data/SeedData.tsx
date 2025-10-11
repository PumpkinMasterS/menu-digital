
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

const SeedData = () => {
  const { user } = useAuth()
  const [isSeeding, setIsSeeding] = useState(false)

  const seedRestaurantData = async () => {
    setIsSeeding(true)
    
    try {
      // Insert restaurants
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([
          {
            name: 'Taberna Real',
            description: 'Cozinha tradicional portuguesa com os melhores pratos regionais',
            address: 'Rua Augusta, 100, Lisboa',
            phone: '+351 21 123 4567',
            email: 'taberna@real.pt',
            delivery_fee: 2.50,
            minimum_order: 15.00,
            delivery_time_min: 30,
            delivery_time_max: 45,
            rating: 4.5
          },
          {
            name: 'Marisqueira do Porto',
            description: 'Especialidades em peixes e mariscos frescos do dia',
            address: 'Rua de Cedofeita, 50, Porto',
            phone: '+351 22 987 6543',
            email: 'marisqueira@porto.pt',
            delivery_fee: 3.00,
            minimum_order: 20.00,
            delivery_time_min: 25,
            delivery_time_max: 40,
            rating: 4.7
          },
          {
            name: 'Francesinha da Casa',
            description: 'A melhor francesinha da cidade, receita secreta da família',
            address: 'Rua de Santa Catarina, 200, Porto',
            phone: '+351 22 555 1234',
            email: 'francesinha@casa.pt',
            delivery_fee: 2.00,
            minimum_order: 12.00,
            delivery_time_min: 20,
            delivery_time_max: 35,
            rating: 4.8
          }
        ])
        .select()

      if (restaurantError) throw restaurantError

      // Insert meals for each restaurant
      if (restaurants) {
        const mealsData = []
        
        // Taberna Real meals
        const taberna = restaurants.find(r => r.name === 'Taberna Real')
        if (taberna) {
          mealsData.push(
            {
              restaurant_id: taberna.id,
              category_id: (await supabase.from('meal_categories').select('id').eq('name', 'Pratos Tradicionais').single()).data?.id,
              name: 'Bacalhau à Brás',
              description: 'Bacalhau desfiado com batata palha, ovos e azeitonas',
              price: 14.50,
              preparation_time: 20
            },
            {
              restaurant_id: taberna.id,
              category_id: (await supabase.from('meal_categories').select('id').eq('name', 'Sopas').single()).data?.id,
              name: 'Caldo Verde',
              description: 'Sopa tradicional com couve, batata e chouriço',
              price: 6.50,
              preparation_time: 15
            }
          )
        }

        // Marisqueira meals
        const marisqueira = restaurants.find(r => r.name === 'Marisqueira do Porto')
        if (marisqueira) {
          mealsData.push(
            {
              restaurant_id: marisqueira.id,
              category_id: (await supabase.from('meal_categories').select('id').eq('name', 'Peixes e Mariscos').single()).data?.id,
              name: 'Caldeirada de Peixe',
              description: 'Caldeirada com peixe fresco e mariscos do dia',
              price: 18.90,
              preparation_time: 25
            },
            {
              restaurant_id: marisqueira.id,
              category_id: (await supabase.from('meal_categories').select('id').eq('name', 'Peixes e Mariscos').single()).data?.id,
              name: 'Lingueirão Grelhado',
              description: 'Lingueirão fresco grelhado com alho e coentros',
              price: 16.50,
              preparation_time: 15
            }
          )
        }

        // Francesinha meals
        const francesinha = restaurants.find(r => r.name === 'Francesinha da Casa')
        if (francesinha) {
          mealsData.push(
            {
              restaurant_id: francesinha.id,
              category_id: (await supabase.from('meal_categories').select('id').eq('name', 'Pratos Tradicionais').single()).data?.id,
              name: 'Francesinha Especial',
              description: 'Francesinha com fiambre, linguiça, salsicha, bife e ovo',
              price: 12.50,
              preparation_time: 18
            },
            {
              restaurant_id: francesinha.id,
              category_id: (await supabase.from('meal_categories').select('id').eq('name', 'Sobremesas').single()).data?.id,
              name: 'Pastéis de Nata',
              description: '6 pastéis de nata tradicionais com canela',
              price: 7.20,
              preparation_time: 5
            }
          )
        }

        const { error: mealsError } = await supabase
          .from('meals')
          .insert(mealsData)

        if (mealsError) throw mealsError
      }

      toast({
        title: "Dados inseridos com sucesso!",
        description: "Restaurantes e pratos foram adicionados à base de dados"
      })

    } catch (error: any) {
      toast({
        title: "Erro ao inserir dados",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Dados de Teste</CardTitle>
        <CardDescription>
          Adicionar restaurantes e pratos de exemplo para testar a aplicação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={seedRestaurantData}
          disabled={isSeeding || !user}
          className="w-full"
        >
          {isSeeding ? 'A inserir dados...' : 'Inserir Dados de Teste'}
        </Button>
        {!user && (
          <p className="text-sm text-gray-500 mt-2">
            Precisa estar autenticado para inserir dados
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default SeedData
