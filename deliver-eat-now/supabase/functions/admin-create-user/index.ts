import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  console.log('=== ADMIN CREATE USER FUNCTION START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Creating Supabase admin client...')
    // Create Supabase client with service role key (has admin permissions)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Checking authorization header...')
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found')
      throw new Error('No authorization header')
    }

    console.log('Verifying user token...')
    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      console.error('User:', user)
      throw new Error('Unauthorized')
    }

    console.log('User authenticated:', user.id, user.email)

    console.log('Checking user permissions...')
    // Check if user has permission to create users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      console.error('Profile fetch error details:', JSON.stringify(profileError, null, 2))
      throw new Error('Error fetching user profile')
    }

    console.log('User profile:', profile)
    console.log('Current user profile:', profile)
    console.log('User role:', profile?.role)
    console.log('Required roles:', ['super_admin', 'platform_owner'])

    if (!profile || !['super_admin', 'platform_owner', 'admin'].includes(profile.role)) {
      const errorMessage = `User ${user.email} with role '${profile?.role}' does not have permission to create users. Required roles: super_admin, platform_owner, or admin.`
      console.error(errorMessage)
      console.error('Permission check failed - returning 403')
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Permission check passed - user has required role')
    console.log('Parsing request body...')
    // Parse request body
    const requestBody = await req.json()
    console.log('Raw request body:', requestBody)
    
    const { 
      email, 
      password, 
      full_name, 
      phone, 
      role, 
      organization_id, 
      restaurant_id, 
      is_active = true 
    } = requestBody

    console.log('Parsed data:', { email, full_name, role, organization_id, restaurant_id, is_active })

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      console.error('Missing required fields:', { email: !!email, password: !!password, full_name: !!full_name, role: !!role })
      throw new Error('Missing required fields: email, password, full_name, role')
    }

    // Validate role
    const validRoles = ['customer', 'driver', 'restaurant_admin', 'super_admin', 'platform_owner', 'kitchen']
    console.log('Validating role:', role)
    console.log('Valid roles:', validRoles)
    console.log('Role is valid:', validRoles.includes(role))
    
    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role, 'Valid roles:', validRoles)
      const errorMessage = `Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`
      console.error('Throwing error for invalid role:', errorMessage)
      throw new Error(errorMessage)
    }

    console.log('Role validation passed')
    console.log('Generating password...')
    // Generate temporary password for drivers
    const finalPassword = role === 'driver' 
      ? Math.random().toString(36).slice(-12) + 'A1!' 
      : password

    console.log('Creating user with Supabase Auth...')
    console.log('Auth payload:', {
      email: email,
      password: finalPassword ? '[REDACTED]' : 'undefined',
      email_confirm: role !== 'driver',
      user_metadata: {
        full_name: full_name,
        role: role
      }
    })
    
    // Create user using admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: finalPassword,
      email_confirm: role !== 'driver', // Don't auto-confirm drivers
      user_metadata: {
        full_name: full_name,
        role: role
      }
    })

    console.log('Supabase Auth response:', {
      userData: userData ? { user: { id: userData.user?.id, email: userData.user?.email } } : null,
      error: createError
    })

    if (createError) {
      console.error('User creation error:', createError)
      console.error('Error details:', JSON.stringify(createError, null, 2))
      
      // Handle specific error cases
      if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
        console.error('Email already exists:', email)
        return new Response(
          JSON.stringify({ 
            error: `O email ${email} já está registrado no sistema. Por favor, use um email diferente.`,
            success: false,
            code: 'email_exists'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict
          }
        )
      }
      
      throw createError
    }

    console.log('User created successfully:', userData.user.id)

    console.log('Creating user profile...')
    // Create profile - only include fields that are provided
    const profileData: any = {
      id: userData.user.id,
      email: email,
      full_name: full_name,
      role: role
    }

    // Only add optional fields if they are provided
    if (phone) {
      profileData.phone = phone
    }

    if (organization_id) {
      profileData.organization_id = organization_id
    }

    if (restaurant_id) {
      profileData.restaurant_id = restaurant_id
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError)
      // Cleanup user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw profileInsertError
    }

    console.log('Profile created successfully')

    // Special handling for drivers - send activation email
    if (role === 'driver') {
      console.log('Handling driver activation...')
      try {
        // Get organization name for email (only if organization_id is provided)
        let organizationName = 'SaborPortuguês' // Default name
        
        if (organization_id) {
          const { data: orgData } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', organization_id)
            .single()
          
          organizationName = orgData?.name || 'SaborPortuguês'
        }

        // Call edge function to send driver activation email
        const { error: emailError } = await supabaseAdmin.functions.invoke('send-driver-activation', {
          body: {
            email: email,
            driverName: full_name,
            organizationName: organizationName,
            tempPassword: finalPassword,
            userId: userData.user.id
          }
        })

        if (emailError) {
          console.error('Error sending activation email:', emailError)
        } else {
          console.log('Activation email sent successfully')
        }
      } catch (emailError) {
        console.error('Error in driver activation flow:', emailError)
      }
    }

    console.log('=== ADMIN CREATE USER FUNCTION SUCCESS ===')
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.user,
        message: role === 'driver' 
          ? 'Driver created successfully. Activation email sent.'
          : 'User created successfully.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('=== ADMIN CREATE USER FUNCTION ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error code:', error.code)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error.constructor?.name)
    
    // Log the full error object
    try {
      console.error('Error JSON:', JSON.stringify(error, null, 2))
    } catch (jsonError) {
      console.error('Could not stringify error:', jsonError)
    }
    
    // More detailed error response
    let statusCode = 400
    let errorMessage = error.message || 'Internal server error'
    
    // Handle specific error types
    if (error.message?.includes('Unauthorized') || error.message?.includes('No authorization header')) {
      statusCode = 401
      errorMessage = 'Não autorizado. Faça login novamente.'
    } else if (error.message?.includes('does not have permission')) {
      statusCode = 403
      errorMessage = error.message
    } else if (error.message?.includes('already been registered') || error.code === 'email_exists') {
      statusCode = 409
      errorMessage = `O email já está registrado no sistema.`
    }
    
    console.error('Final response:', { statusCode, errorMessage })
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        details: error.message,
        code: error.code || 'unknown_error',
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})