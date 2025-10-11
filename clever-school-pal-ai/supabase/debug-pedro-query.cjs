const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY1Njc2MCwiZXhwIjoyMDYzMjMyNzYwfQ.5q7JE1V3wD2722I5b4FJ7js4P61jZ3JtnpdA5So2FhY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar a consulta exata da Edge Function
async function testEdgeFunctionQuery() {
  try {
    console.log('🔍 Testando consulta exata da Edge Function...');
    console.log('📱 Número WhatsApp: +351999999998');
    
    // Esta é a consulta EXATA da Edge Function
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        whatsapp_number,
        special_context,
        classes!inner(
          id,
          name,
          grade,
          general_context
        ),
        schools!inner(
          id,
          name
        )
      `);

    query = query.eq('whatsapp_number', '+351999999998');

    const { data: students, error } = await query.maybeSingle();

    if (error) {
      console.log('❌ Erro na consulta:', error);
      return;
    }

    if (!students) {
      console.log('❌ Nenhum estudante encontrado com a consulta da Edge Function');
      console.log('🔍 Vamos testar sem inner joins...');
      
      // Testar sem inner joins
      const { data: studentSimple, error: errorSimple } = await supabase
        .from('students')
        .select('*')
        .eq('whatsapp_number', '+351999999998')
        .single();
        
      if (errorSimple) {
        console.log('❌ Erro na consulta simples:', errorSimple);
        return;
      }
      
      console.log('✅ Estudante encontrado na consulta simples:');
      console.log('📝 Nome:', studentSimple.name);
      console.log('🆔 ID:', studentSimple.id);
      console.log('📱 WhatsApp:', studentSimple.whatsapp_number);
      console.log('🏫 Class ID:', studentSimple.class_id);
      
      // Verificar se a turma existe
      if (studentSimple.class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('id', studentSimple.class_id)
          .single();
          
        if (classError) {
          console.log('❌ Erro ao buscar turma:', classError);
        } else {
          console.log('✅ Turma encontrada:');
          console.log('📝 Nome da turma:', classData.name);
          console.log('🏫 School ID:', classData.school_id);
          
          // Verificar se a escola existe
          if (classData.school_id) {
            const { data: schoolData, error: schoolError } = await supabase
              .from('schools')
              .select('*')
              .eq('id', classData.school_id)
              .single();
              
            if (schoolError) {
              console.log('❌ Erro ao buscar escola:', schoolError);
            } else {
              console.log('✅ Escola encontrada:');
              console.log('📝 Nome da escola:', schoolData.name);
            }
          }
        }
      }
      
      return;
    }

    console.log('✅ Estudante encontrado com consulta da Edge Function:');
    console.log('📝 Nome:', students.name);
    console.log('📧 WhatsApp:', students.whatsapp_number);
    console.log('🏫 Turma:', students.classes?.name);
    console.log('🏢 Escola:', students.schools?.name);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testEdgeFunctionQuery();