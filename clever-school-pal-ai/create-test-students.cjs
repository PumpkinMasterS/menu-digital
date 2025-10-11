const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function createTestStudents() {
  console.log('🏫 Criando alunos de teste...');
  
  try {
    // 1. Primeiro, verificar se existem escolas
    console.log('\n1. Verificando escolas disponíveis:');
    const { data: schools, error: schoolsError } = await supabaseService
      .from('schools')
      .select('id, name')
      .limit(5);
    
    if (schoolsError) {
      console.error('❌ Erro ao buscar escolas:', schoolsError);
      return;
    }
    
    if (!schools || schools.length === 0) {
      console.log('📝 Nenhuma escola encontrada. Criando escola de teste...');
      const { data: newSchool, error: createSchoolError } = await supabaseService
        .from('schools')
        .insert({
          name: 'Escola Teste',
          address: 'Rua Teste, 123',
          phone: '11999999999'
        })
        .select()
        .single();
      
      if (createSchoolError) {
        console.error('❌ Erro ao criar escola:', createSchoolError);
        return;
      }
      
      console.log('✅ Escola criada:', newSchool);
      schools.push(newSchool);
    }
    
    console.log(`✅ Escolas disponíveis: ${schools.length}`);
    schools.forEach(school => {
      console.log(`   - ID: ${school.id}, Nome: ${school.name}`);
    });
    
    // 2. Usar a primeira escola disponível
    const schoolId = schools[0].id;
    
    // 3. Verificar se existem turmas
    console.log('\n2. Verificando turmas disponíveis:');
    const { data: classes, error: classesError } = await supabaseService
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId)
      .limit(3);
    
    if (classesError) {
      console.error('❌ Erro ao buscar turmas:', classesError);
    } else {
      console.log(`✅ Turmas encontradas: ${classes?.length || 0}`);
    }
    
    // 4. Criar turma se não existir
    let classId = null;
    if (!classes || classes.length === 0) {
      console.log('📝 Criando turma de teste...');
      const { data: newClass, error: createClassError } = await supabaseService
        .from('classes')
        .insert({
          name: '1º Ano A',
          school_id: schoolId,
          grade: '1º Ano'
        })
        .select()
        .single();
      
      if (createClassError) {
        console.error('❌ Erro ao criar turma:', createClassError);
      } else {
        console.log('✅ Turma criada:', newClass);
        classId = newClass.id;
      }
    } else {
      classId = classes[0].id;
    }
    
    // 5. Criar alunos de teste
    console.log('\n3. Criando alunos de teste...');
    
    const testStudents = [
      {
        name: 'João Silva',
        email: 'joao.silva@teste.com',
        phone_number: '11999999999',
        whatsapp_number: '11999999999',
        school_id: schoolId,
        class_id: classId
      },
      {
        name: 'Maria Santos',
        email: 'maria.santos@teste.com',
        phone_number: '11888888888',
        whatsapp_number: '11888888888',
        school_id: schoolId,
        class_id: classId
      },
      {
        name: 'Pedro Oliveira',
        email: 'pedro.oliveira@teste.com',
        phone_number: '11777777777',
        whatsapp_number: '11777777777',
        school_id: schoolId,
        class_id: classId
      },
      {
        name: 'Ana Costa',
        email: 'ana.costa@teste.com',
        phone_number: '11666666666',
        whatsapp_number: '11666666666',
        school_id: schoolId,
        class_id: classId
      },
      {
        name: 'Carlos Ferreira',
        email: 'carlos.ferreira@teste.com',
        phone_number: '11555555555',
        whatsapp_number: '11555555555',
        school_id: schoolId,
        class_id: classId
      }
    ];
    
    for (const studentData of testStudents) {
      const { data: newStudent, error: createError } = await supabaseService
        .from('students')
        .insert(studentData)
        .select()
        .single();
      
      if (createError) {
        console.error(`❌ Erro ao criar aluno ${studentData.name}:`, createError);
      } else {
        console.log(`✅ Aluno criado: ${newStudent.name} (ID: ${newStudent.id})`);
      }
    }
    
    // 6. Verificar total de alunos após criação
    console.log('\n4. Verificando total de alunos após criação:');
    const { data: allStudents, error: countError, count } = await supabaseService
      .from('students')
      .select('*', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Erro ao contar alunos:', countError);
    } else {
      console.log(`✅ Total de alunos na base de dados: ${count}`);
    }
    
    // 7. Testar acesso com anonymous key
    console.log('\n5. Testando acesso com anonymous key:');
    const supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    const { data: studentsAnon, error: anonError } = await supabaseAnon
      .from('students')
      .select('*');
    
    if (anonError) {
      console.error('❌ Erro ao acessar com anonymous key:', anonError);
    } else {
      console.log(`✅ Alunos visíveis para anonymous: ${studentsAnon?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createTestStudents();