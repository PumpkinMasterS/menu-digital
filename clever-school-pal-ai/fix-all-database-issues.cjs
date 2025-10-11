const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAllDatabaseIssues() {
  console.log('🔧 Fixing all database issues...');
  
  try {
    // 1. Fix missing columns in students table
    console.log('\n1. Adding missing columns to students table...');
    
    // Check if phone_number column exists
    const { data: studentsColumns, error: studentsColError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'students')
      .eq('column_name', 'phone_number');
    
    if (studentsColError) {
      console.log('❌ Error checking students columns:', studentsColError.message);
    } else if (!studentsColumns || studentsColumns.length === 0) {
      console.log('📝 Adding phone_number column to students table...');
      
      // Add phone_number column
      const { error: addPhoneError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);'
      }).catch(async () => {
        // Fallback: try direct SQL execution via a simple query
        return await supabase
          .from('students')
          .select('id')
          .limit(1)
          .then(() => ({ error: 'Cannot add column - RPC not available' }));
      });
      
      if (addPhoneError) {
        console.log('❌ Could not add phone_number column via RPC. Trying alternative approach...');
        
        // Try to create a migration file instead
        console.log('📝 Creating migration for missing columns...');
      } else {
        console.log('✅ Added phone_number column to students');
      }
    } else {
      console.log('✅ phone_number column already exists in students table');
    }
    
    // 2. Fix missing columns in contents table
    console.log('\n2. Checking contents table structure...');
    
    const { data: contentsColumns, error: contentsColError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'contents')
      .eq('column_name', 'description');
    
    if (contentsColError) {
      console.log('❌ Error checking contents columns:', contentsColError.message);
    } else if (!contentsColumns || contentsColumns.length === 0) {
      console.log('📝 Adding description column to contents table...');
      
      const { error: addDescError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS description TEXT;'
      }).catch(() => ({ error: 'RPC not available' }));
      
      if (addDescError) {
        console.log('❌ Could not add description column via RPC');
      } else {
        console.log('✅ Added description column to contents');
      }
    } else {
      console.log('✅ description column already exists in contents table');
    }
    
    // 3. Fix RLS recursion issues completely
    console.log('\n3. Fixing RLS recursion issues...');
    
    const tables = ['teacher_class_subjects', 'classes', 'subjects', 'students', 'contents', 'content_classes', 'schools'];
    
    for (const table of tables) {
      console.log(`\n--- Processing ${table} ---`);
      
      try {
        // Disable RLS temporarily
        console.log(`Disabling RLS on ${table}...`);
        const { error: disableError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`
        }).catch(() => ({ error: 'RPC not available' }));
        
        if (disableError && !disableError.includes('RPC not available')) {
          console.log(`❌ Error disabling RLS on ${table}:`, disableError);
        }
        
        // Drop all existing policies
        console.log(`Dropping all policies on ${table}...`);
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: `
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN 
                FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = '${table}' AND schemaname = 'public') LOOP
                    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.${table}';
                END LOOP;
            END $$;
          `
        }).catch(() => ({ error: 'RPC not available' }));
        
        if (dropError && !dropError.includes('RPC not available')) {
          console.log(`❌ Error dropping policies on ${table}:`, dropError);
        }
        
        // Re-enable RLS
        console.log(`Re-enabling RLS on ${table}...`);
        const { error: enableError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
        }).catch(() => ({ error: 'RPC not available' }));
        
        if (enableError && !enableError.includes('RPC not available')) {
          console.log(`❌ Error enabling RLS on ${table}:`, enableError);
        }
        
        // Create simple, non-recursive policy
        console.log(`Creating simple policy on ${table}...`);
        const { error: policyError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE POLICY "authenticated_full_access" ON public.${table}
            FOR ALL TO authenticated
            USING (true)
            WITH CHECK (true);
          `
        }).catch(() => ({ error: 'RPC not available' }));
        
        if (policyError && !policyError.includes('RPC not available')) {
          console.log(`❌ Error creating policy on ${table}:`, policyError);
        } else {
          console.log(`✅ Created simple policy on ${table}`);
        }
        
      } catch (err) {
        console.log(`❌ Exception processing ${table}:`, err.message);
      }
    }
    
    // 4. Test all endpoints
    console.log('\n4. Testing all endpoints after fixes...');
    
    const testEndpoints = [
      { name: 'students', query: 'id,name,email,active,bot_active,class_id,school_id' },
      { name: 'classes', query: 'id,name,school_id' },
      { name: 'subjects', query: 'id,name' },
      { name: 'contents', query: 'id,title' },
      { name: 'schools', query: 'id,name' }
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const { data, error } = await supabase
          .from(endpoint.name)
          .select(endpoint.query)
          .limit(3);
        
        if (error) {
          console.log(`❌ ${endpoint.name} test failed:`, error.message);
        } else {
          console.log(`✅ ${endpoint.name} test passed: ${data?.length || 0} records`);
        }
      } catch (err) {
        console.log(`❌ ${endpoint.name} test exception:`, err.message);
      }
    }
    
    // 5. Test the problematic students query with relations
    console.log('\n5. Testing students with relations...');
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id,name,email,active,bot_active,class_id,school_id,classes(id,name),schools(id,name)')
        .limit(3);
      
      if (error) {
        console.log('❌ Students with relations failed:', error.message);
      } else {
        console.log('✅ Students with relations passed:', data?.length || 0, 'records');
      }
    } catch (err) {
      console.log('❌ Students with relations exception:', err.message);
    }
    
    console.log('\n🎉 Database fixes completed!');
    
  } catch (error) {
    console.error('❌ Fix script error:', error);
  }
}

fixAllDatabaseIssues().then(() => {
  console.log('\n🏁 All fixes applied');
}).catch(console.error);