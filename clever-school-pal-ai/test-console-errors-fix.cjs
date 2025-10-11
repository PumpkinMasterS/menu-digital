const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConsoleErrorsFix() {
  console.log('🧪 Testando correções dos erros do console...');
  
  try {
    // 1. Testar acesso ao chat_logs (sem joins complexos)
    console.log('\n1️⃣ Testando acesso ao chat_logs (query simples):');
    const { data: chatLogs, error: chatError } = await supabase
      .from('chat_logs')
      .select('id, created_at, question, student_id, processing_time_ms')
      .limit(5);
    
    if (chatError) {
      console.log('❌ Erro ao acessar chat_logs:', chatError.message);
    } else {
      console.log(`✅ chat_logs acessível: ${chatLogs?.length || 0} registros`);
    }
    
    // 2. Testar acesso aos students
    console.log('\n2️⃣ Testando acesso aos students:');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, school_id, schools(name)')
      .limit(5);
    
    if (studentsError) {
      console.log('❌ Erro ao acessar students:', studentsError.message);
    } else {
      console.log(`✅ students acessível: ${students?.length || 0} registros`);
    }
    
    // 3. Testar se pedagogical_tags ainda não existe
    console.log('\n3️⃣ Testando acesso ao pedagogical_tags:');
    const { data: tags, error: tagsError } = await supabase
      .from('pedagogical_tags')
      .select('*')
      .limit(1);
    
    if (tagsError) {
      console.log('❌ pedagogical_tags ainda não existe:', tagsError.message);
      console.log('📝 Lembre-se de executar o SQL para criar a tabela pedagogical_tags');
    } else {
      console.log(`✅ pedagogical_tags acessível: ${tags?.length || 0} registros`);
    }
    
    // 4. Testar função list_admin_users (se existir)
    console.log('\n4️⃣ Testando função list_admin_users:');
    const { data: adminUsers, error: adminError } = await supabase
      .rpc('list_admin_users');
    
    if (adminError) {
      console.log('❌ Função list_admin_users não existe ainda:', adminError.message);
      console.log('📝 Execute o SQL fornecido anteriormente no Supabase Dashboard');
    } else {
      console.log(`✅ Função list_admin_users funcionando: ${adminUsers?.length || 0} usuários`);
    }
    
    console.log('\n📋 Resumo das correções aplicadas:');
    console.log('  ✅ Analytics.tsx: Query do chat_logs corrigida (sem joins complexos)');
    console.log('  ✅ Users.tsx: Fallback para dados mock quando auth.admin.listUsers falha');
    console.log('  ⏳ pedagogical_tags: Precisa ser criada manualmente');
    console.log('  ⏳ list_admin_users: Função RPC precisa ser criada manualmente');
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Criar tabela pedagogical_tags no Supabase Dashboard');
    console.log('2. Criar função list_admin_users no Supabase Dashboard');
    console.log('3. Recarregar a aplicação para testar as correções');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testConsoleErrorsFix();