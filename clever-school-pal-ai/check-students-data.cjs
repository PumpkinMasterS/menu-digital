const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function checkStudentsData() {
  console.log('🔍 Verificando dados dos alunos...');
  
  try {
    // 1. Verificar quantos alunos existem com service role
    console.log('\n1. Verificando total de alunos (service role):');
    const { data: studentsService, error: errorService, count } = await supabaseService
      .from('students')
      .select('*', { count: 'exact' });
    
    if (errorService) {
      console.error('❌ Erro ao buscar alunos (service):', errorService);
    } else {
      console.log(`✅ Total de alunos encontrados: ${count}`);
      if (studentsService && studentsService.length > 0) {
        console.log('📋 Primeiros 3 alunos:');
        studentsService.slice(0, 3).forEach((student, index) => {
          console.log(`   ${index + 1}. ID: ${student.id}, Nome: ${student.name}, Email: ${student.email}`);
        });
      }
    }
    
    // 2. Verificar com anonymous key (como a aplicação faz)
    console.log('\n2. Verificando alunos com anonymous key:');
    const { data: studentsAnon, error: errorAnon } = await supabaseAnon
      .from('students')
      .select('*');
    
    if (errorAnon) {
      console.error('❌ Erro ao buscar alunos (anon):', errorAnon);
    } else {
      console.log(`✅ Alunos visíveis para anonymous: ${studentsAnon?.length || 0}`);
    }
    
    // 3. Verificar estrutura da tabela
    console.log('\n3. Verificando estrutura da tabela students:');
    const { data: tableInfo, error: tableError } = await supabaseService
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'students')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Erro ao verificar estrutura:', tableError);
    } else {
      console.log('📊 Colunas da tabela students:');
      tableInfo?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // 4. Verificar políticas RLS
    console.log('\n4. Verificando políticas RLS na tabela students:');
    const { data: policies, error: policiesError } = await supabaseService
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'students');
    
    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
    } else {
      console.log(`📋 Políticas RLS encontradas: ${policies?.length || 0}`);
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (roles: ${policy.roles})`);
      });
    }
    
    // 5. Testar endpoint da API diretamente
    console.log('\n5. Testando endpoint da API:');
    try {
      const response = await fetch('http://localhost:8081/api/students', {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 Status da API: ${response.status}`);
      
      if (response.ok) {
        const apiData = await response.json();
        console.log(`✅ Alunos retornados pela API: ${apiData?.length || 0}`);
      } else {
        const errorText = await response.text();
        console.error('❌ Erro da API:', errorText);
      }
    } catch (apiError) {
      console.error('❌ Erro ao testar API:', apiError.message);
    }
    
    // 6. Criar um aluno de teste se não existir nenhum
    if (count === 0) {
      console.log('\n6. Criando aluno de teste...');
      const { data: newStudent, error: createError } = await supabaseService
        .from('students')
        .insert({
          name: 'João Silva',
          email: 'joao.silva@teste.com',
          phone_number: '11999999999',
          whatsapp_number: '11999999999',
          school_id: 1 // Assumindo que existe uma escola com ID 1
        })
        .select();
      
      if (createError) {
        console.error('❌ Erro ao criar aluno de teste:', createError);
      } else {
        console.log('✅ Aluno de teste criado:', newStudent);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkStudentsData();