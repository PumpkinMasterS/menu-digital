require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAuthLogin() {
  console.log('🔧 Corrigindo problema de autenticação...');
  
  try {
    // 1. Verificar utilizador atual
    console.log('\n1️⃣ Verificando utilizador atual...');
    const { data: currentUser, error: currentError } = await supabase.auth.admin.getUserById('c4eef3b2-e7ed-4878-8451-ea677c368c27');
    
    if (currentError) {
      console.error('❌ Erro ao buscar utilizador:', currentError);
    } else {
      console.log('✅ Utilizador encontrado:', {
        id: currentUser.user.id,
        email: currentUser.user.email,
        email_confirmed_at: currentUser.user.email_confirmed_at,
        last_sign_in_at: currentUser.user.last_sign_in_at,
        created_at: currentUser.user.created_at
      });
    }

    // 2. Resetar password
    console.log('\n2️⃣ Resetando password para admin123...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      'c4eef3b2-e7ed-4878-8451-ea677c368c27',
      {
        password: 'admin123',
        email_confirm: true
      }
    );
    
    if (updateError) {
      console.error('❌ Erro ao resetar password:', updateError);
    } else {
      console.log('✅ Password resetada com sucesso');
    }

    // 3. Testar login
    console.log('\n3️⃣ Testando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'whiswher@gmail.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError);
      
      // 4. Se falhar, recriar utilizador
      console.log('\n4️⃣ Recriando utilizador...');
      
      // Primeiro, deletar utilizador existente
      const { error: deleteError } = await supabase.auth.admin.deleteUser('c4eef3b2-e7ed-4878-8451-ea677c368c27');
      if (deleteError) {
        console.error('❌ Erro ao deletar utilizador:', deleteError);
      } else {
        console.log('✅ Utilizador deletado');
      }
      
      // Criar novo utilizador
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'whiswher@gmail.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
          name: 'Super Admin',
          role: 'super_admin'
        }
      });
      
      if (createError) {
        console.error('❌ Erro ao criar utilizador:', createError);
      } else {
        console.log('✅ Novo utilizador criado:', newUser.user.id);
        
        // Adicionar à tabela admin_users
        const { error: adminError } = await supabase
          .from('admin_users')
          .upsert({
            user_id: newUser.user.id,
            email: 'whiswher@gmail.com',
            role: 'super_admin',
            is_active: true,
            metadata: {
              name: 'Super Admin',
              created_by: 'system'
            }
          });
          
        if (adminError) {
          console.error('❌ Erro ao adicionar admin_users:', adminError);
        } else {
          console.log('✅ Utilizador adicionado à tabela admin_users');
        }
        
        // Testar login novamente
        console.log('\n5️⃣ Testando login com novo utilizador...');
        const { data: finalLogin, error: finalError } = await supabase.auth.signInWithPassword({
          email: 'whiswher@gmail.com',
          password: 'admin123'
        });
        
        if (finalError) {
          console.error('❌ Login ainda falha:', finalError);
        } else {
          console.log('✅ Login bem-sucedido!');
        }
      }
    } else {
      console.log('✅ Login bem-sucedido!');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixAuthLogin();