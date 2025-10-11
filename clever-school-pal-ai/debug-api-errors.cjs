const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEndpoints() {
  console.log('🔍 Testing Supabase API endpoints...');
  
  const endpoints = [
    {
      name: 'subjects',
      query: () => supabase.from('subjects').select('id,name,school_id').order('created_at', { ascending: false })
    },
    {
      name: 'classes', 
      query: () => supabase.from('classes').select('id,name,school_id,grade').order('created_at', { ascending: false })
    },
    {
      name: 'students',
      query: () => supabase.from('students').select('id,bot_active,school_id,class_id,created_at').order('created_at', { ascending: false })
    },
    {
      name: 'contents',
      query: () => supabase.from('contents').select('id,title,status,created_at').order('created_at', { ascending: false })
    },
    {
      name: 'students_with_relations',
      query: () => supabase.from('students').select('id,name,phone_number,whatsapp_number,email,active,bot_active,class_id,school_id,classes(id,name),schools(id,name)').order('name', { ascending: true })
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📊 Testing ${endpoint.name}...`);
    try {
      const { data, error } = await endpoint.query();
      
      if (error) {
        console.error(`❌ ${endpoint.name} error:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ ${endpoint.name} success: ${data?.length || 0} records`);
      }
    } catch (err) {
      console.error(`💥 ${endpoint.name} exception:`, err.message);
    }
  }
}

testEndpoints().catch(console.error);