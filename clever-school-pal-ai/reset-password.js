import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function resetPassword() {
  console.log('🔑 Resetando password do whishwher@gmail.com...');
  
  try {
    // 1. Encontrar o utilizador
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Erro ao listar utilizadores:', listError.message);
      return;
    }
    
    const user = users.users.find(u => u.email === 'whishwher@gmail.com');
    
    if (!user) {
      console.log('❌ Utilizador whishwher@gmail.com não encontrado');
      return;
    }
    
    console.log(`✅ Utilizador encontrado: ${user.email} (ID: ${user.id})`);
    
    // 2. Resetar a password
    console.log('🔄 Atualizando password para admin123...');
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: 'admin123',
        email_confirmed_at: new Date().toISOString() // Garantir que o email está confirmado
      }
    );
    
    if (updateError) {
      console.log('❌ Erro ao atualizar password:', updateError.message);
      return;
    }
    
    console.log('✅ Password atualizada com sucesso!');
    
    // 3. Testar o login
    console.log('\n🔐 Testando login com nova password...');
    
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'whishwher@gmail.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      
      // Tentar diagnosticar o problema
      console.log('\n🔍 Diagnosticando problema...');
      console.log('📋 Detalhes do utilizador:');
      console.log(`   • Email confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
      console.log(`   • Último login: ${user.last_sign_in_at || 'Nunca'}`);
      console.log(`   • Criado em: ${user.created_at}`);
      console.log(`   • Atualizado em: ${user.updated_at}`);
      
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log(`   • User ID: ${loginData.user.id}`);
      console.log(`   • Email: ${loginData.user.email}`);
      console.log(`   • Confirmado: ${loginData.user.email_confirmed_at ? 'Sim' : 'Não'}`);
      
      // 4. Verificar dados em admin_users
      console.log('\n📊 Verificando dados em admin_users...');
      
      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', loginData.user.id)
        .single();
      
      if (adminError) {
        console.log('⚠️ Erro ao buscar dados em admin_users:', adminError.message);
      } else {
        console.log('✅ Dados encontrados em admin_users:');
        console.log(`   • Nome: ${adminUser.name}`);
        console.log(`   • Role: ${adminUser.role}`);
        console.log(`   • School ID: ${adminUser.school_id}`);
        console.log(`   • Ativo: ${adminUser.is_active}`);
      }
      
      // Fazer logout
      await supabaseClient.auth.signOut();
      console.log('🚪 Logout realizado');
    }
    
    console.log('\n🎉 Processo concluído!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('   • Email: whishwher@gmail.com');
    console.log('   • Password: admin123');
    console.log('   • Role: super_admin');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

resetPassword();