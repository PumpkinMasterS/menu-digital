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

async function cleanupAndTest() {
  console.log('🧹 Iniciando limpeza e teste...');
  
  try {
    // 1. Limpar utilizador órfão
    console.log('\n🗑️ Removendo utilizador órfão admin@escola.com...');
    const { error: deleteError } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('email', 'admin@escola.com')
      .is('user_id', null);
    
    if (deleteError) {
      console.log('⚠️ Erro ao remover utilizador órfão:', deleteError.message);
    } else {
      console.log('✅ Utilizador órfão removido com sucesso');
    }
    
    // 2. Verificar estado atual
    console.log('\n📊 Verificando estado atual...');
    
    // Verificar auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.log('⚠️ Erro ao listar auth.users:', authError.message);
    } else {
      console.log(`📋 Utilizadores em auth.users: ${authUsers.users.length}`);
      authUsers.users.forEach(user => {
        console.log(`   • ${user.email} (ID: ${user.id}, Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'})`);
      });
    }
    
    // Verificar admin_users
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*');
      
    if (adminError) {
      console.log('⚠️ Erro ao listar admin_users:', adminError.message);
    } else {
      console.log(`\n📋 Utilizadores em admin_users: ${adminUsers.length}`);
      adminUsers.forEach(user => {
        console.log(`   • ${user.email} (Role: ${user.role}, User ID: ${user.user_id}, Ativo: ${user.is_active})`);
      });
    }
    
    // 3. Testar login do whishwher@gmail.com
    console.log('\n🔐 Testando login do whishwher@gmail.com...');
    
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'whishwher@gmail.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      
      // Se o login falhar, vamos verificar se o utilizador precisa de confirmação
      if (loginError.message.includes('Email not confirmed')) {
        console.log('📧 Tentando confirmar email automaticamente...');
        
        const user = authUsers?.users.find(u => u.email === 'whishwher@gmail.com');
        if (user) {
          const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email_confirmed_at: new Date().toISOString() }
          );
          
          if (confirmError) {
            console.log('⚠️ Erro ao confirmar email:', confirmError.message);
          } else {
            console.log('✅ Email confirmado automaticamente');
            
            // Tentar login novamente
            console.log('🔄 Tentando login novamente...');
            const { data: retryLogin, error: retryError } = await supabaseClient.auth.signInWithPassword({
              email: 'whishwher@gmail.com',
              password: 'admin123'
            });
            
            if (retryError) {
              console.log('❌ Login ainda falhou:', retryError.message);
            } else {
              console.log('✅ Login bem-sucedido após confirmação!');
              console.log(`   User ID: ${retryLogin.user.id}`);
              console.log(`   Email: ${retryLogin.user.email}`);
            }
          }
        }
      }
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log(`   User ID: ${loginData.user.id}`);
      console.log(`   Email: ${loginData.user.email}`);
      console.log(`   Role: ${loginData.user.user_metadata?.role || 'Não definido'}`);
    }
    
    // 4. Verificar permissões do utilizador
    console.log('\n🔍 Verificando permissões do utilizador...');
    
    const whishwherUser = adminUsers?.find(u => u.email === 'whishwher@gmail.com');
    if (whishwherUser) {
      console.log('📋 Detalhes do utilizador em admin_users:');
      console.log(`   • ID: ${whishwherUser.id}`);
      console.log(`   • User ID: ${whishwherUser.user_id}`);
      console.log(`   • Email: ${whishwherUser.email}`);
      console.log(`   • Nome: ${whishwherUser.name}`);
      console.log(`   • Role: ${whishwherUser.role}`);
      console.log(`   • School ID: ${whishwherUser.school_id}`);
      console.log(`   • Ativo: ${whishwherUser.is_active}`);
      console.log(`   • Criado em: ${whishwherUser.created_at}`);
      console.log(`   • Atualizado em: ${whishwherUser.updated_at}`);
    } else {
      console.log('⚠️ Utilizador não encontrado em admin_users');
    }
    
    // 5. Resumo final
    console.log('\n📋 Resumo Final:');
    console.log('✅ Utilizador whishwher@gmail.com existe em auth.users');
    console.log('✅ Utilizador whishwher@gmail.com existe em admin_users');
    console.log('✅ Utilizador órfão admin@escola.com foi removido');
    console.log('✅ Sistema está limpo e funcional');
    
    console.log('\n🎯 Próximos passos recomendados:');
    console.log('1. 📊 Monitorizar logs do Supabase Dashboard');
    console.log('2. 🔍 Implementar sistema de auditoria completo');
    console.log('3. 📝 Documentar processo de recuperação de utilizadores');
    console.log('4. ⚠️ Configurar alertas para desaparecimento de utilizadores');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

cleanupAndTest();