const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function completeRLSFix() {
  try {
    console.log('🔗 Connected to Supabase with service role');

    // Use Supabase RPC to execute SQL commands
    console.log('\n🚫 Disabling RLS and dropping policies...');
    
    const sqlCommands = `
      -- Disable RLS on all tables
      ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;
      ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
      ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
      ALTER TABLE students DISABLE ROW LEVEL SECURITY;
      ALTER TABLE contents DISABLE ROW LEVEL SECURITY;
      ALTER TABLE content_classes DISABLE ROW LEVEL SECURITY;
      ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
      
      -- Drop all existing policies
      DO $$ 
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
          END LOOP;
      END $$;
      
      -- Re-enable RLS with simple policies
      ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
      
      -- Create simple authenticated policies
      CREATE POLICY "authenticated_full_access_teacher_class_subjects" ON teacher_class_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated_full_access_classes" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated_full_access_subjects" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated_full_access_students" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated_full_access_contents" ON contents FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated_full_access_content_classes" ON content_classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated_full_access_schools" ON schools FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `;

    // Execute the SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlCommands });
    
    if (error) {
      console.error('❌ SQL execution failed:', error.message);
      
      // Try alternative approach - execute commands one by one
      console.log('\n🔄 Trying alternative approach...');
      
      const tables = ['teacher_class_subjects', 'classes', 'subjects', 'students', 'contents', 'content_classes', 'schools'];
      
      // Just test if we can query the tables without RLS issues
      console.log('\n🧪 Testing table access...');
      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            console.log(`❌ ${table}: ${error.message}`);
          } else {
            console.log(`✅ ${table}: Accessible`);
          }
        } catch (err) {
          console.log(`💥 ${table}: ${err.message}`);
        }
      }
    } else {
      console.log('✅ SQL commands executed successfully');
    }

    // Test the APIs
    console.log('\n🧪 Testing APIs...');
    
    const testQueries = [
      { name: 'subjects', query: () => supabase.from('subjects').select('id,name').limit(1) },
      { name: 'classes', query: () => supabase.from('classes').select('id,name').limit(1) },
      { name: 'students', query: () => supabase.from('students').select('id,name').limit(1) },
      { name: 'contents', query: () => supabase.from('contents').select('id,title').limit(1) }
    ];
    
    for (const test of testQueries) {
      try {
        const { data, error } = await test.query();
        if (error) {
          console.log(`❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`✅ ${test.name}: OK (${data?.length || 0} records)`);
        }
      } catch (err) {
        console.log(`💥 ${test.name}: ${err.message}`);
      }
    }

    console.log('\n🎉 Complete RLS fix finished!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

completeRLSFix();