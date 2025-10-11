const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Allow passing table name as CLI arg. Defaults to 'discord_guilds'.
const targetTable = process.argv[2] || 'discord_guilds';

async function checkCurrentRLS() {
  console.log('🔍 VERIFICANDO POLÍTICAS RLS ATUAIS');
  console.log('====================================');
  console.log('📌 Tabela alvo:', targetTable);
  
  try {
    // Verificar políticas existentes
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = '${targetTable.split('.').pop()}' 
          AND schemaname = '${targetTable.includes('.') ? targetTable.split('.')[0] : 'public'}'
        ORDER BY policyname;
      `
    });
    
    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
    } else {
      console.log(`📋 Políticas encontradas: ${policies?.length || 0}`);
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`  • ${policy.policyname} (${policy.cmd}) - Roles: ${policy.roles}`);
          console.log(`    USING: ${policy.qual || 'true'}`);
          console.log(`    WITH CHECK: ${policy.with_check || 'true'}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhuma política RLS encontrada!');
      }
    }
    
    // Verificar se RLS está habilitado
    const [schemaName, tableNameOnly] = targetTable.includes('.')
      ? targetTable.split('.')
      : ['public', targetTable];

    const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT c.relname, c.relrowsecurity 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = '${tableNameOnly}' AND n.nspname = '${schemaName}';
      `
    });
    
    if (!rlsError && rlsData && rlsData.length > 0) {
      console.log('🔒 RLS Status:', rlsData[0]?.relrowsecurity ? 'HABILITADO' : 'DESABILITADO'); 
    } else {
      console.log('❌ Erro ao verificar status RLS:', rlsError);
    }

    // Teste de inserção (apenas para tabelas públicas conhecidas e não para storage.objects)
    const canTestInsert = schemaName === 'public' && tableNameOnly !== 'storage.objects' && tableNameOnly !== 'objects';

    if (canTestInsert) {
      console.log('\n🧪 TESTANDO INSERÇÃO REAL');
      console.log('=========================');
      if (tableNameOnly === 'discord_guilds') {
        const testData = {
          guild_id: `test_${Date.now()}`,
          guild_name: 'Test Guild Real',
          school_id: '550e8400-e29b-41d4-a716-446655440000'
        };
        console.log('📤 Dados de teste:', testData);
        const { data: insertResult, error: insertError } = await supabase
          .from('discord_guilds')
          .insert([testData])
          .select();
        if (insertError) {
          console.error('❌ Erro na inserção:', insertError);
        } else {
          console.log('✅ Inserção bem-sucedida:', insertResult);
          await supabase.from('discord_guilds').delete().eq('guild_id', testData.guild_id);
          console.log('🧹 Dados de teste removidos');
        }
      } else {
        console.log('ℹ️ Teste de inserção automática não implementado para esta tabela.');
      }
    } else {
      console.log('\nℹ️ Teste de inserção pulado para', targetTable);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkCurrentRLS().catch(console.error);