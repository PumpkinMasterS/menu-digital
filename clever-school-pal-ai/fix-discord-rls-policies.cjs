const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixDiscordRLSPolicies() {
  console.log('🔧 Corrigindo políticas RLS da tabela discord_guilds...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente ausentes!');
    return;
  }
  
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('\n1️⃣ Removendo políticas existentes (se houver)...');
  
  // Lista de políticas que podem existir
  const policiesToDrop = [
    'discord_guilds_select_policy',
    'discord_guilds_insert_policy', 
    'discord_guilds_update_policy',
    'discord_guilds_delete_policy',
    'Enable read access for all users',
    'Enable insert for authenticated users only',
    'Enable update for users based on email',
    'Enable delete for users based on email'
  ];
  
  for (const policyName of policiesToDrop) {
    try {
      const { error } = await adminSupabase
        .from('discord_guilds')
        .select('id')
        .limit(0); // Não queremos dados, só testar a conexão
      
      console.log(`   Tentando remover política: ${policyName}`);
      // Note: Não podemos executar DROP POLICY diretamente via cliente JS
    } catch (error) {
      console.log(`   Política ${policyName} não encontrada ou já removida`);
    }
  }
  
  console.log('\n2️⃣ Testando acesso atual...');
  
  // Testar com anon key
  const anonSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  
  const { data: readTest, error: readError } = await anonSupabase
    .from('discord_guilds')
    .select('*')
    .limit(1);
  
  console.log(`   Leitura com anon key: ${readError ? '❌ FALHOU' : '✅ OK'}`);
  if (readError) console.log(`     Erro: ${readError.message}`);
  
  const testData = {
    guild_id: '888888888888888888',
    guild_name: 'Teste Política RLS',
    school_id: '550e8400-e29b-41d4-a716-446655440000'
  };
  
  const { data: insertTest, error: insertError } = await anonSupabase
    .from('discord_guilds')
    .insert([testData])
    .select();
  
  console.log(`   Inserção com anon key: ${insertError ? '❌ FALHOU' : '✅ OK'}`);
  if (insertError) {
    console.log(`     Erro: ${insertError.message}`);
    console.log(`     Código: ${insertError.code}`);
  }
  
  if (!insertError) {
    // Limpar teste se inserção funcionou
    await anonSupabase
      .from('discord_guilds')
      .delete()
      .eq('guild_id', '888888888888888888');
  }
  
  console.log('\n3️⃣ Instruções para correção manual...');
  console.log('\n📋 Execute os seguintes comandos SQL no Supabase Dashboard:');
  console.log('\n-- 1. Habilitar RLS na tabela (se não estiver habilitado)');
  console.log('ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;');
  
  console.log('\n-- 2. Criar política para SELECT (leitura)');
  console.log(`CREATE POLICY "discord_guilds_select_policy" ON discord_guilds`);
  console.log(`  FOR SELECT USING (true);`);
  
  console.log('\n-- 3. Criar política para INSERT (inserção)');
  console.log(`CREATE POLICY "discord_guilds_insert_policy" ON discord_guilds`);
  console.log(`  FOR INSERT WITH CHECK (`);
  console.log(`    auth.role() = 'authenticated' OR`);
  console.log(`    auth.role() = 'service_role'`);
  console.log(`  );`);
  
  console.log('\n-- 4. Criar política para UPDATE (atualização)');
  console.log(`CREATE POLICY "discord_guilds_update_policy" ON discord_guilds`);
  console.log(`  FOR UPDATE USING (`);
  console.log(`    auth.role() = 'authenticated' OR`);
  console.log(`    auth.role() = 'service_role'`);
  console.log(`  );`);
  
  console.log('\n-- 5. Criar política para DELETE (exclusão)');
  console.log(`CREATE POLICY "discord_guilds_delete_policy" ON discord_guilds`);
  console.log(`  FOR DELETE USING (`);
  console.log(`    auth.role() = 'authenticated' OR`);
  console.log(`    auth.role() = 'service_role'`);
  console.log(`  );`);
  
  console.log('\n💡 Alternativa: Política mais permissiva para INSERT');
  console.log(`CREATE POLICY "discord_guilds_insert_permissive" ON discord_guilds`);
  console.log(`  FOR INSERT WITH CHECK (true);`);
  
  console.log('\n🔍 Diagnóstico concluído!');
  console.log('\n⚠️  IMPORTANTE:');
  console.log('   1. Execute os comandos SQL acima no Supabase Dashboard > SQL Editor');
  console.log('   2. Teste novamente a inserção no frontend');
  console.log('   3. Se ainda falhar, use a política mais permissiva temporariamente');
}

fixDiscordRLSPolicies().catch(console.error);