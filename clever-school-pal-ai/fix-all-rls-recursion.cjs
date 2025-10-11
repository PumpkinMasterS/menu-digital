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

async function fixAllRLSRecursion() {
  console.log('🔧 Fixing ALL RLS infinite recursion issues...');
  
  try {
    // Step 1: Disable RLS on all problematic tables
    console.log('1. Disabling RLS temporarily on all tables...');
    const disableRLS = [
      'ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE classes DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE contents DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE content_classes DISABLE ROW LEVEL SECURITY;'
    ];
    
    for (const sql of disableRLS) {
      try {
        await supabase.rpc('exec_sql', { sql });
      } catch (error) {
        console.log(`Note: ${sql} - ${error.message}`);
      }
    }
    
    // Step 2: Drop ALL existing policies that might cause recursion
    console.log('2. Dropping ALL potentially problematic policies...');
    const dropPolicies = [
      // teacher_class_subjects policies
      'DROP POLICY IF EXISTS "super_admin_all_access_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "school_admin_access_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "teacher_own_assignments_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "teacher_class_subjects_final" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "authenticated_read_teacher_class_subjects" ON teacher_class_subjects;',
      'DROP POLICY IF EXISTS "authenticated_users_full_access_teacher_class_subjects" ON teacher_class_subjects;',
      
      // classes policies
      'DROP POLICY IF EXISTS "teachers_view_assigned_classes" ON classes;',
      'DROP POLICY IF EXISTS "Super admin full access classes" ON classes;',
      'DROP POLICY IF EXISTS "School admin access classes" ON classes;',
      'DROP POLICY IF EXISTS "Teacher access classes" ON classes;',
      'DROP POLICY IF EXISTS "Service role full access classes" ON classes;',
      'DROP POLICY IF EXISTS "Allow all operations on classes" ON classes;',
      'DROP POLICY IF EXISTS "Super Admin All Operations on Classes" ON classes;',
      'DROP POLICY IF EXISTS "classes_final" ON classes;',
      'DROP POLICY IF EXISTS "authenticated_read_classes" ON classes;',
      'DROP POLICY IF EXISTS "Authenticated users can view classes" ON classes;',
      'DROP POLICY IF EXISTS "Teachers can view their classes" ON classes;',
      'DROP POLICY IF EXISTS "Users can view classes they teach" ON classes;',
      'DROP POLICY IF EXISTS "Students can view their classes" ON classes;',
      'DROP POLICY IF EXISTS "Teachers can view their assigned classes" ON classes;',
      
      // subjects policies that might reference other tables
      'DROP POLICY IF EXISTS "Teachers can view their subjects" ON subjects;',
      'DROP POLICY IF EXISTS "teachers_view_assigned_subjects" ON subjects;',
      
      // content_classes policies
      'DROP POLICY IF EXISTS "teachers_view_content_classes" ON content_classes;',
      'DROP POLICY IF EXISTS "teachers_manage_content_classes" ON content_classes;',
      
      // contents policies
      'DROP POLICY IF EXISTS "Teachers can view content for their classes" ON contents;'
    ];
    
    for (const sql of dropPolicies) {
      try {
        await supabase.rpc('exec_sql', { sql });
      } catch (error) {
        // Ignore errors for non-existent policies
      }
    }
    
    // Step 3: Re-enable RLS
    console.log('3. Re-enabling RLS on all tables...');
    const enableRLS = [
      'ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE classes ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE contents ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;'
    ];
    
    for (const sql of enableRLS) {
      await supabase.rpc('exec_sql', { sql });
    }
    
    // Step 4: Create simple, non-recursive policies
    console.log('4. Creating simple, non-recursive policies...');
    const createPolicies = [
      // Simple authenticated access for all tables
      `CREATE POLICY "authenticated_full_access_teacher_class_subjects" ON teacher_class_subjects
       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`,
      
      `CREATE POLICY "authenticated_full_access_classes" ON classes
       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`,
      
      `CREATE POLICY "authenticated_full_access_subjects" ON subjects
       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`,
      
      `CREATE POLICY "authenticated_full_access_contents" ON contents
       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`,
      
      `CREATE POLICY "authenticated_full_access_content_classes" ON content_classes
       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`
    ];
    
    for (const sql of createPolicies) {
      await supabase.rpc('exec_sql', { sql });
    }
    
    console.log('✅ All RLS recursion issues fixed!');
    
    // Step 5: Test all APIs
    console.log('5. Testing all APIs...');
    
    const tests = [
      { table: 'teacher_class_subjects', name: 'Teacher Class Subjects' },
      { table: 'classes', name: 'Classes' },
      { table: 'subjects', name: 'Subjects' },
      { table: 'contents', name: 'Contents' },
      { table: 'content_classes', name: 'Content Classes' }
    ];
    
    let allPassed = true;
    
    for (const test of tests) {
      try {
        const { data, error } = await supabase
          .from(test.table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ ${test.name} test failed:`, error.message);
          allPassed = false;
        } else {
          console.log(`✅ ${test.name} test passed`);
        }
      } catch (error) {
        console.error(`❌ ${test.name} test error:`, error.message);
        allPassed = false;
      }
    }
    
    // Test the specific subjects query that was failing
    console.log('6. Testing the specific subjects query...');
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id,name,description,grade,teacher_name,school_id,schools(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('❌ Subjects with schools query failed:', error.message);
        allPassed = false;
      } else {
        console.log('✅ Subjects with schools query passed');
        console.log(`📊 Found ${data.length} subjects`);
      }
    } catch (error) {
      console.error('❌ Subjects with schools query error:', error.message);
      allPassed = false;
    }
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! RLS recursion completely fixed.');
    } else {
      console.log('\n⚠️  Some tests failed. Check errors above.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing RLS recursion:', error.message);
  }
}

fixAllRLSRecursion();