const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugDiscordRLS() {
  console.log('🔍 Diagnosticando políticas RLS da tabela discord_guilds...');
  
  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Configuração:');
  console.log(`   URL: ${supabaseUrl ? 'Definida' : 'AUSENTE'}`);
  console.log(`   Anon Key: ${supabaseAnonKey ? 'Definida' : 'AUSENTE'}`);
  console.log(`   Service Key: ${supabaseServiceKey ? 'Definida' : 'AUSENTE'}`);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variáveis de ambiente ausentes!');
    return;
  }
  
  // Cliente normal (anon key)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Cliente admin (service role)
  const adminSupabase = supabaseServiceKey ? 
    createClient(supabaseUrl, supabaseServiceKey) : null;
  
  console.log('\n1️⃣ Testando leitura com anon key...');
  const { data: readData, error: readError } = await supabase
    .from('discord_guilds')
    .select('*')
    .limit(1);
  
  if (readError) {
    console.error('❌ Erro na leitura:', readError);
  } else {
    console.log(`✅ Leitura OK: ${readData.length} registros`);
  }
  
  console.log('\n2️⃣ Testando inserção com anon key...');
  const testData = {
    guild_id: '999999999999999999',
    guild_name: 'Teste RLS Debug',
    school_id: '550e8400-e29b-41d4-a716-446655440000'
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('discord_guilds')
    .insert([testData])
    .select();
  
  if (insertError) {
    console.error('❌ Erro na inserção com anon key:', insertError);
    console.log('   Código:', insertError.code);
    console.log('   Mensagem:', insertError.message);
    console.log('   Detalhes:', insertError.details);
    console.log('   Hint:', insertError.hint);
  } else {
    console.log('✅ Inserção com anon key OK:', insertData);
    
    // Limpar teste
    await supabase
      .from('discord_guilds')
      .delete()
      .eq('guild_id', '999999999999999999');
  }
  
  if (adminSupabase) {
    console.log('\n3️⃣ Testando inserção com service role...');
    const { data: adminInsertData, error: adminInsertError } = await adminSupabase
      .from('discord_guilds')
      .insert([testData])
      .select();
    
    if (adminInsertError) {
      console.error('❌ Erro na inserção com service role:', adminInsertError);
    } else {
      console.log('✅ Inserção com service role OK:', adminInsertData);
      
      // Limpar teste
      await adminSupabase
        .from('discord_guilds')
        .delete()
        .eq('guild_id', '999999999999999999');
    }
    
    console.log('\n4️⃣ Verificando políticas RLS...');
    const { data: policies, error: policiesError } = await adminSupabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'discord_guilds');
    
    if (policiesError) {
      console.error('❌ Erro ao buscar políticas:', policiesError);
    } else {
      console.log(`📋 Políticas encontradas: ${policies.length}`);
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd}) - ${policy.qual}`);
      });
    }
  }
  
  console.log('\n🔍 Diagnóstico concluído!');
}

debugDiscordRLS().catch(console.error);