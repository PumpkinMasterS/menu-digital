const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPermissions() {
  console.log('🔐 Verificando e corrigindo permissões RLS...');

  try {
    // 1. Testar acesso às tabelas principais
    console.log('\n1️⃣ Testando acesso às tabelas...');
    
    // Testar schools
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(1);
    
    if (schoolsError) {
      console.log('❌ Erro ao acessar schools:', schoolsError.message);
    } else {
      console.log('✅ Schools acessível');
    }

    // Testar chat_logs
    const { data: chatData, error: chatError } = await supabase
      .from('chat_logs')
      .select('id, created_at')
      .limit(1);
    
    if (chatError) {
      console.log('❌ Erro ao acessar chat_logs:', chatError.message);
      console.log('💡 Possível problema: RLS muito restritivo ou tabela não existe');
    } else {
      console.log('✅ Chat_logs acessível');
    }

    // Testar pedagogical_tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('pedagogical_tags')
      .select('id, name')
      .limit(1);
    
    if (tagsError) {
      console.log('❌ Erro ao acessar pedagogical_tags:', tagsError.message);
    } else {
      console.log('✅ Pedagogical_tags acessível');
    }

    // 2. Testar auth.admin.listUsers
    console.log('\n2️⃣ Testando auth.admin.listUsers...');
    try {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('❌ Erro auth.admin.listUsers:', usersError.message);
        console.log('💡 Possível causa: Service Role Key incorreta ou sem permissões de admin');
      } else {
        console.log(`✅ Auth admin funcional - ${usersData.users?.length || 0} usuários encontrados`);
      }
    } catch (authError) {
      console.log('❌ Erro auth.admin.listUsers:', authError.message);
    }

    // 3. Verificar configurações do projeto
    console.log('\n3️⃣ Verificando configurações...');
    console.log('🔑 Supabase URL:', supabaseUrl);
    console.log('🔑 Service Key configurada:', supabaseServiceKey ? 'Sim' : 'Não');
    
    // 4. Sugestões de correção
    console.log('\n🔧 INSTRUÇÕES PARA CORRIGIR OS PROBLEMAS:');
    console.log('\n' + '='.repeat(60));
    
    console.log('\n📋 1. CRIAR TABELA PEDAGOGICAL_TAGS:');
    console.log('   - Abra o Supabase Dashboard');
    console.log('   - Vá para SQL Editor');
    console.log('   - Execute o SQL fornecido anteriormente');
    
    console.log('\n📋 2. CORRIGIR RLS PARA CHAT_LOGS:');
    console.log('   Execute este SQL no Supabase Dashboard:');
    console.log(`
-- Verificar se a tabela chat_logs existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'chat_logs';

-- Se existir, ajustar RLS
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Criar política mais permissiva para desenvolvimento
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.chat_logs;
CREATE POLICY "Allow read access for authenticated users" ON public.chat_logs
  FOR SELECT USING (true); -- Temporariamente permissivo

-- Ou desabilitar RLS temporariamente para desenvolvimento
-- ALTER TABLE public.chat_logs DISABLE ROW LEVEL SECURITY;`);
    
    console.log('\n📋 3. VERIFICAR SERVICE ROLE KEY:');
    console.log('   - No Supabase Dashboard, vá para Settings > API');
    console.log('   - Copie a "service_role" key (não a "anon" key)');
    console.log('   - Atualize SUPABASE_SERVICE_ROLE_KEY no .env');
    
    console.log('\n📋 4. ALTERNATIVA PARA USERS (sem auth.admin):');
    console.log('   - Criar uma função RPC personalizada');
    console.log('   - Ou usar uma tabela profiles separada');
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixRLSPermissions();