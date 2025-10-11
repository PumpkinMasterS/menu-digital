const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiEndpoints() {
  console.log('🧪 Testing API endpoints...');
  
  const tests = [
    {
      name: 'Students (basic)',
      query: () => supabase.from('students').select('id,name,email,active,bot_active,class_id,school_id').limit(5)
    },
    {
      name: 'Students (with phone)',
      query: () => supabase.from('students').select('id,name,phone_number,whatsapp_number,email,active,bot_active,class_id,school_id').limit(5)
    },
    {
      name: 'Students (with relations)',
      query: () => supabase.from('students').select('id,name,phone_number,whatsapp_number,email,active,bot_active,class_id,school_id,classes(id,name),schools(id,name)').order('name', { ascending: true }).limit(5)
    },
    {
      name: 'Classes',
      query: () => supabase.from('classes').select('id,name,school_id').order('name', { ascending: true }).limit(5)
    },
    {
      name: 'Subjects',
      query: () => supabase.from('subjects').select('id,name').limit(5)
    },
    {
      name: 'Contents (basic)',
      query: () => supabase.from('contents').select('id,title').limit(5)
    },
    {
      name: 'Contents (with description)',
      query: () => supabase.from('contents').select('id,title,description').limit(5)
    },
    {
      name: 'Schools',
      query: () => supabase.from('schools').select('id,name').limit(5)
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      console.log(`\n--- Testing ${test.name} ---`);
      
      const { data, error } = await test.query();
      
      if (error) {
        console.log(`❌ ${test.name} failed:`, error.message);
        console.log('   Error code:', error.code);
        if (error.details) console.log('   Details:', error.details);
      } else {
        console.log(`✅ ${test.name} passed: ${data?.length || 0} records`);
        if (data && data.length > 0) {
          console.log('   Sample record keys:', Object.keys(data[0]).join(', '));
        }
        passedTests++;
      }
    } catch (err) {
      console.log(`❌ ${test.name} exception:`, err.message);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All API endpoints are working correctly!');
  } else {
    console.log('⚠️  Some API endpoints still have issues. Please check the errors above.');
  }
}

testApiEndpoints().then(() => {
  console.log('\n🏁 API testing complete');
}).catch(console.error);