require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

// Cliente com service role (bypass RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente normal (com RLS)
const supabaseClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey);

async function testDatabaseQueries() {
  console.log('🔍 Testando consultas que estão a falhar...');
  
  // Lista de consultas que estão a falhar
  const queries = [
    {
      name: 'Contents',
      query: () => supabaseAdmin.from('contents').select('id,title,status,created_at').order('created_at', { ascending: false })
    },
    {
      name: 'Classes',
      query: () => supabaseAdmin.from('classes').select('id,name,school_id,grade').order('created_at', { ascending: false })
    },
    {
      name: 'Students (recent)',
      query: () => supabaseAdmin.from('students').select('id,name,created_at').order('created_at', { ascending: false }).limit(5)
    },
    {
      name: 'Students (bot active)',
      query: () => supabaseAdmin.from('students').select('id,bot_active,school_id,class_id,created_at').order('created_at', { ascending: false })
    },
    {
      name: 'Subjects',
      query: () => supabaseAdmin.from('subjects').select('id,name,school_id').order('created_at', { ascending: false })
    },
    {
      name: 'Discord Channels',
      query: () => supabaseAdmin.from('discord_channels').select('*,classes!inner(name)').order('created_at', { ascending: false })
    },
    {
      name: 'Discord Users',
      query: () => supabaseAdmin.from('discord_users').select('*,students!inner(name)').order('created_at', { ascending: false })
    },
    {
      name: 'Classes (for select)',
      query: () => supabaseAdmin.from('classes').select('id,name,school_id').order('name', { ascending: true })
    },
    {
      name: 'Students (for select)',
      query: () => supabaseAdmin.from('students').select('id,name,class_id').order('name', { ascending: true })
    }
  ];
  
  console.log('\n📊 Testando com Service Role (bypass RLS)...');
  
  for (const { name, query } of queries) {
    try {
      console.log(`\n🔍 Testando: ${name}`);
      const { data, error, count } = await query();
      
      if (error) {
        console.error(`❌ ${name} - Erro:`, error.message);
        console.error('   Detalhes:', error);
      } else {
        console.log(`✅ ${name} - Sucesso: ${data?.length || 0} registos`);
        if (data?.length > 0) {
          console.log('   Primeiro registo:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
        }
      }
    } catch (err) {
      console.error(`❌ ${name} - Exceção:`, err.message);
    }
  }
  
  // Testar estrutura das tabelas
  console.log('\n🏗️ Verificando estrutura das tabelas...');
  
  const tables = ['contents', 'classes', 'students', 'subjects', 'discord_channels', 'discord_users'];
  
  for (const table of tables) {
    try {
      console.log(`\n📋 Estrutura da tabela: ${table}`);
      const { data, error } = await supabaseAdmin.rpc('get_table_structure', { table_name: table });
      
      if (error) {
        console.error(`❌ Erro ao obter estrutura de ${table}:`, error.message);
        
        // Tentar consulta simples para verificar se a tabela existe
        const { data: simpleData, error: simpleError } = await supabaseAdmin.from(table).select('*').limit(1);
        if (simpleError) {
          console.error(`❌ Tabela ${table} não existe ou não é acessível:`, simpleError.message);
        } else {
          console.log(`✅ Tabela ${table} existe e é acessível`);
        }
      } else {
        console.log(`✅ Estrutura de ${table} obtida com sucesso`);
      }
    } catch (err) {
      console.error(`❌ Exceção ao verificar ${table}:`, err.message);
    }
  }
  
  // Verificar políticas RLS
  console.log('\n🛡️ Verificando políticas RLS...');
  
  try {
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .in('tablename', tables);
      
    if (policiesError) {
      console.error('❌ Erro ao obter políticas RLS:', policiesError.message);
    } else {
      console.log(`✅ Encontradas ${policies?.length || 0} políticas RLS`);
      
      for (const table of tables) {
        const tablePolicies = policies?.filter(p => p.tablename === table) || [];
        console.log(`\n📋 ${table}: ${tablePolicies.length} políticas`);
        
        tablePolicies.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd}) - ${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Exceção ao verificar políticas RLS:', err.message);
  }
  
  // Testar com utilizador autenticado
  console.log('\n👤 Testando com utilizador autenticado...');
  
  try {
    // Fazer login
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: 'whiswher@gmail.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
    } else {
      console.log('✅ Login bem-sucedido');
      
      // Testar algumas consultas com RLS
      const authQueries = [
        {
          name: 'Contents (com RLS)',
          query: () => supabaseClient.from('contents').select('id,title,status,created_at').limit(5)
        },
        {
          name: 'Classes (com RLS)',
          query: () => supabaseClient.from('classes').select('id,name,school_id,grade').limit(5)
        },
        {
          name: 'Students (com RLS)',
          query: () => supabaseClient.from('students').select('id,name,created_at').limit(5)
        }
      ];
      
      for (const { name, query } of authQueries) {
        try {
          const { data, error } = await query();
          
          if (error) {
            console.error(`❌ ${name} - Erro:`, error.message);
          } else {
            console.log(`✅ ${name} - Sucesso: ${data?.length || 0} registos`);
          }
        } catch (err) {
          console.error(`❌ ${name} - Exceção:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Exceção no teste com utilizador:', err.message);
  }
}

testDatabaseQueries();