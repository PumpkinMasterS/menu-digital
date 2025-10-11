import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MealOption {
  type: 'extra' | 'drink' | 'side' | 'sauce' | 'size'
  label: string
  price: number
  is_required?: boolean
  max_selections?: number
}

interface Meal {
  name: string
  description: string
  price: number
  image_url?: string
  preparation_time_minutes?: number
  allergens?: string[]
  tags?: string[]
  options?: MealOption[]
}

interface MenuSection {
  name: string
  description?: string
  meals: Meal[]
}

interface MenuRequest {
  restaurant_id: string
  sections: MenuSection[]
  replace_existing?: boolean // Se true, apaga menu existente
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify admin permission
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get requesting user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check if user is admin or restaurant owner
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    const requestData: MenuRequest = await req.json()
    console.log("🔧 Creating menu for restaurant:", requestData.restaurant_id)

    // Validate required fields
    if (!requestData.restaurant_id || !requestData.sections?.length) {
      throw new Error("Restaurant ID e seções do menu são obrigatórios")
    }

    // Check restaurant access
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('id, name, owner_id, organization_id')
      .eq('id', requestData.restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      throw new Error("Restaurante não encontrado")
    }

    // Check permissions
    const isAdmin = ['super_admin', 'platform_owner'].includes(profile.role)
    const isOwner = restaurant.owner_id === user.id
    const isSameOrg = restaurant.organization_id === profile.organization_id

    if (!isAdmin && !isOwner && !isSameOrg) {
      throw new Error("Sem permissões para gerir este restaurante")
    }

    console.log("✅ Permission check passed")

    // Start transaction
    let totalItemsCreated = 0

    // If replace_existing is true, delete existing menu
    if (requestData.replace_existing) {
      console.log("🗑️ Deleting existing menu...")
      
      // Delete meal options first (foreign key constraints)
      const { error: deleteOptionsError } = await supabaseClient
        .from('meal_options')
        .delete()
        .in('meal_id', 
          await supabaseClient
            .from('meals')
            .select('id')
            .eq('restaurant_id', requestData.restaurant_id)
            .then(result => result.data?.map(m => m.id) || [])
        )

      if (deleteOptionsError) {
        console.error("⚠️ Warning deleting options:", deleteOptionsError)
      }

      // Delete meals
      const { error: deleteMealsError } = await supabaseClient
        .from('meals')
        .delete()
        .eq('restaurant_id', requestData.restaurant_id)

      if (deleteMealsError) {
        console.error("⚠️ Warning deleting meals:", deleteMealsError)
      }

      // Delete sections
      const { error: deleteSectionsError } = await supabaseClient
        .from('menu_sections')
        .delete()
        .eq('restaurant_id', requestData.restaurant_id)

      if (deleteSectionsError) {
        console.error("⚠️ Warning deleting sections:", deleteSectionsError)
      }

      console.log("✅ Existing menu cleared")
    }

    // Create new menu
    for (const [sectionIndex, section] of requestData.sections.entries()) {
      console.log(`📋 Creating section: ${section.name}`)

      // Create menu section
      const { data: sectionData, error: sectionError } = await supabaseClient
        .from('menu_sections')
        .insert({
          restaurant_id: requestData.restaurant_id,
          name: section.name,
          description: section.description || null,
          sort_order: sectionIndex + 1,
          is_active: true
        })
        .select()
        .single()

      if (sectionError) {
        console.error("❌ Error creating section:", sectionError)
        throw new Error(`Erro ao criar seção "${section.name}": ${sectionError.message}`)
      }

      console.log(`✅ Section created: ${sectionData.id}`)

      // Create meals in this section
      for (const [mealIndex, meal] of section.meals.entries()) {
        console.log(`🍽️ Creating meal: ${meal.name}`)

        // Validate meal data
        if (!meal.name || meal.price == null) {
          throw new Error(`Meal "${meal.name}" necessita nome e preço`)
        }

        if (meal.price < 0) {
          throw new Error(`Preço da refeição "${meal.name}" não pode ser negativo`)
        }

        const { data: mealData, error: mealError } = await supabaseClient
          .from('meals')
          .insert({
            restaurant_id: requestData.restaurant_id,
            section_id: sectionData.id,
            name: meal.name,
            description: meal.description || null,
            price: meal.price,
            image_url: meal.image_url || null,
            preparation_time_minutes: meal.preparation_time_minutes || 15,
            allergens: meal.allergens || null,
            tags: meal.tags || null,
            sort_order: mealIndex + 1,
            is_available: true,
            discount_percentage: 0
          })
          .select()
          .single()

        if (mealError) {
          console.error("❌ Error creating meal:", mealError)
          throw new Error(`Erro ao criar prato "${meal.name}": ${mealError.message}`)
        }

        console.log(`✅ Meal created: ${mealData.id}`)
        totalItemsCreated++

        // Create meal options if any
        if (meal.options && meal.options.length > 0) {
          console.log(`⚙️ Creating ${meal.options.length} options for ${meal.name}`)

          const optionsData = meal.options.map((option, optionIndex) => {
            // Validate option data
            if (!option.label || option.price == null) {
              throw new Error(`Opção do prato "${meal.name}" necessita label e preço`)
            }

            if (option.price < 0) {
              throw new Error(`Preço da opção "${option.label}" não pode ser negativo`)
            }

            return {
              meal_id: mealData.id,
              type: option.type,
              label: option.label,
              price: option.price,
              is_required: option.is_required || false,
              max_selections: option.max_selections || 1,
              sort_order: optionIndex + 1,
              is_active: true
            }
          })

          const { error: optionsError } = await supabaseClient
            .from('meal_options')
            .insert(optionsData)

          if (optionsError) {
            console.error("❌ Error creating options:", optionsError)
            throw new Error(`Erro ao criar opções para "${meal.name}": ${optionsError.message}`)
          }

          console.log(`✅ Created ${meal.options.length} options`)
          totalItemsCreated += meal.options.length
        }
      }
    }

    // Create audit log entry
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        organization_id: restaurant.organization_id,
        user_id: user.id,
        action: requestData.replace_existing ? 'menu_replaced' : 'menu_created',
        resource_type: 'menu',
        resource_id: requestData.restaurant_id,
        details: {
          restaurant_name: restaurant.name,
          sections_count: requestData.sections.length,
          total_items: totalItemsCreated,
          replace_existing: requestData.replace_existing || false
        }
      })

    if (auditError) {
      console.error("⚠️ Warning: Could not create audit log:", auditError)
      // Don't fail for audit log
    }

    // Get complete menu for response
    const { data: completeMenu, error: menuError } = await supabaseClient
      .from('v_restaurant_menus')
      .select('*')
      .eq('restaurant_id', requestData.restaurant_id)

    if (menuError) {
      console.error("⚠️ Warning: Could not fetch complete menu:", menuError)
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Menu ${requestData.replace_existing ? 'substituído' : 'criado'} com sucesso`,
        data: {
          restaurant_id: requestData.restaurant_id,
          restaurant_name: restaurant.name,
          sections_created: requestData.sections.length,
          total_items_created: totalItemsCreated,
          menu_preview: completeMenu?.slice(0, 10) || [], // First 10 items as preview
          statistics: {
            sections: requestData.sections.length,
            meals: requestData.sections.reduce((total, section) => total + section.meals.length, 0),
            options: requestData.sections.reduce((total, section) => 
              total + section.meals.reduce((mealTotal, meal) => 
                mealTotal + (meal.options?.length || 0), 0
              ), 0
            )
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error("❌ Menu creation failed:", error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno do servidor",
        details: "Verifique os dados enviados e tente novamente"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 