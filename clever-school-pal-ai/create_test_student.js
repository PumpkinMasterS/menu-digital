import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsaodmuqjtabfblrrdqv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE'
);

async function createTestData() {
  console.log('🚀 Creating test data...\n');

  // 1. Get or create a school
  let { data: schools } = await supabase.from('schools').select('id').limit(1);
  let schoolId;
  
  if (!schools?.length) {
    console.log('🏫 Creating test school...');
    const { data: newSchool } = await supabase
      .from('schools')
      .insert({
        name: 'Escola Teste',
        address: 'Rua Teste, 123',
        phone: '+351234567890',
        email: 'teste@escola.edu'
      })
      .select('id')
      .single();
    schoolId = newSchool.id;
  } else {
    schoolId = schools[0].id;
  }
  console.log('🏫 School ID:', schoolId);

  // 2. Get or create a class
  let { data: classes } = await supabase.from('classes').select('id').limit(1);
  let classId;
  
  if (!classes?.length) {
    console.log('🎓 Creating test class...');
    const { data: newClass } = await supabase
      .from('classes')
      .insert({
        name: '9º A',
        grade: '9º ano',
        school_id: schoolId
      })
      .select('id')
      .single();
    classId = newClass.id;
  } else {
    classId = classes[0].id;
  }
  console.log('🎓 Class ID:', classId);

  // 3. Create test student
  console.log('👨‍🎓 Creating test student...');
  const { data: newStudent, error } = await supabase
    .from('students')
          .insert({
        name: 'Aluno Teste',
        whatsapp_number: '+351999999999',
        email: 'aluno.teste@escola.edu',
        class_id: classId,
        school_id: schoolId,
        active: true,
        bot_active: true
      })
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error creating student:', error);
  } else {
    console.log('✅ Student created:', newStudent);
  }

  // 4. Test different search methods
  console.log('\n🔍 Testing search methods...');
  
  // Simple text search in content_data
  const { data: search1 } = await supabase
    .from('contents')
    .select('id, title')
    .ilike('content_data', '%segundo grau%');
  console.log('Search 1 (ilike):', search1?.length || 0, 'results');

  // Search in title
  const { data: search2 } = await supabase
    .from('contents')
    .select('id, title')
    .ilike('title', '%segundo%');
  console.log('Search 2 (title):', search2?.length || 0, 'results');

  // Get all contents
  const { data: allContents } = await supabase
    .from('contents')
    .select('id, title, status')
    .eq('status', 'publicado');
  console.log('All published contents:', allContents?.length || 0);

  console.log('\n✅ Setup complete! Test student phone: +351999999999');
}

createTestData().catch(console.error);