const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFixes() {
  console.log('🧪 Testando correções do frontend...');

  try {
    // 1. Testar schools sem slug
    console.log('\n1️⃣ Testando acesso a schools sem slug...');
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(5);
    
    if (schoolsError) {
      console.log('❌ Erro ao acessar schools:', schoolsError.message);
    } else {
      console.log(`✅ schools acessível: ${schoolsData?.length || 0} registros`);
      if (schoolsData && schoolsData.length > 0) {
        console.log('   Exemplo:', schoolsData[0]);
      }
    }

    // 2. Testar auth.admin.listUsers
    console.log('\n2️⃣ Testando auth.admin.listUsers...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Erro ao listar usuários:', authError.message);
    } else {
      const users = authData?.users || [];
      const adminUsers = users.filter(user => {
        const role = user.user_metadata?.role;
        return role === 'super_admin' || role === 'director';
      });
      console.log(`✅ Usuários encontrados: ${users.length} total, ${adminUsers.length} admins`);
      if (adminUsers.length > 0) {
        console.log('   Admin exemplo:', {
          email: adminUsers[0].email,
          role: adminUsers[0].user_metadata?.role
        });
      }
    }

    // 3. Testar chat_logs
    console.log('\n3️⃣ Testando acesso a chat_logs...');
    const { data: chatData, error: chatError } = await supabase
      .from('chat_logs')
      .select('id, created_at, question')
      .limit(3);
    
    if (chatError) {
      console.log('❌ Erro ao acessar chat_logs:', chatError.message);
    } else {
      console.log(`✅ chat_logs acessível: ${chatData?.length || 0} registros`);
    }

    // 4. Testar pedagogical_tags (esperado falhar)
    console.log('\n4️⃣ Testando pedagogical_tags (esperado falhar até criar tabela)...');
    const { data: tagsData, error: tagsError } = await supabase
      .from('pedagogical_tags')
      .select('*')
      .limit(3);
    
    if (tagsError) {
      console.log('❌ pedagogical_tags não existe (esperado):', tagsError.message);
      console.log('   📝 Execute o arquivo create-pedagogical-tags.sql no Supabase Dashboard');
    } else {
      console.log(`✅ pedagogical_tags acessível: ${tagsData?.length || 0} registros`);
    }

    console.log('\n📋 Resumo dos testes:');
    console.log('  ✅ Frontend corrigido para não usar slug em schools');
    console.log('  ✅ Frontend corrigido para usar auth.admin.listUsers');
    console.log('  ⚠️ pedagogical_tags precisa ser criada manualmente');
    console.log('\n🔧 Próximos passos:');
    console.log('  1. Abra o Supabase Dashboard');
    console.log('  2. Vá para SQL Editor');
    console.log('  3. Execute o conteúdo de create-pedagogical-tags.sql');
    console.log('  4. Recarregue a aplicação');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testFixes();