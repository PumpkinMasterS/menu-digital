import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API key from headers
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, active, permissions')
      .eq('key_hash', apiKey)
      .eq('active', true)
      .single()

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)

    const url = new URL(req.url)
    const whatsappNumber = url.searchParams.get('whatsapp')
    
    if (!whatsappNumber) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp number parameter required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean the WhatsApp number (remove non-digits)
    const cleanNumber = whatsappNumber.replace(/\D/g, '')

    // Search for student by WhatsApp number
    const { data: student, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        whatsapp_number,
        active,
        bot_active,
        school_id,
        schools!inner(name),
        class_id,
        classes!inner(name, grade)
      `)
      .eq('whatsapp_number', cleanNumber)
      .eq('active', true)
      .eq('bot_active', true)
      .single()

    if (error || !student) {
      return new Response(
        JSON.stringify({ 
          found: false, 
          message: 'Student not found or bot not active' 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return student info
    return new Response(
      JSON.stringify({
        found: true,
        student: {
          id: student.id,
          name: student.name,
          whatsapp_number: student.whatsapp_number,
          school: {
            id: student.school_id,
            name: student.schools?.name || 'Sem escola'
          },
          class: {
            id: student.class_id,
            name: student.classes?.name || 'Sem turma',
            grade: student.classes?.grade || 'N/A'
          }
        }
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
