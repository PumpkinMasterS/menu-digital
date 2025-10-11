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

async function addToAdminUsers() {
  try {
    console.log('🔍 Procurando utilizador whiswher@gmail.com...');
    
    // Buscar utilizador existente no Supabase Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar utilizadores:', listError.message);
      return;
    }
    
    const existingUser = users.users.find(user => user.email === 'whiswher@gmail.com');
    
    if (!existingUser) {
      console.error('❌ Utilizador whiswher@gmail.com não encontrado na tabela auth.users');
      return;
    }
    
    console.log('✅ Utilizador encontrado:', existingUser.id);
    console.log('📧 Email:', existingUser.email);
    console.log('📅 Criado em:', existingUser.created_at);
    console.log('🔐 Confirmado:', existingUser.email_confirmed_at ? 'Sim' : 'Não');
    
    // Verificar se já existe na tabela admin_users
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', existingUser.id)
      .single();
    
    if (existingAdmin) {
      console.log('ℹ️ Utilizador já existe na tabela admin_users:');
      console.log('   Role:', existingAdmin.role);
      console.log('   Ativo:', existingAdmin.is_active);
      console.log('   Escola:', existingAdmin.school_id || 'Global');
      return;
    }
    
    console.log('➕ Adicionando à tabela admin_users...');
    
    // Adicionar à tabela admin_users
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: existingUser.id,
        email: 'whiswher@gmail.com',
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true
      })
      .select();
    
    if (adminError) {
      console.error('❌ Erro ao adicionar à tabela admin_users:', adminError.message);
      return;
    }
    
    console.log('✅ Utilizador adicionado à tabela admin_users:', adminData[0]);
    console.log('\n🎉 Configuração completa!');
    console.log('📧 Email: whiswher@gmail.com');
    console.log('🔑 Password: admin123');
    console.log('👑 Role: super_admin');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

addToAdminUsers();