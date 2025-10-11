const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDiscordBotSetup() {
  console.log('🧪 Testando configuração do Discord Bot...');
  console.log('=' .repeat(50));

  // 1. Verificar variáveis de ambiente
  console.log('\n1️⃣ Verificando variáveis de ambiente:');
  
  const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  let envVarsOk = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Configurado`);
    } else {
      console.log(`   ❌ ${envVar}: NÃO ENCONTRADO`);
      envVarsOk = false;
    }
  }

  if (!envVarsOk) {
    console.log('\n❌ Algumas variáveis de ambiente estão em falta!');
    return false;
  }

  // 2. Testar conexão Supabase
  console.log('\n2️⃣ Testando conexão Supabase:');
  try {
    const { data, error } = await supabase.from('schools').select('count').limit(1);
    if (error) throw error;
    console.log('   ✅ Conexão Supabase: OK');
  } catch (error) {
    console.log(`   ❌ Conexão Supabase: FALHOU - ${error.message}`);
    return false;
  }

  // 3. Verificar tabelas Discord
  console.log('\n3️⃣ Verificando tabelas Discord:');
  const discordTables = [
    'discord_guilds',
    'discord_channels', 
    'discord_users',
    'discord_interactions',
    'discord_bot_config'
  ];

  for (const table of discordTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      if (error) throw error;
      console.log(`   ✅ Tabela ${table}: Existe`);
    } catch (error) {
      console.log(`   ❌ Tabela ${table}: ERRO - ${error.message}`);
    }
  }

  // 4. Verificar estrutura das tabelas principais
  console.log('\n4️⃣ Verificando estrutura das tabelas:');
  
  try {
    // Verificar schools
    const { data: schools } = await supabase.from('schools').select('id, name').limit(1);
    console.log(`   ✅ Tabela schools: ${schools?.length || 0} registros`);
    
    // Verificar classes
    const { data: classes } = await supabase.from('classes').select('id, name').limit(1);
    console.log(`   ✅ Tabela classes: ${classes?.length || 0} registros`);
    
    // Verificar students
    const { data: students } = await supabase.from('students').select('id, name').limit(1);
    console.log(`   ✅ Tabela students: ${students?.length || 0} registros`);
    
    // Verificar subjects
    const { data: subjects } = await supabase.from('subjects').select('id, name').limit(1);
    console.log(`   ✅ Tabela subjects: ${subjects?.length || 0} registros`);
    
  } catch (error) {
    console.log(`   ⚠️ Erro ao verificar estrutura: ${error.message}`);
  }

  // 5. Testar token Discord (sem conectar)
  console.log('\n5️⃣ Verificando token Discord:');
  const token = process.env.DISCORD_BOT_TOKEN;
  if (token && token.length > 50 && token.includes('.')) {
    console.log('   ✅ Token Discord: Formato válido');
    console.log(`   📝 Prefixo: ${token.substring(0, 20)}...`);
  } else {
    console.log('   ❌ Token Discord: Formato inválido');
    return false;
  }

  // 6. Verificar dependências Node.js
  console.log('\n6️⃣ Verificando dependências:');
  const requiredPackages = [
    'discord.js',
    '@supabase/supabase-js',
    'dotenv'
  ];

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      console.log(`   ✅ ${pkg}: Instalado`);
    } catch (error) {
      console.log(`   ❌ ${pkg}: NÃO INSTALADO`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Teste de configuração concluído!');
  console.log('\n🚀 Para iniciar o bot, execute:');
  console.log('   node setup-discord-bot.js');
  console.log('\n📚 Comandos disponíveis no Discord:');
  console.log('   !ajuda - Mostrar ajuda');
  console.log('   !contexto - Ver contexto educativo');
  console.log('   !escola - Informações da escola');
  console.log('   !turma - Informações da turma');
  console.log('   !materia - Informações da matéria');
  
  return true;
}

// Executar teste
testDiscordBotSetup().catch(error => {
  console.error('❌ Erro durante o teste:', error);
  process.exit(1);
});