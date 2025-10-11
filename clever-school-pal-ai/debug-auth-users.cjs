const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugAuthUsers() {
  console.log('🔍 Investigando problema dos utilizadores desaparecidos...');
  
  // Usar service role key para acesso completo
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('\n📊 Verificando tabela auth.users...');
    
    // Verificar utilizadores na tabela auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao listar utilizadores auth:', authError.message);
    } else {
      console.log(`✅ Encontrados ${authUsers.users.length} utilizadores na tabela auth.users:`);
      authUsers.users.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id}) - Criado: ${user.created_at}`);
        console.log(`    Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`    Último login: ${user.last_sign_in_at || 'Nunca'}`);
        console.log(`    Metadados: ${JSON.stringify(user.user_metadata)}`);
        console.log('');
      });
    }

    console.log('\n📊 Verificando tabela admin_users...');
    
    // Verificar utilizadores na tabela admin_users
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*');
    
    if (adminError) {
      console.error('❌ Erro ao consultar admin_users:', adminError.message);
    } else {
      console.log(`✅ Encontrados ${adminUsers.length} utilizadores na tabela admin_users:`);
      adminUsers.forEach(user => {
        console.log(`  - User ID: ${user.user_id}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    School ID: ${user.school_id}`);
        console.log(`    Ativo: ${user.active}`);
        console.log(`    Criado: ${user.created_at}`);
        console.log('');
      });
    }

    console.log('\n🔍 Procurando por whiswher@gmail.com especificamente...');
    
    // Procurar especificamente pelo utilizador whiswher@gmail.com
    const whiswherInAuth = authUsers.users.find(user => user.email === 'whiswher@gmail.com');
    if (whiswherInAuth) {
      console.log('✅ whiswher@gmail.com encontrado na tabela auth.users');
      console.log(`   ID: ${whiswherInAuth.id}`);
      
      // Verificar se existe na tabela admin_users
      const { data: whiswherAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', whiswherInAuth.id)
        .single();
      
      if (whiswherAdmin) {
        console.log('✅ whiswher@gmail.com encontrado na tabela admin_users');
        console.log(`   Role: ${whiswherAdmin.role}`);
      } else {
        console.log('❌ whiswher@gmail.com NÃO encontrado na tabela admin_users');
      }
    } else {
      console.log('❌ whiswher@gmail.com NÃO encontrado na tabela auth.users');
    }

    console.log('\n🔍 Verificando políticas RLS que podem afetar utilizadores...');
    
    // Verificar políticas RLS na tabela admin_users
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'admin_users' })
      .catch(() => ({ data: null, error: 'RPC não disponível' }));
    
    if (policies) {
      console.log('📋 Políticas RLS encontradas:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.qual}`);
      });
    } else {
      console.log('⚠️ Não foi possível verificar políticas RLS automaticamente');
    }

    console.log('\n🔍 Verificando se existem triggers que podem eliminar utilizadores...');
    
    // Tentar verificar triggers (pode não funcionar dependendo das permissões)
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .or('event_object_table.eq.admin_users,event_object_table.eq.users')
      .catch(() => ({ data: null, error: 'Sem permissões' }));
    
    if (triggers && triggers.length > 0) {
      console.log('🔧 Triggers encontrados:');
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} na tabela ${trigger.event_object_table}`);
        console.log(`    Evento: ${trigger.event_manipulation}`);
      });
    } else {
      console.log('ℹ️ Nenhum trigger específico encontrado ou sem permissões para verificar');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugAuthUsers();