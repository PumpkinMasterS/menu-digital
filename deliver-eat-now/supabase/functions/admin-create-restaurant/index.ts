import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RestaurantRequest {
  // Restaurant data
  name: string
  description: string
  address: string
  phone?: string
  email?: string
  website?: string
  cuisine_type: string
  delivery_radius_km: number
  minimum_order_value: number
  delivery_fee: number
  estimated_delivery_time: string
  
  // Owner data
  owner: {
    full_name: string
    email: string
    password: string
    phone?: string
  }
  
  // Business settings
  business_hours?: any
  delivery_zones?: any[]
  payment_methods?: string[]
  features?: string[]
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    if (!['super_admin', 'platform_owner'].includes(profile.role)) {
      throw new Error('Insufficient permissions - admin access required')
    }

    const requestData: RestaurantRequest = await req.json()
    console.log("🔧 Admin creating restaurant:", requestData.name)

    // Validate required fields
    if (!requestData.name || !requestData.owner.email || !requestData.owner.password) {
      throw new Error("Nome do restaurante, email e password são obrigatórios")
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

    console.log("✅ Validation passed, starting creation process")

    // 1. Create organization first (if using multi-tenancy)
    const organizationSlug = requestData.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .insert({
        name: requestData.name,
        slug: organizationSlug,
        country_code: 'PT',
        currency: 'EUR',
        timezone: 'Europe/Lisbon',
        is_active: true,
        settings: {
          created_by_admin: true,
          admin_created_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (orgError) {
      console.error("❌ Error creating organization:", orgError)
      throw new Error("Erro ao criar organização: " + orgError.message)
    }

    console.log("✅ Organization created:", organization.id)

    // 2. Create user account for restaurant owner
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: requestData.owner.email,
      password: requestData.owner.password,
      email_confirm: true, // Auto-confirm for admin created accounts
      user_metadata: {
        full_name: requestData.owner.full_name,
        role: 'restaurant_admin',
        organization_id: organization.id,
        created_by_admin: true
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
    const { error: profileInsertError } = await supabaseClient
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
          marketing_emails: false
        }
      })

    if (profileInsertError) {
      console.error("❌ Error creating profile:", profileInsertError)
      // Rollback user and organization
      await supabaseClient.auth.admin.deleteUser(authUser.user!.id)
      await supabaseClient
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      throw new Error("Erro ao criar perfil: " + profileInsertError.message)
    }

    console.log("✅ Profile created")

    // 4. Create restaurant
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .insert({
        organization_id: organization.id,
        owner_id: authUser.user!.id,
        name: requestData.name,
        description: requestData.description,
        address: requestData.address,
        phone: requestData.phone || null,
        email: requestData.email || null,
        website: requestData.website || null,
        cuisine_type: requestData.cuisine_type,
        delivery_radius_km: requestData.delivery_radius_km || 10,
        minimum_order_value: requestData.minimum_order_value || 15,
        delivery_fee: requestData.delivery_fee || 2.5,
        estimated_delivery_time: requestData.estimated_delivery_time || "30-45 min",
        is_open: false, // Start closed until owner configures
        is_active: true,
        status: 'active', // Admin created restaurants are immediately active
        verification_status: 'verified', // Admin created restaurants are pre-verified
        business_hours: requestData.business_hours || {
          monday: { open: "11:00", close: "23:00", closed: false },
          tuesday: { open: "11:00", close: "23:00", closed: false },
          wednesday: { open: "11:00", close: "23:00", closed: false },
          thursday: { open: "11:00", close: "23:00", closed: false },
          friday: { open: "11:00", close: "23:00", closed: false },
          saturday: { open: "11:00", close: "23:00", closed: false },
          sunday: { open: "11:00", close: "23:00", closed: false }
        },
        payment_methods: requestData.payment_methods || ['cash', 'card', 'mbway'],
        features: requestData.features || [],
        delivery_zones: requestData.delivery_zones || []
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

    // 5. Create default menu sections
    const defaultSections = [
      { name: "Entradas", description: "Petiscos e aperitivos", sort_order: 1 },
      { name: "Pratos Principais", description: "Especialidades da casa", sort_order: 2 },
      { name: "Sobremesas", description: "Doces tradicionais", sort_order: 3 },
      { name: "Bebidas", description: "Refrigerantes, sumos e águas", sort_order: 4 }
    ]

    const { error: sectionsError } = await supabaseClient
      .from('menu_sections')
      .insert(
        defaultSections.map(section => ({
          restaurant_id: restaurant.id,
          name: section.name,
          description: section.description,
          sort_order: section.sort_order,
          is_active: true
        }))
      )

    if (sectionsError) {
      console.error("⚠️ Warning: Could not create default menu sections:", sectionsError)
      // Don't fail the whole process for this
    } else {
      console.log("✅ Default menu sections created")
    }

    // 6. Create audit log entry
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        organization_id: organization.id,
        user_id: user.id, // Admin who created
        action: 'restaurant_created',
        resource_type: 'restaurant',
        resource_id: restaurant.id,
        details: {
          restaurant_name: requestData.name,
          owner_email: requestData.owner.email,
          created_by_admin: true
        }
      })

    if (auditError) {
      console.error("⚠️ Warning: Could not create audit log:", auditError)
      // Don't fail for audit log
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Restaurante criado com sucesso pelo administrador",
        data: {
          organization_id: organization.id,
          restaurant_id: restaurant.id,
          owner_user_id: authUser.user!.id,
          restaurant_name: requestData.name,
          owner_email: requestData.owner.email,
          status: 'active',
          next_steps: [
            "O proprietário pode agora fazer login",
            "Configurar menu e preços",
            "Abrir restaurante para pedidos",
            "Fazer upload de imagens"
          ]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error("❌ Restaurant creation failed:", error)
    
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