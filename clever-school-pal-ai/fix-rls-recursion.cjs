require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(query, description) {
  try {
    console.log(`🔧 ${description}...`);
    const { data, error } = await supabase.from('_temp').select('*').limit(0);
    
    // Como não podemos executar DDL diretamente, vamos usar uma abordagem diferente
    // Vamos desativar RLS temporariamente através de uma função personalizada
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/disable_rls_temp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      console.log(`⚠️ Função disable_rls_temp não encontrada, continuando...`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ ${description}:`, error.message);
    return { success: false, error };
  }
}

async function fixRLSRecursion() {
  console.log('🔧 Corrigindo recursão infinita nas políticas RLS...');
  
  try {
    // Como não podemos executar DDL diretamente, vamos tentar uma abordagem alternativa
    // Vamos criar uma função SQL que desative temporariamente o RLS
    
    console.log('\n📋 Tentando criar função para desativar RLS temporariamente...');
    
    // Primeiro, vamos tentar criar a função através de uma requisição HTTP direta
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION disable_rls_temp()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Desativar RLS temporariamente
        ALTER TABLE contents DISABLE ROW LEVEL SECURITY;
        ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
        ALTER TABLE students DISABLE ROW LEVEL SECURITY;
        ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
        ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;
        ALTER TABLE discord_channels DISABLE ROW LEVEL SECURITY;
        ALTER TABLE discord_users DISABLE ROW LEVEL SECURITY;
        
        -- Remover políticas problemáticas
        DROP POLICY IF EXISTS "contents_policy" ON contents;
        DROP POLICY IF EXISTS "classes_policy" ON classes;
        DROP POLICY IF EXISTS "students_policy" ON students;
        DROP POLICY IF EXISTS "subjects_policy" ON subjects;
        DROP POLICY IF EXISTS "teacher_class_subjects_policy" ON teacher_class_subjects;
        
        -- Reativar RLS
        ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE students ENABLE ROW LEVEL SECURITY;
        ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
        ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
        ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
        ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
      END;
      $$;
    `;
    
    // Vamos tentar uma abordagem mais simples: apenas remover as políticas problemáticas
    console.log('\n🗑️ Tentando remover políticas RLS problemáticas...');
    
    const policies = [
      'contents_policy',
      'contents_select_policy', 
      'contents_insert_policy',
      'contents_update_policy',
      'contents_delete_policy',
      'classes_policy',
      'classes_select_policy',
      'classes_insert_policy', 
      'classes_update_policy',
      'classes_delete_policy',
      'students_policy',
      'students_select_policy',
      'students_insert_policy',
      'students_update_policy', 
      'students_delete_policy',
      'subjects_policy',
      'subjects_select_policy',
      'subjects_insert_policy',
      'subjects_update_policy',
      'subjects_delete_policy',
      'teacher_class_subjects_policy'
    ];
    
    // Como não conseguimos executar DDL, vamos tentar uma solução alternativa
    // Vamos verificar se conseguimos pelo menos fazer queries básicas
    
    console.log('\n🔍 Testando acesso básico às tabelas...');
    
    const tables = ['contents', 'classes', 'students', 'subjects', 'discord_channels', 'discord_users'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
          
        if (error) {
          console.error(`❌ Erro ao acessar ${table}:`, error.message);
          
          // Se o erro for de recursão infinita, isso confirma o problema
          if (error.message.includes('infinite recursion')) {
            console.log(`🔍 Confirmado: ${table} tem recursão infinita nas políticas RLS`);
          }
        } else {
          console.log(`✅ ${table}: Acesso OK`);
        }
      } catch (err) {
        console.error(`❌ Exceção ao acessar ${table}:`, err.message);
      }
    }
    
    console.log('\n💡 SOLUÇÃO RECOMENDADA:');
    console.log('Como não conseguimos executar DDL através do cliente Supabase,');
    console.log('você precisa executar o seguinte SQL diretamente no painel do Supabase:');
    console.log('');
    console.log('-- 1. Desativar RLS temporariamente');
    console.log('ALTER TABLE contents DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE classes DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE students DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- 2. Remover políticas problemáticas');
    console.log('DROP POLICY IF EXISTS "contents_policy" ON contents;');
    console.log('DROP POLICY IF EXISTS "classes_policy" ON classes;');
    console.log('DROP POLICY IF EXISTS "students_policy" ON students;');
    console.log('DROP POLICY IF EXISTS "subjects_policy" ON subjects;');
    console.log('DROP POLICY IF EXISTS "teacher_class_subjects_policy" ON teacher_class_subjects;');
    console.log('');
    console.log('-- 3. Reativar RLS');
    console.log('ALTER TABLE contents ENABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE classes ENABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE students ENABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('🌐 Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixRLSRecursion();