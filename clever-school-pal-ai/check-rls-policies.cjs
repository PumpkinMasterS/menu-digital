const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Definida' : '❌ Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    console.log('🔍 Verificando políticas RLS da tabela classes...');
    
    // Query para verificar políticas RLS da tabela classes
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'classes');
    
    if (error) {
      console.error('❌ Erro ao consultar políticas:', error);
      
      // Tentar query alternativa
      console.log('🔄 Tentando query alternativa...');
      const { data: altData, error: altError } = await supabase.rpc('get_table_policies', {
        table_name: 'classes'
      });
      
      if (altError) {
        console.error('❌ Erro na query alternativa:', altError);
        return;
      }
      
      console.log('📋 Políticas encontradas (alternativa):', altData);
      return;
    }
    
    console.log('📋 Políticas RLS da tabela classes:');
    if (data && data.length > 0) {
      data.forEach((policy, index) => {
        console.log(`\n${index + 1}. ${policy.policyname}`);
        console.log(`   Comando: ${policy.cmd}`);
        console.log(`   Expressão USING: ${policy.qual}`);
        console.log(`   Expressão WITH CHECK: ${policy.with_check}`);
      });
    } else {
      console.log('❌ Nenhuma política encontrada para a tabela classes');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

checkRLSPolicies();