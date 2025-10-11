const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase - IMPORTANTE: verificar se as variáveis estão corretas
const SUPABASE_URL = 'https://gdplmkxogquhqrsoxrdt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcGxta3hvZ3F1aHFyc294cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NzMyMjEsImV4cCI6MjA1NDQ0OTIyMX0.Gb0pZEi-QAn3BkqBKp6rk4fqUbXKIFQcwJn9SzMM-1w';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseConnectivity() {
  console.log('🔍 Testando conectividade do Supabase...\n');
  
  try {
    // Teste 1: Conectividade básica
    console.log('1. Teste de conectividade básica:');
    const { data: authData, error: authError } = await client.auth.getSession();
    if (authError) {
      console.log('❌ Erro de autenticação:', authError.message);
    } else {
      console.log('✅ Conectividade OK');
    }
  } catch (error) {
    console.log('❌ ERRO DE CONECTIVIDADE:', error.message);
    return; // Para aqui se não conseguir conectar
  }

  // Teste 2: Verificar permissões básicas
  try {
    console.log('\n2. Teste de permissões básicas:');
    const { data, error } = await client.rpc('version');
    if (error) {
      console.log('❌ Erro de permissões:', error.message);
    } else {
      console.log('✅ Permissões básicas OK');
    }
  } catch (error) {
    console.log('⚠️  Erro ao testar permissões:', error.message);
  }

  // Teste 3: Verificar tabelas existem
  console.log('\n3. Verificando tabelas:');
  const tables = ['schools', 'classes', 'students'];
  
  for (const table of tables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: ${data?.length || 0} registros`);
      }
    } catch (error) {
      console.log(`❌ Erro ao acessar ${table}:`, error.message);
    }
  }

  // Teste 4: Query simples de students
  console.log('\n4. Teste de query simples em students:');
  try {
    const { data, error } = await client
      .from('students')
      .select('id, name')
      .limit(5);
    
    if (error) {
      console.log('❌ Erro na query simples:', error.message);
      console.log('❌ Detalhes:', error);
    } else {
      console.log(`✅ Query simples OK: ${data?.length || 0} registros`);
      if (data && data.length > 0) {
        console.log('Dados encontrados:', data.map(s => `${s.id}: ${s.name}`));
      }
    }
  } catch (error) {
    console.log('❌ Erro na query simples:', error.message);
  }

  // Teste 5: Query completa igual ao Students.tsx
  console.log('\n5. Teste da query completa do Students.tsx:');
  try {
    const { data, error } = await client
      .from('students')
      .select(`
        id,
        name,
        whatsapp_number,
        email,
        active,
        bot_active,
        class_id,
        school_id,
        classes!students_class_id_fkey(id, name),
        schools!students_school_id_fkey(id, name)
      `)
      .order('name');
    
    if (error) {
      console.log('❌ Erro na query completa:', error.message);
      console.log('❌ Código:', error.code);
      console.log('❌ Detalhes:', error.details);
    } else {
      console.log(`✅ Query completa OK: ${data?.length || 0} registros`);
      if (data && data.length > 0) {
        console.log('Primeiro registro:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (error) {
    console.log('❌ Erro na query completa:', error.message);
  }

  // Teste 6: Dados de escolas e turmas
  console.log('\n6. Verificando dados de escolas e turmas:');  
  try {
    const [schoolsResult, classesResult] = await Promise.all([
      client.from('schools').select('id, name').order('name'),
      client.from('classes').select('id, name, school_id').order('name')
    ]);

    console.log(`Escolas: ${schoolsResult.data?.length || 0} registros`);
    if (schoolsResult.data && schoolsResult.data.length > 0) {
      schoolsResult.data.forEach(school => 
        console.log(`  - ${school.id}: ${school.name}`)
      );
    }

    console.log(`Turmas: ${classesResult.data?.length || 0} registros`);
    if (classesResult.data && classesResult.data.length > 0) {
      classesResult.data.forEach(cls => 
        console.log(`  - ${cls.id}: ${cls.name} (escola: ${cls.school_id})`)
      );
    }
  } catch (error) {
    console.log('❌ Erro ao buscar escolas/turmas:', error.message);
  }
}

// Executar teste
testDatabaseConnectivity()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.log('\n❌ ERRO FATAL:', error.message);
    process.exit(1);
  });