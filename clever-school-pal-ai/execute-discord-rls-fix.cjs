const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase com service_role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas:');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeRLSFix() {
  console.log('🔧 Iniciando correção automática das políticas RLS...');
  
  try {
    // 1. Remover políticas existentes
    console.log('\n1️⃣ Removendo políticas existentes...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "discord_guilds_select_policy" ON discord_guilds;',
      'DROP POLICY IF EXISTS "discord_guilds_insert_policy" ON discord_guilds;',
      'DROP POLICY IF EXISTS "discord_guilds_update_policy" ON discord_guilds;',
      'DROP POLICY IF EXISTS "discord_guilds_delete_policy" ON discord_guilds;',
      'DROP POLICY IF EXISTS "discord_guilds_insert_permissive" ON discord_guilds;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON discord_guilds;',
      'DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON discord_guilds;',
      'DROP POLICY IF EXISTS "Enable update for users based on email" ON discord_guilds;',
      'DROP POLICY IF EXISTS "Enable delete for users based on email" ON discord_guilds;'
    ];
    
    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error && !error.message.includes('does not exist')) {
        console.warn('⚠️ Aviso ao remover política:', error.message);
      }
    }
    console.log('✅ Políticas antigas removidas');
    
    // 2. Habilitar RLS
    console.log('\n2️⃣ Habilitando RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;'
    });
    if (rlsError) {
      console.warn('⚠️ RLS já pode estar habilitado:', rlsError.message);
    } else {
      console.log('✅ RLS habilitado');
    }
    
    // 3. Criar novas políticas
    console.log('\n3️⃣ Criando novas políticas...');
    
    // Política SELECT
    const { error: selectError } = await supabase.rpc('exec_sql', {
      sql_query: `CREATE POLICY "discord_guilds_select_policy" ON discord_guilds
        FOR SELECT USING (true);`
    });
    if (selectError) {
      console.error('❌ Erro ao criar política SELECT:', selectError.message);
    } else {
      console.log('✅ Política SELECT criada');
    }
    
    // Política INSERT
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql_query: `CREATE POLICY "discord_guilds_insert_policy" ON discord_guilds
        FOR INSERT WITH CHECK (
          auth.role() = 'authenticated' OR
          auth.role() = 'service_role'
        );`
    });
    if (insertError) {
      console.error('❌ Erro ao criar política INSERT:', insertError.message);
    } else {
      console.log('✅ Política INSERT criada');
    }
    
    // Política UPDATE
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql_query: `CREATE POLICY "discord_guilds_update_policy" ON discord_guilds
        FOR UPDATE USING (
          auth.role() = 'authenticated' OR
          auth.role() = 'service_role'
        );`
    });
    if (updateError) {
      console.error('❌ Erro ao criar política UPDATE:', updateError.message);
    } else {
      console.log('✅ Política UPDATE criada');
    }
    
    // Política DELETE
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql_query: `CREATE POLICY "discord_guilds_delete_policy" ON discord_guilds
        FOR DELETE USING (
          auth.role() = 'authenticated' OR
          auth.role() = 'service_role'
        );`
    });
    if (deleteError) {
      console.error('❌ Erro ao criar política DELETE:', deleteError.message);
    } else {
      console.log('✅ Política DELETE criada');
    }
    
    // 4. Verificar políticas criadas
    console.log('\n4️⃣ Verificando políticas criadas...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT 
        pol.polname as policyname,
        pol.cmd,
        pol.permissive,
        pol.roles,
        pol.qual,
        pol.with_check
      FROM pg_policy pol
      JOIN pg_class pc ON pol.polrelid = pc.oid
      JOIN pg_namespace pn ON pc.relnamespace = pn.oid
      WHERE pc.relname = 'discord_guilds' AND pn.nspname = 'public';`
    });
    
    if (policiesError) {
      console.warn('⚠️ Não foi possível verificar políticas:', policiesError.message);
    } else {
      console.log('📋 Políticas encontradas:', policies?.length || 0);
    }
    
    // 5. Teste de inserção
    console.log('\n5️⃣ Testando inserção...');
    const testData = {
      guild_id: 'test_' + Date.now(),
      guild_name: 'Teste RLS Fix',
      school_id: '550e8400-e29b-41d4-a716-446655440000'
    };
    
    const { data: insertData, error: testError } = await supabase
      .from('discord_guilds')
      .insert(testData)
      .select();
    
    if (testError) {
      console.error('❌ Teste de inserção falhou:', testError.message);
      return false;
    } else {
      console.log('✅ Teste de inserção bem-sucedido!');
      
      // Limpar dados de teste
      await supabase
        .from('discord_guilds')
        .delete()
        .eq('guild_id', testData.guild_id);
      console.log('🧹 Dados de teste removidos');
    }
    
    console.log('\n🎉 Correção RLS concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Teste a inserção de guilds no painel /admin/discord');
    console.log('2. Mapeie o servidor Discord à escola');
    console.log('3. Convide o bot para o servidor');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro durante a correção RLS:', error.message);
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executeRLSFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { executeRLSFix };