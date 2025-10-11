
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
    const subjectId = url.searchParams.get('subject_id')
    const classId = url.searchParams.get('class_id')
    const schoolId = url.searchParams.get('school_id')
    const status = url.searchParams.get('status') || 'published'
    
    // Build query
    let query = supabase
      .from('contents')
      .select(`
        id,
        title,
        content,
        summary,
        content_type,
        topics,
        year,
        difficulty_level,
        tags,
        status,
        created_at,
        subjects(id, name),
        content_classes(
          classes(id, name, grade, school_id)
        )
      `)
      .eq('active', true)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    }
    
    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }
    
    if (classId) {
      query = query.eq('content_classes.class_id', classId)
    }

    const { data: contents, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contents' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format response
    const formattedContents = contents?.map(content => ({
      id: content.id,
      title: content.title,
      content: content.content,
      summary: content.summary,
      content_type: content.content_type,
      topics: content.topics,
      year: content.year,
      difficulty_level: content.difficulty_level,
      tags: content.tags,
      status: content.status,
      created_at: content.created_at,
      subject: content.subjects ? {
        id: content.subjects.id,
        name: content.subjects.name
      } : null,
      classes: content.content_classes?.map((cc: any) => ({
        id: cc.classes.id,
        name: cc.classes.name,
        grade: cc.classes.grade,
        school_id: cc.classes.school_id
      })) || []
    })) || []

    return new Response(
      JSON.stringify({
        contents: formattedContents,
        total: formattedContents.length
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
