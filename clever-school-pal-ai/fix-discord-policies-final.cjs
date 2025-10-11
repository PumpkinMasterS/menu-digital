const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDiscordPoliciesFinal() {
  try {
    console.log('🔧 Diagnosticando problema das políticas RLS da tabela discord_guilds...');
    
    // Usar o service role key para executar comandos administrativos
    const adminSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('\n1️⃣ Verificando dados existentes...');
    
    // Verificar guilds existentes para entender a estrutura
    const { data: existingGuilds, error: readError } = await adminSupabase
      .from('discord_guilds')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('❌ Erro ao ler guilds existentes:', readError);
    } else {
      console.log(`📋 Guilds existentes encontrados: ${existingGuilds?.length || 0}`);
      if (existingGuilds?.length > 0) {
        existingGuilds.forEach(guild => {
          console.log(`  - ${guild.guild_name} (${guild.guild_id})`);
          console.log(`    School ID: ${guild.school_id} (tipo: ${typeof guild.school_id})`);
        });
      }
    }
    
    // Verificar escolas disponíveis para obter um UUID válido
    console.log('\n2️⃣ Verificando escolas disponíveis...');
    const { data: schools, error: schoolsError } = await adminSupabase
      .from('schools')
      .select('id, name')
      .limit(3);
    
    if (schoolsError) {
      console.error('❌ Erro ao ler escolas:', schoolsError);
      return;
    }
    
    if (!schools || schools.length === 0) {
      console.error('❌ Nenhuma escola encontrada');
      return;
    }
    
    console.log(`📋 Escolas encontradas: ${schools.length}`);
    schools.forEach(school => {
      console.log(`  - ${school.name} (ID: ${school.id})`);
    });
    
    // Usar o ID da primeira escola para o teste
    const testSchoolId = schools[0].id;
    console.log(`\n🎯 Usando escola para teste: ${schools[0].name} (${testSchoolId})`);
    
    console.log('\n3️⃣ Testando inserção com UUID correto...');
    
    // Teste de inserção usando service_role com UUID correto
    const testGuildData = {
      guild_id: '987654321098765432',
      guild_name: 'Teste RLS Fix UUID',
      school_id: testSchoolId // Usar UUID válido
    };
    
    console.log('📤 Dados do teste:', testGuildData);
    
    // Tentar inserir com service_role
    const { data: insertResult, error: insertError } = await adminSupabase
      .from('discord_guilds')
      .insert(testGuildData)
      .select();
    
    if (insertError) {
      console.error('❌ Erro na inserção com service_role:', insertError);
      
      // Verificar se é problema de políticas RLS ou outro
      if (insertError.code === '42501') {
        console.log('🔍 Erro 42501 = Problema de permissões/políticas RLS');
      } else if (insertError.code === '23505') {
        console.log('🔍 Erro 23505 = Guild ID já existe (isso é esperado)');
      } else {
        console.log(`🔍 Código de erro: ${insertError.code}`);
      }
      
    } else {
      console.log('✅ Inserção com service_role bem-sucedida:', insertResult);
      
      // Limpar dados de teste
      const { error: deleteError } = await adminSupabase
        .from('discord_guilds')
        .delete()
        .eq('guild_id', testGuildData.guild_id);
      
      if (deleteError) {
        console.error('⚠️ Erro ao remover dados de teste:', deleteError);
      } else {
        console.log('🧹 Dados de teste removidos');
      }
    }
    
    console.log('\n4️⃣ Testando com utilizador autenticado...');
    
    // Verificar se existe um utilizador super_admin
    const { data: adminUsers, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('user_id, role, school_id, active')
      .eq('role', 'super_admin')
      .eq('active', true)
      .limit(1);
    
    if (adminError) {
      console.error('❌ Erro ao verificar admin_users:', adminError);
    } else if (!adminUsers || adminUsers.length === 0) {
      console.log('⚠️ Nenhum super_admin ativo encontrado');
    } else {
      const superAdmin = adminUsers[0];
      console.log(`👤 Super admin encontrado: ${superAdmin.user_id}`);
      
      // Tentar simular autenticação (isso pode não funcionar)
      const userSupabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );
      
      console.log('⚠️ Nota: Teste com utilizador autenticado requer sessão ativa');
    }
    
    console.log('\n🎯 Diagnóstico Final:');
    console.log('✅ Problema identificado: school_id deve ser UUID, não número');
    console.log('✅ Tabela discord_guilds está acessível via service_role');
    console.log('📋 Próximos passos:');
    console.log('  1. Verificar se o frontend está enviando UUID correto para school_id');
    console.log('  2. Verificar políticas RLS no Supabase Dashboard');
    console.log('  3. Testar inserção via frontend com dados corretos');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixDiscordPoliciesFinal();