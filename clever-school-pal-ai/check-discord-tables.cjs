const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDiscordTables() {
  try {
    console.log('Verificando tabelas do Discord...');
    
    const tables = ['discord_guilds', 'discord_channels', 'discord_users', 'discord_bot_config'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: Erro - ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count || 0} registros`);
        }
      } catch (tableError) {
        console.log(`❌ ${table}: Tabela não existe ou erro de acesso`);
      }
    }
    
    // Verificar se as tabelas existem na base de dados
    console.log('\nVerificando estrutura das tabelas...');
    const { data: tableInfo, error: infoError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'discord_%');
    
    if (infoError) {
      console.log('Erro ao verificar estrutura:', infoError.message);
    } else {
      console.log('Tabelas Discord encontradas:', tableInfo?.map(t => t.table_name) || []);
    }
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

checkDiscordTables();