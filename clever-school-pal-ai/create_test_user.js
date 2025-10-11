import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    console.log('🔐 Creating test user...');
    
    const testEmail = 'admin@test.com';
    const testPassword = 'admin123';
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Test Admin',
        role: 'super_admin'
      },
      app_metadata: {
        role: 'super_admin',
        is_active: true
      }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user.email);
    
    // Create corresponding admin_users record
    const { error: adminError } = await supabase
      .from('admin_users')
      .upsert({
        email: testEmail,
        name: 'Test Admin',
        role: 'super_admin',
        is_active: true,
        user_id: authData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });
    
    if (adminError) {
      console.error('❌ Error creating admin user:', adminError.message);
      return;
    }
    
    console.log('✅ Admin user record created');
    console.log('\n🎉 Test user created successfully!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('👤 Role: super_admin');
    console.log('\n🌐 You can now login at: http://localhost:8081/login');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createTestUser();