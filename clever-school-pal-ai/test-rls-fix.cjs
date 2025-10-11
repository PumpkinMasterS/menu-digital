const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Cliente normal (com RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Cliente service role (bypass RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSFix() {
  console.log('🔍 TESTE DE VERIFICAÇÃO DAS POLÍTICAS RLS');
  console.log('=' .repeat(60));
  
  try {
    // 1. Login como whiswher@gmail.com
    console.log('\n🔐 1. FAZENDO LOGIN COMO whiswher@gmail.com');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'whiswher@gmail.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log('👤 Usuário:', authData.user.email);
    
    // 2. Testar consultas nas tabelas principais
    console.log('\n📊 2. TESTANDO CONSULTAS COM RLS ATIVO');
    console.log('-'.repeat(50));
    
    const tables = [
      {
        name: 'contents',
        query: () => supabase.from('contents').select('id, title, subject_id, school_id').limit(5)
      },
      {
        name: 'classes', 
        query: () => supabase.from('classes').select('id, name, school_id').limit(5)
      },
      {
        name: 'students',
        query: () => supabase.from('students').select('id, name, school_id').limit(5)
      },
      {
        name: 'subjects',
        query: () => supabase.from('subjects').select('id, name, school_id').limit(5)
      },
      {
        name: 'discord_channels',
        query: () => supabase.from('discord_channels').select('id, channel_id, channel_name, channel_type').limit(5)
      },
      {
        name: 'discord_users',
        query: () => supabase.from('discord_users').select('id, user_id, display_name').limit(5)
      },
      {
        name: 'discord_guilds',
        query: () => supabase.from('discord_guilds').select('id, guild_id, guild_name').limit(5)
      }
    ];
    
    for (const { name, query } of tables) {
      try {
        console.log(`\n🔍 Testando: ${name}`);
        const { data, error } = await query();
        
        if (error) {
          console.error(`❌ ${name} - Erro:`, error.message);
          if (error.message.includes('infinite recursion')) {
            console.error('   🔄 RECURSÃO INFINITA DETECTADA - RLS ainda problemático');
          }
        } else {
          console.log(`✅ ${name} - Sucesso: ${data?.length || 0} registos`);
        }
      } catch (err) {
        console.error(`❌ ${name} - Exceção:`, err.message);
      }
    }
    
    // 3. Testar inserção na tabela contents
    console.log('\n📝 3. TESTANDO INSERÇÃO NA TABELA CONTENTS');
    console.log('-'.repeat(45));
    
    try {
      // Primeiro, obter um subject_id válido
      const { data: subjects, error: subjectsError } = await supabaseAdmin
        .from('subjects')
        .select('id, school_id')
        .limit(1);
      
      if (subjectsError || !subjects || subjects.length === 0) {
        console.log('⚠️ Não foi possível obter subject_id para teste de inserção');
      } else {
        const testContent = {
          title: 'Teste RLS - ' + new Date().toISOString(),
          content: 'Conteúdo de teste para verificar RLS',
          subject_id: subjects[0].id,
          school_id: subjects[0].school_id,
          content_type: 'lesson'
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('contents')
          .insert(testContent)
          .select();
        
        if (insertError) {
          console.error('❌ Erro na inserção:', insertError.message);
        } else {
          console.log('✅ Inserção realizada com sucesso');
          console.log('📄 Conteúdo criado:', insertData[0]?.title);
          
          // Limpar o teste
          await supabaseAdmin
            .from('contents')
            .delete()
            .eq('id', insertData[0].id);
          console.log('🧹 Conteúdo de teste removido');
        }
      }
    } catch (err) {
      console.error('❌ Erro no teste de inserção:', err.message);
    }
    
    // 4. Verificar políticas RLS ativas (usando service role)
    console.log('\n🛡️ 4. VERIFICANDO POLÍTICAS RLS ATIVAS');
    console.log('-'.repeat(40));
    
    const tablesToCheck = ['contents', 'classes', 'students', 'subjects', 'discord_channels', 'discord_users', 'discord_guilds'];
    
    for (const table of tablesToCheck) {
      try {
        console.log(`\n📋 Políticas para: ${table}`);
        
        // Tentar consulta direta ao catálogo do PostgreSQL
        const { data: policies, error: policiesError } = await supabaseAdmin
          .rpc('exec_sql', {
            sql_query: `
              SELECT policyname, permissive, roles, cmd, qual 
              FROM pg_policies 
              WHERE tablename = '${table}' 
              ORDER BY policyname;
            `
          });
        
        if (policiesError) {
          console.log(`⚠️ Não foi possível verificar políticas: ${policiesError.message}`);
        } else {
          console.log(`✅ Políticas encontradas: ${policies?.length || 0}`);
          if (policies && policies.length > 0) {
            policies.forEach(policy => {
              console.log(`   - ${policy.policyname} (${policy.cmd})`);
            });
          }
        }
      } catch (err) {
        console.log(`⚠️ Erro ao verificar políticas de ${table}: ${err.message}`);
      }
    }
    
    // 5. Logout
    await supabase.auth.signOut();
    console.log('\n👋 Logout realizado');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTE DE VERIFICAÇÃO RLS CONCLUÍDO');
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Se ainda há erros de recursão infinita, execute fix-rls-policies.sql no Supabase Dashboard');
  console.log('2. Verifique se as políticas foram aplicadas corretamente');
  console.log('3. Teste novamente após aplicar as correções');
}

testRLSFix();