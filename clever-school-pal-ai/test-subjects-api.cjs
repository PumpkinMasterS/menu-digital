const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSubjectsAPI() {
  console.log('🧪 Testing subjects API...');
  
  try {
    // Test the exact query that was failing
    const { data, error } = await supabase
      .from('subjects')
      .select('id,name,description,grade,teacher_name,school_id,schools(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Subjects API failed:', error);
      return false;
    }
    
    console.log('✅ Subjects API working!');
    console.log(`📊 Found ${data.length} subjects`);
    if (data.length > 0) {
      console.log('📝 Sample subject:', JSON.stringify(data[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing subjects API:', error.message);
    return false;
  }
}

async function testClassesAPI() {
  console.log('🧪 Testing classes API...');
  
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Classes API failed:', error);
      return false;
    }
    
    console.log('✅ Classes API working!');
    console.log(`📊 Found ${data.length} classes`);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing classes API:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API tests after RLS fix...');
  
  const subjectsOk = await testSubjectsAPI();
  const classesOk = await testClassesAPI();
  
  if (subjectsOk && classesOk) {
    console.log('\n🎉 All API tests passed! The infinite recursion issue is fixed.');
  } else {
    console.log('\n⚠️  Some API tests failed. Check the errors above.');
  }
}

runTests();