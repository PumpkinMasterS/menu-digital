import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("🍽️ Create Organization with Owner function started")

interface OrganizationRequest {
  organizationName: string
  organizationSlug: string
  restaurant: {
    name: string
    description: string
    address: string
    phone?: string
    email?: string
    website?: string
    cuisine_type: string
    delivery_radius_km: number
    minimum_order: number
    delivery_fee: number
    delivery_time: string
  }
  owner: {
    full_name: string
    email: string
    phone?: string
    password: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const requestData: OrganizationRequest = await req.json()
    console.log("📝 Processing registration for:", requestData.organizationName)

    // Validate required fields
    if (!requestData.organizationName || !requestData.owner.email || !requestData.owner.password) {
      throw new Error("Campos obrigatórios em falta")
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(requestData.owner.email)) {
      throw new Error("Email inválido")
    }

    // Validate password length
    if (requestData.owner.password.length < 6) {
      throw new Error("Password deve ter pelo menos 6 caracteres")
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseClient.auth.admin.getUserByEmail(requestData.owner.email)
    if (existingUser.user) {
      throw new Error("Email já está em uso")
    }

    // Check if organization slug already exists
    const { data: existingOrg } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('slug', requestData.organizationSlug)
      .maybeSingle()

    if (existingOrg) {
      throw new Error("Nome do restaurante já está em uso. Tente outro nome.")
    }

    console.log("✅ Validation passed, starting creation process")

    // 1. Create organization
    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .insert({
        name: requestData.organizationName,
        slug: requestData.organizationSlug,
        country_code: 'PT',
        currency: 'EUR',
        timezone: 'Europe/Lisbon',
        is_active: true,
        settings: {
          onboarding_completed: false,
          welcome_email_sent: false
        }
      })
      .select()
      .single()

    if (orgError) {
      console.error("❌ Error creating organization:", orgError)
      throw new Error("Erro ao criar organização: " + orgError.message)
    }

    console.log("✅ Organization created:", organization.id)

    // 2. Create user account
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: requestData.owner.email,
      password: requestData.owner.password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        full_name: requestData.owner.full_name,
        role: 'restaurant_admin',
        organization_id: organization.id,
        onboarding_step: 'restaurant_setup'
      }
    })

    if (authError) {
      console.error("❌ Error creating user:", authError)
      // Rollback organization
      await supabaseClient
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      throw new Error("Erro ao criar conta: " + authError.message)
    }

    console.log("✅ User created:", authUser.user?.id)

    // 3. Create user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: authUser.user!.id,
        organization_id: organization.id,
        email: requestData.owner.email,
        full_name: requestData.owner.full_name,
        phone: requestData.owner.phone || null,
        role: 'restaurant_admin',
        is_active: true,
        preferences: {
          notifications_enabled: true,
          email_notifications: true,
          marketing_emails: true
        }
      })

    if (profileError) {
      console.error("❌ Error creating profile:", profileError)
      // Rollback user and organization
      await supabaseClient.auth.admin.deleteUser(authUser.user!.id)
      await supabaseClient
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      throw new Error("Erro ao criar perfil: " + profileError.message)
    }

    console.log("✅ Profile created")

    // 4. Create restaurant
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .insert({
        organization_id: organization.id,
        owner_id: authUser.user!.id,
        name: requestData.restaurant.name,
        description: requestData.restaurant.description,
        address: requestData.restaurant.address,
        phone: requestData.restaurant.phone || null,
        email: requestData.restaurant.email || null,
        website: requestData.restaurant.website || null,
        cuisine_type: requestData.restaurant.cuisine_type,
        delivery_radius_km: requestData.restaurant.delivery_radius_km,
        minimum_order_value: requestData.restaurant.minimum_order,
        delivery_fee: requestData.restaurant.delivery_fee,
        estimated_delivery_time: requestData.restaurant.delivery_time,
        is_open: false, // Start closed until setup is complete
        is_active: true,
        settings: {
          auto_accept_orders: false,
          notification_sound: true,
          operating_hours: {
            monday: { open: "11:00", close: "23:00", closed: false },
            tuesday: { open: "11:00", close: "23:00", closed: false },
            wednesday: { open: "11:00", close: "23:00", closed: false },
            thursday: { open: "11:00", close: "23:00", closed: false },
            friday: { open: "11:00", close: "23:00", closed: false },
            saturday: { open: "11:00", close: "23:00", closed: false },
            sunday: { open: "11:00", close: "23:00", closed: false }
          }
        }
      })
      .select()
      .single()

    if (restaurantError) {
      console.error("❌ Error creating restaurant:", restaurantError)
      // Rollback everything
      await supabaseClient.auth.admin.deleteUser(authUser.user!.id)
      await supabaseClient
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      throw new Error("Erro ao criar restaurante: " + restaurantError.message)
    }

    console.log("✅ Restaurant created:", restaurant.id)

    // 5. Create default meal categories for the restaurant
    const defaultCategories = [
      { name: "Pratos Tradicionais", description: "Especialidades da casa" },
      { name: "Entradas", description: "Para começar a refeição" },
      { name: "Pratos Principais", description: "Carnes, peixes e vegetarianos" },
      { name: "Sobremesas", description: "Doces tradicionais" },
      { name: "Bebidas", description: "Bebidas e refrescos" }
    ]

    const { error: categoriesError } = await supabaseClient
      .from('meal_categories')
      .insert(
        defaultCategories.map(cat => ({
          organization_id: organization.id,
          name: cat.name,
          description: cat.description,
          is_active: true
        }))
      )

    if (categoriesError) {
      console.error("⚠️ Warning: Could not create default categories:", categoriesError)
      // Don't fail the whole process for this
    } else {
      console.log("✅ Default categories created")
    }

    // 6. Log the registration
    await supabaseClient
      .from('admin_logs')
      .insert({
        organization_id: organization.id,
        action: 'organization_created',
        details: {
          organization_name: requestData.organizationName,
          restaurant_name: requestData.restaurant.name,
          owner_email: requestData.owner.email,
          registration_method: 'public_signup',
          timestamp: new Date().toISOString()
        },
        metadata: {
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        }
      })

    console.log("✅ Registration logged")

    // 7. Send welcome email (placeholder - implement with Resend/SendGrid)
    console.log("📧 Sending welcome email to:", requestData.owner.email)
    // TODO: Implement email sending
    // await sendWelcomeEmail(requestData.owner.email, {
    //   restaurantName: requestData.restaurant.name,
    //   ownerName: requestData.owner.full_name,
    //   loginUrl: `${Deno.env.get('FRONTEND_URL')}/auth`,
    //   dashboardUrl: `${Deno.env.get('FRONTEND_URL')}/restaurant-admin`
    // })

    // Update organization to mark welcome email as sent
    await supabaseClient
      .from('organizations')
      .update({
        settings: {
          onboarding_completed: false,
          welcome_email_sent: true
        }
      })
      .eq('id', organization.id)

    console.log("🎉 Registration completed successfully!")

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta criada com sucesso",
        data: {
          organization_id: organization.id,
          restaurant_id: restaurant.id,
          user_id: authUser.user!.id,
          email: requestData.owner.email,
          next_steps: [
            "Verifique o seu email",
            "Aceda ao dashboard de gestão",
            "Configure o menu e preços",
            "Abra o restaurante para entregas"
          ]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error("❌ Registration failed:", error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno do servidor"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/* Edge Functions helper for future email implementation */
async function sendWelcomeEmail(email: string, data: any) {
  // TODO: Implement with Resend API
  const emailTemplate = `
    Olá ${data.ownerName}!
    
    Bem-vindo ao SaborPortuguês! 🎉
    
    A sua conta para o restaurante "${data.restaurantName}" foi criada com sucesso.
    
    Próximos passos:
    1. Aceda ao dashboard: ${data.dashboardUrl}
    2. Configure o seu menu
    3. Abra o restaurante para entregas
    
    Se tiver dúvidas, contacte-nos: suporte@saborportugues.pt
    
    Bem-vindo à família SaborPortuguês!
  `
  
  console.log("📧 Email template ready:", emailTemplate)
  // Implementation goes here
} 