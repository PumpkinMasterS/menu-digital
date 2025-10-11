const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyRLSPolicies() {
  console.log('🔍 Verificando políticas RLS da tabela discord_guilds...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente ausentes!');
    return;
  }
  
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('\n1️⃣ Verificando se RLS está habilitado...');
  const { data: tableInfo, error: tableError } = await adminSupabase
    .rpc('sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE tablename = 'discord_guilds' AND schemaname = 'public';
      `
    });
  
  if (tableError) {
    console.error('❌ Erro ao verificar tabela:', tableError);
  } else {
    console.log('📋 Info da tabela:', tableInfo);
  }
  
  console.log('\n2️⃣ Listando políticas RLS...');
  const { data: policies, error: policiesError } = await adminSupabase
    .rpc('sql', {
      query: `
        SELECT 
          pol.policyname,
          pol.cmd,
          pol.permissive,
          pol.roles,
          pol.qual,
          pol.with_check
        FROM pg_policy pol
        JOIN pg_class pc ON pol.polrelid = pc.oid
        JOIN pg_namespace pn ON pc.relnamespace = pn.oid
        WHERE pc.relname = 'discord_guilds' AND pn.nspname = 'public';
      `
    });
  
  if (policiesError) {
    console.error('❌ Erro ao buscar políticas:', policiesError);
  } else {
    console.log(`📋 Políticas encontradas: ${policies.length}`);
    policies.forEach((policy, index) => {
      console.log(`\n   Política ${index + 1}: ${policy.policyname}`);
      console.log(`   - Comando: ${policy.cmd}`);
      console.log(`   - Permissiva: ${policy.permissive}`);
      console.log(`   - Roles: ${policy.roles}`);
      console.log(`   - Qualificação: ${policy.qual}`);
      console.log(`   - With Check: ${policy.with_check}`);
    });
  }
  
  console.log('\n3️⃣ Verificando estrutura da tabela...');
  const { data: columns, error: columnsError } = await adminSupabase
    .rpc('sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'discord_guilds' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
  
  if (columnsError) {
    console.error('❌ Erro ao verificar colunas:', columnsError);
  } else {
    console.log('📋 Colunas da tabela:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
  }
  
  console.log('\n🔍 Diagnóstico concluído!');
  console.log('\n💡 Análise:');
  console.log('   - A inserção funciona com service_role (bypass RLS)');
  console.log('   - A inserção falha com anon_key (sujeita a RLS)');
  console.log('   - Isso indica que as políticas RLS estão muito restritivas ou ausentes para INSERT');
}

verifyRLSPolicies().catch(console.error);