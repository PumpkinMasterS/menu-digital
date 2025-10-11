const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY1Njc2MCwiZXhwIjoyMDYzMjMyNzYwfQ.5q7JE1V3wD2722I5b4FJ7js4P61jZ3JtnpdA5So2FhY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar o contexto hierárquico do Pedro Costa
async function testPedroContext() {
  try {
    console.log('🔍 Testando contexto hierárquico do Pedro Costa...');
    console.log('📱 Número WhatsApp: +351999999998');
    
    // Buscar estudante por whatsapp_number
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        email,
        whatsapp_number,
        class_id,
        classes (
          id,
          name,
          school_id,
          schools (
            id,
            name,
            address,
            phone,
            email
          )
        )
      `)
      .eq('whatsapp_number', '+351999999998')
      .single();

    if (studentError) {
      console.log('❌ Erro ao buscar estudante:', studentError);
      return;
    }

    if (!student) {
      console.log('❌ Estudante não encontrado com WhatsApp +351999999998');
      return;
    }

    console.log('✅ Estudante encontrado:');
    console.log('📝 Nome:', student.name);
    console.log('📧 Email:', student.email);
    console.log('📱 WhatsApp:', student.whatsapp_number);
    console.log('🏫 Turma:', student.classes?.name || 'N/A');
    console.log('🏢 Escola:', student.classes?.schools?.name || 'N/A');
    
    // Buscar contexto da escola
    if (student.classes?.schools?.id) {
      const { data: schoolContext, error: schoolError } = await supabase
        .from('school_context')
        .select('*')
        .eq('school_id', student.classes.schools.id);
        
      console.log('🏫 Contexto da escola:', schoolContext?.length || 0, 'registros');
    }
    
    // Buscar matérias da turma
    if (student.class_id) {
      const { data: subjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select(`
          id,
          subject_name,
          description,
          subjects (
            id,
            name,
            description
          )
        `)
        .eq('class_id', student.class_id);
        
      console.log('📚 Matérias da turma:', subjects?.length || 0, 'matérias');
      if (subjects && subjects.length > 0) {
        subjects.forEach(subject => {
          console.log('  -', subject.subject_name || subject.subjects?.name);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testPedroContext();