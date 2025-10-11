#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStudentContent() {
  console.log('🔍 EduConnect - Diagnóstico de Conteúdo');
  console.log('='.repeat(50));

  // 1. Check test student
  console.log('👨‍🎓 Verificando estudante de teste...');
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select(`
      id, 
      name, 
      phone_number,
      class_id, 
      school_id, 
      active,
      bot_active,
      classes(id, name, grade),
      schools(id, name)
    `)
    .eq('phone_number', '+351999999999')
    .single();

  if (studentError) {
    console.log('❌ Estudante de teste não encontrado:', studentError.message);
    return;
  }

  console.log(`✅ Estudante encontrado: ${student.name}`);
  console.log(`   📱 Telefone: ${student.phone_number}`);
  console.log(`   🏫 Escola: ${student.schools?.name} (${student.school_id})`);
  console.log(`   📚 Turma: ${student.classes?.name} (${student.classes?.grade}) - ID: ${student.class_id}`);
  console.log(`   🤖 Bot ativo: ${student.bot_active ? 'SIM' : 'NÃO'}`);

  // 2. Check content associations for this class
  console.log('\n📝 Verificando conteúdos associados à turma...');
  const { data: contentAssocs, error: assocsError } = await supabase
    .from('content_classes')
    .select(`
      content_id,
      class_id,
      contents(
        id, 
        title, 
        description,
        status, 
        subject_id,
        embedding,
        subjects(name)
      )
    `)
    .eq('class_id', student.class_id);

  if (assocsError) {
    console.log('❌ Erro ao buscar associações:', assocsError.message);
    return;
  }

  console.log(`📊 Total de conteúdos associados: ${contentAssocs?.length || 0}`);
  
  if (contentAssocs?.length > 0) {
    contentAssocs.forEach((assoc, index) => {
      const content = assoc.contents;
      console.log(`   ${index + 1}. ${content.title}`);
      console.log(`      📚 Disciplina: ${content.subjects?.name || 'N/A'}`);
      console.log(`      📋 Status: ${content.status}`);
      console.log(`      🧠 Embedding: ${content.embedding ? 'SIM' : 'NÃO'}`);
      console.log(`      📝 Descrição: ${content.description?.substring(0, 80)}...`);
    });
  } else {
    console.log('   ❌ Nenhum conteúdo associado a esta turma!');
  }

  // 3. Check all published content
  console.log('\n📚 Verificando todo conteúdo publicado...');
  const { data: allContent, error: allContentError } = await supabase
    .from('contents')
    .select(`
      id,
      title,
      status,
      embedding,
      subjects(name),
      content_classes(class_id, classes(name, grade))
    `)
    .eq('status', 'publicado');

  if (allContentError) {
    console.log('❌ Erro ao buscar conteúdo:', allContentError.message);
    return;
  }

  console.log(`📊 Total de conteúdo publicado: ${allContent?.length || 0}`);
  allContent?.forEach((content, index) => {
    console.log(`   ${index + 1}. ${content.title} (${content.subjects?.name})`);
    console.log(`      🧠 Embedding: ${content.embedding ? 'SIM' : 'NÃO'}`);
    console.log(`      📚 Turmas: ${content.content_classes?.map(cc => cc.classes?.name).join(', ') || 'Nenhuma'}`);
  });

  // 4. Test the search function manually
  console.log('\n🔍 Testando busca manual...');
  const { data: searchResult, error: searchError } = await supabase
    .from('contents')
    .select(`
      id,
      title,
      description,
      content_data,
      content_type,
      subjects!inner(name, grade),
      content_classes!inner(
        classes!inner(id, name, grade)
      )
    `)
    .eq('status', 'publicado')
    .eq('content_classes.class_id', student.class_id);

  console.log(`🎯 Resultados da busca manual: ${searchResult?.length || 0}`);
  if (searchResult?.length > 0) {
    searchResult.forEach(result => {
      console.log(`   ✅ ${result.title}`);
    });
  }

  console.log('\n💡 DIAGNÓSTICO:');
  if (contentAssocs?.length === 0) {
    console.log('❌ PROBLEMA: Não há conteúdo associado a esta turma!');
    console.log('   🔧 SOLUÇÃO: Precisa criar conteúdo e associar à turma');
  } else if (contentAssocs?.some(c => !c.contents.embedding)) {
    console.log('⚠️  PROBLEMA: Conteúdo existe mas sem embeddings!');
    console.log('   🔧 SOLUÇÃO: Precisa gerar embeddings para o conteúdo');
  } else {
    console.log('✅ Conteúdo existe e tem embeddings - problema pode ser na função de busca');
  }
}

checkStudentContent().catch(console.error); 