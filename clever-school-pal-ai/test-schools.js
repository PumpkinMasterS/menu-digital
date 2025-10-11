import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchools() {
  try {
    console.log('\n=== Testing schools table ===');
    
    // Test basic select
    const { data, error } = await supabase
      .from('schools')
      .select('*');
    
    if (error) {
      console.error('Error fetching schools:', error);
      return;
    }
    
    console.log('Schools found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('First school:', data[0]);
    } else {
      console.log('No schools in database');
      
      // Try to create a test school
      console.log('\n=== Creating test school ===');
      const { data: newSchool, error: createError } = await supabase
        .from('schools')
        .insert({
          name: 'Escola Teste',
          address: 'Rua Teste, 123',
          contact_email: 'teste@escola.pt',
          contact_phone: '123456789'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating test school:', createError);
      } else {
        console.log('Test school created:', newSchool);
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testSchools();