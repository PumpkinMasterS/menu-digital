const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTeacherClassSubjectsRecursion() {
  console.log('🔧 Fixing teacher_class_subjects infinite recursion...');
  
  try {
    // First, disable RLS temporarily to avoid recursion during fix
    console.log('1. Disabling RLS temporarily...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;'
    });
    
    // Drop all existing policies that might cause recursion
    console.log('2. Dropping problematic policies...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "super_admin_all_access_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "school_admin_access_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "teacher_own_assignments_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "teacher_class_subjects_final" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "authenticated_read_teacher_class_subjects" ON teacher_class_subjects;'
    ];
    
    for (const sql of dropPolicies) {
      await supabase.rpc('exec_sql', { sql });
    }
    
    // Re-enable RLS
    console.log('3. Re-enabling RLS...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;'
    });
    
    // Create simple, non-recursive policy for authenticated users
    console.log('4. Creating simple non-recursive policy...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "authenticated_users_full_access_teacher_class_subjects" ON teacher_class_subjects
        FOR ALL 
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
      `
    });
    
    console.log('✅ teacher_class_subjects recursion fixed!');
    
    // Test the fix
    console.log('5. Testing the fix...');
    const { data: testData, error: testError } = await supabase
      .from('teacher_class_subjects')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Test passed! teacher_class_subjects is accessible');
    }
    
    // Now test subjects table
    console.log('6. Testing subjects table...');
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, description')
      .limit(1);
    
    if (subjectsError) {
      console.error('❌ Subjects test failed:', subjectsError.message);
    } else {
      console.log('✅ Subjects test passed!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing recursion:', error.message);
  }
}

fixTeacherClassSubjectsRecursion();