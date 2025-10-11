const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create both service role and anon clients
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function debugPersistentErrors() {
  console.log('🔍 Debugging persistent API errors...');
  
  try {
    // 1. Check if tables exist and their structure
    console.log('\n1. Checking table structure...');
    
    const tablesQuery = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('students', 'classes', 'schools', 'subjects', 'contents')
      ORDER BY table_name, ordinal_position;
    `;
    
    let tableStructure = null;
    let structureError = null;
    
    try {
      const result = await supabaseService.rpc('exec_sql', { sql: tablesQuery });
      tableStructure = result.data;
      structureError = result.error;
    } catch (err) {
      structureError = 'RPC function not available';
    }
    
    if (structureError) {
      console.log('❌ Cannot check table structure via RPC:', structureError);
      
      // Try direct table access
      const { data: studentsTest, error: studentsError } = await supabaseService
        .from('students')
        .select('*')
        .limit(1);
      
      console.log('Students table test:', studentsError ? `❌ ${studentsError.message}` : '✅ Accessible');
      
      const { data: classesTest, error: classesError } = await supabaseService
        .from('classes')
        .select('*')
        .limit(1);
      
      console.log('Classes table test:', classesError ? `❌ ${classesError.message}` : '✅ Accessible');
    } else {
      console.log('✅ Table structure:', tableStructure);
    }
    
    // 2. Check RLS policies
    console.log('\n2. Checking current RLS policies...');
    
    const policiesQuery = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename IN ('students', 'classes', 'schools', 'subjects', 'contents', 'teacher_class_subjects')
      ORDER BY tablename, policyname;
    `;
    
    let policies = null;
    let policiesError = null;
    
    try {
      const result = await supabaseService.rpc('exec_sql', { sql: policiesQuery });
      policies = result.data;
      policiesError = result.error;
    } catch (err) {
      policiesError = 'RPC function not available';
    }
    
    if (policiesError) {
      console.log('❌ Cannot check policies via RPC:', policiesError);
    } else {
      console.log('Current RLS policies:', policies);
    }
    
    // 3. Check RLS status
    console.log('\n3. Checking RLS status...');
    
    const rlsStatusQuery = `
      SELECT schemaname, tablename, rowsecurity, hasrls
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE schemaname = 'public' 
      AND tablename IN ('students', 'classes', 'schools', 'subjects', 'contents', 'teacher_class_subjects');
    `;
    
    let rlsStatus = null;
    let rlsError = null;
    
    try {
      const result = await supabaseService.rpc('exec_sql', { sql: rlsStatusQuery });
      rlsStatus = result.data;
      rlsError = result.error;
    } catch (err) {
      rlsError = 'RPC function not available';
    }
    
    if (rlsError) {
      console.log('❌ Cannot check RLS status via RPC:', rlsError);
    } else {
      console.log('RLS status:', rlsStatus);
    }
    
    // 4. Test API calls with detailed error logging
    console.log('\n4. Testing API calls with both service and anon keys...');
    
    const endpoints = [
      { name: 'students', query: 'id,name,phone_number,whatsapp_number,email,active,bot_active,class_id,school_id,classes(id,name),schools(id,name)' },
      { name: 'classes', query: 'id,name,school_id' },
      { name: 'subjects', query: 'id,name,description' },
      { name: 'contents', query: 'id,title,description' },
      { name: 'schools', query: 'id,name' }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n--- Testing ${endpoint.name} ---`);
      
      // Test with service role
      try {
        const { data: serviceData, error: serviceError } = await supabaseService
          .from(endpoint.name)
          .select(endpoint.query)
          .limit(5);
        
        if (serviceError) {
          console.log(`❌ Service role error for ${endpoint.name}:`, serviceError);
        } else {
          console.log(`✅ Service role success for ${endpoint.name}: ${serviceData?.length || 0} records`);
        }
      } catch (err) {
        console.log(`❌ Service role exception for ${endpoint.name}:`, err.message);
      }
      
      // Test with anon key
      try {
        const { data: anonData, error: anonError } = await supabaseAnon
          .from(endpoint.name)
          .select(endpoint.query)
          .limit(5);
        
        if (anonError) {
          console.log(`❌ Anon key error for ${endpoint.name}:`, anonError);
        } else {
          console.log(`✅ Anon key success for ${endpoint.name}: ${anonData?.length || 0} records`);
        }
      } catch (err) {
        console.log(`❌ Anon key exception for ${endpoint.name}:`, err.message);
      }
    }
    
    // 5. Check if there's data in the tables
    console.log('\n5. Checking data existence...');
    
    for (const endpoint of endpoints) {
      try {
        const { count, error } = await supabaseService
          .from(endpoint.name)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Count error for ${endpoint.name}:`, error.message);
        } else {
          console.log(`📊 ${endpoint.name}: ${count} records`);
        }
      } catch (err) {
        console.log(`❌ Count exception for ${endpoint.name}:`, err.message);
      }
    }
    
    // 6. Test specific problematic query
    console.log('\n6. Testing specific problematic queries...');
    
    // Test the exact query from the error
    try {
      const { data, error } = await supabaseAnon
        .from('students')
        .select('id,name,phone_number,whatsapp_number,email,active,bot_active,class_id,school_id,classes(id,name),schools(id,name)')
        .order('name', { ascending: true });
      
      if (error) {
        console.log('❌ Exact students query error:', error);
      } else {
        console.log('✅ Exact students query success:', data?.length || 0, 'records');
      }
    } catch (err) {
      console.log('❌ Exact students query exception:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugPersistentErrors().then(() => {
  console.log('\n🏁 Debug complete');
}).catch(console.error);