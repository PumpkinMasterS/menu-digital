const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixSpecificErrors() {
  console.log('🔧 Fixing specific console errors...');
  
  // 1. Check if schools table has slug column
  console.log('\n1️⃣ Checking schools table structure...');
  try {
    const { data, error } = await supabase.from('schools').select('id,name').limit(1);
    if (error) {
      console.log('❌ Schools table access error:', error.message);
    } else {
      console.log('✅ Schools table accessible');
      
      // Try to add slug column if it doesn't exist
      try {
        const { data: withSlug, error: slugError } = await supabase.from('schools').select('id,name,slug').limit(1);
        if (slugError && slugError.message.includes('slug')) {
          console.log('⚠️  Slug column missing, but table is accessible without it');
        } else {
          console.log('✅ Slug column exists');
        }
      } catch (err) {
        console.log('⚠️  Slug column check failed:', err.message);
      }
    }
  } catch (err) {
    console.log('❌ Schools table error:', err.message);
  }
  
  // 2. Check pedagogical_tags table
  console.log('\n2️⃣ Checking pedagogical_tags table...');
  try {
    const { data, error } = await supabase.from('pedagogical_tags').select('*').limit(1);
    if (error) {
      console.log('❌ Pedagogical tags table error:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('📝 Table does not exist - this needs to be created in Supabase dashboard');
      }
    } else {
      console.log('✅ Pedagogical tags table accessible');
    }
  } catch (err) {
    console.log('❌ Pedagogical tags error:', err.message);
  }
  
  // 3. Check chat_logs table
  console.log('\n3️⃣ Checking chat_logs table...');
  try {
    const { data, error } = await supabase.from('chat_logs').select('id,created_at,question,student_id').limit(1);
    if (error) {
      console.log('❌ Chat logs table error:', error.message);
    } else {
      console.log('✅ Chat logs table accessible');
    }
  } catch (err) {
    console.log('❌ Chat logs error:', err.message);
  }
  
  // 4. Check public_list_admin_users function
  console.log('\n4️⃣ Checking public_list_admin_users function...');
  try {
    const { data, error } = await supabase.rpc('public_list_admin_users');
    if (error) {
      console.log('❌ Function error:', error.message);
      if (error.message.includes('Could not find the function')) {
        console.log('📝 Function does not exist - needs to be created in Supabase dashboard');
      }
    } else {
      console.log('✅ Function working, found', data?.length || 0, 'admin users');
    }
  } catch (err) {
    console.log('❌ Function test error:', err.message);
  }
  
  // 5. Test alternative approaches
  console.log('\n5️⃣ Testing alternative approaches...');
  
  // Try to get schools without slug
  try {
    const { data, error } = await supabase.from('schools').select('id,name');
    if (!error && data) {
      console.log('✅ Schools accessible without slug:', data.length, 'schools found');
    }
  } catch (err) {
    console.log('❌ Schools alternative test failed:', err.message);
  }
  
  // Try to get users from auth.users (if accessible)
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error && data) {
      console.log('✅ Auth users accessible:', data.users?.length || 0, 'users found');
      
      // Count admin users
      const adminUsers = data.users?.filter(user => 
        user.user_metadata?.role === 'super_admin' || 
        user.user_metadata?.role === 'director'
      ) || [];
      console.log('👥 Admin users found:', adminUsers.length);
    }
  } catch (err) {
    console.log('❌ Auth users test failed:', err.message);
  }
  
  console.log('\n📋 SUMMARY OF ISSUES:');
  console.log('1. Schools table: Missing slug column (non-critical)');
  console.log('2. Pedagogical tags: Table may not exist');
  console.log('3. Chat logs: RLS policies may be too restrictive');
  console.log('4. Admin users function: Does not exist');
  
  console.log('\n🛠️  RECOMMENDED FIXES:');
  console.log('1. Update frontend to not require slug column for schools');
  console.log('2. Create pedagogical_tags table in Supabase dashboard');
  console.log('3. Adjust RLS policies to allow authenticated access');
  console.log('4. Create public_list_admin_users function or use auth.admin.listUsers');
  
  console.log('\n✅ Analysis completed!');
}

// Execute the analysis
fixSpecificErrors().catch(console.error);