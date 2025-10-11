const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkPedroCosta() {
  console.log('🔍 Procurando por Pedro Costa na base de dados...');
  
  // Buscar por Pedro Costa
  const { data: pedroData, error: pedroError } = await supabase
    .from('students')
    .select('*')
    .ilike('name', '%Pedro Costa%');
    
  if (pedroError) {
    console.error('❌ Erro ao buscar Pedro Costa:', pedroError);
  } else {
    console.log('📊 Resultados para Pedro Costa:', pedroData);
  }
  
  // Buscar todos os estudantes para ver o que existe
  const { data: allStudents, error: allError } = await supabase
    .from('students')
    .select('id, name, whatsapp_number')
    .limit(10);
    
  if (allError) {
    console.error('❌ Erro ao buscar todos os estudantes:', allError);
  } else {
    console.log('\n📋 Primeiros 10 estudantes na base de dados:');
    allStudents.forEach(student => {
      console.log(`   - ${student.name} (${student.whatsapp_number})`);
    });
  }
}

checkPedroCosta().catch(console.error);