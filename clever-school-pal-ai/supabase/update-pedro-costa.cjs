const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updatePedroCosta() {
  console.log('🔧 Atualizando Pedro Costa com número de WhatsApp...');
  
  // Atualizar Pedro Costa com whatsapp_number
  const { data, error } = await supabase
    .from('students')
    .update({ 
      whatsapp_number: '+351999999998' // Número diferente do Antonio
    })
    .eq('name', 'Pedro Costa')
    .select();
    
  if (error) {
    console.error('❌ Erro ao atualizar Pedro Costa:', error);
  } else {
    console.log('✅ Pedro Costa atualizado com sucesso:', data);
  }
  
  // Verificar se a atualização funcionou
  const { data: updatedStudent, error: checkError } = await supabase
    .from('students')
    .select('*')
    .eq('name', 'Pedro Costa')
    .single();
    
  if (checkError) {
    console.error('❌ Erro ao verificar Pedro Costa:', checkError);
  } else {
    console.log('\n📊 Pedro Costa após atualização:', updatedStudent);
  }
}

updatePedroCosta().catch(console.error);