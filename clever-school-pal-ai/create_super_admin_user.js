import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdmin() {
  try {
    console.log('🔐 Creating super admin user...');
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'whiswher@gmail.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        name: 'Super Admin',
        role: 'super_admin'
      },
      app_metadata: {
        role: 'super_admin',
        is_super_admin: true
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      return;
    }

    console.log('✅ Auth user created:', authData.user.email);

    // Create corresponding admin_users record
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .upsert({
        user_id: authData.user.id,
        email: 'whiswher@gmail.com',
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true
      }, {
        onConflict: 'email'
      })
      .select();

    if (adminError) {
      console.error('❌ Admin user creation failed:', adminError.message);
      return;
    }

    console.log('✅ Admin user created:', adminData[0]);
    console.log('🎉 Super admin user setup complete!');
    console.log('📧 Email: whiswher@gmail.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
  }
}

createSuperAdmin();