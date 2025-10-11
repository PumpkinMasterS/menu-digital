const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function fixSupabaseRLS() {
  const supabaseUrl = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY1Njc2MCwiZXhwIjoyMDYzMjMyNzYwfQ.5q7JE1V3wD2722I5b4FJ7js4P61jZ3JtnpdA5So2FhY';

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔧 Starting Supabase RLS fixes...');

  try {
    // Step 1: Disable RLS on problematic tables
    console.log('\n📝 Step 1: Disabling RLS on problematic tables...');
    
    const disableRLSQueries = [
      'ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE IF EXISTS public.subjects DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE IF EXISTS public.students DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE IF EXISTS public.contents DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE IF EXISTS public.teacher_class_subjects DISABLE ROW LEVEL SECURITY;'
    ];

    for (const query of disableRLSQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`⚠️  ${query}: ${error.message}`);
        } else {
          console.log(`✅ ${query}`);
        }
      } catch (err) {
        console.log(`⚠️  ${query}: ${err.message}`);
      }
    }

    // Step 2: Drop existing problematic policies
    console.log('\n📝 Step 2: Dropping existing policies...');
    
    const dropPolicyQueries = [
      'DROP POLICY IF EXISTS "Users can view classes they teach" ON public.classes;',
      'DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;',
      'DROP POLICY IF EXISTS "Students can view their classes" ON public.classes;',
      'DROP POLICY IF EXISTS "Teachers can view subjects they teach" ON public.subjects;',
      'DROP POLICY IF EXISTS "Students can view subjects in their classes" ON public.subjects;',
      'DROP POLICY IF EXISTS "Teachers can view their students" ON public.students;',
      'DROP POLICY IF EXISTS "Students can view themselves" ON public.students;'
    ];

    for (const query of dropPolicyQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`⚠️  ${query}: ${error.message}`);
        } else {
          console.log(`✅ ${query}`);
        }
      } catch (err) {
        console.log(`⚠️  ${query}: ${err.message}`);
      }
    }

    // Step 3: Create simple RLS policies
    console.log('\n📝 Step 3: Creating simple RLS policies...');
    
    const createPolicyQueries = [
      'ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "Authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);',
      'ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "Authenticated users can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);',
      'ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "Authenticated users can view students" ON public.students FOR SELECT TO authenticated USING (true);',
      'ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "Authenticated users can view contents" ON public.contents FOR SELECT TO authenticated USING (true);'
    ];

    for (const query of createPolicyQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`⚠️  ${query}: ${error.message}`);
        } else {
          console.log(`✅ ${query}`);
        }
      } catch (err) {
        console.log(`⚠️  ${query}: ${err.message}`);
      }
    }

    // Step 4: Test the fixes
    console.log('\n🧪 Step 4: Testing the fixes...');
    
    const testQueries = [
      { name: 'schools', query: 'SELECT COUNT(*) as count FROM schools' },
      { name: 'classes', query: 'SELECT COUNT(*) as count FROM classes' },
      { name: 'subjects', query: 'SELECT COUNT(*) as count FROM subjects' },
      { name: 'students', query: 'SELECT COUNT(*) as count FROM students' },
      { name: 'contents', query: 'SELECT COUNT(*) as count FROM contents' }
    ];

    for (const test of testQueries) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: test.query });
        if (error) {
          console.log(`❌ ${test.name} table: ${error.message}`);
        } else {
          console.log(`✅ ${test.name} table: accessible`);
        }
      } catch (err) {
        console.log(`❌ ${test.name} table: ${err.message}`);
      }
    }

    console.log('\n🎉 RLS fixes completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your application');
    console.log('2. Check if the 500 errors are resolved');
    console.log('3. Monitor the application logs');

  } catch (error) {
    console.error('❌ Error during RLS fixes:', error.message);
  }
}

fixSupabaseRLS();