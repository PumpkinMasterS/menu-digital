// Script para popular tabelas de relação com dados de teste
// Execute: node populate-relation-tables.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para buscar dados existentes
async function getExistingData() {
  console.log('📊 Buscando dados existentes...');
  
  const [schoolsResult, classesResult, subjectsResult, contentsResult] = await Promise.all([
    supabase.from('schools').select('*'),
    supabase.from('classes').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('contents').select('*')
  ]);

  if (schoolsResult.error) throw schoolsResult.error;
  if (classesResult.error) throw classesResult.error;
  if (subjectsResult.error) throw subjectsResult.error;
  if (contentsResult.error) throw contentsResult.error;

  return {
    schools: schoolsResult.data,
    classes: classesResult.data,
    subjects: subjectsResult.data,
    contents: contentsResult.data
  };
}

// Função para popular teacher_class_subjects
async function populateTeacherClassSubjects(data) {
  console.log('\n👨‍🏫 Populando tabela teacher_class_subjects...');
  
  // Buscar professores de teste do banco de dados
  console.log('🔍 Buscando professores no sistema...');
  let teacherUsers = [];
  
  try {
    const { data: allUsers, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    teacherUsers = allUsers?.users?.filter(u => u.app_metadata?.role === 'teacher') || [];
    console.log(`📋 Encontrados ${teacherUsers.length} professores no sistema`);
  } catch (error) {
    console.log('⚠️ Erro ao buscar professores:', error.message);
    console.log('⚠️ Usando IDs genéricos...');
  }
  
  // Emails dos professores de teste com mapeamento
  const teachers = [
    { email: 'professor1@escola1.com', name: 'Carlos Oliveira', subjects: ['Matemática', 'Física'] },
    { email: 'professor2@escola1.com', name: 'Ana Costa', subjects: ['Português', 'História'] },
    { email: 'professor3@escola2.com', name: 'Pedro Lima', subjects: ['Ciências', 'Geografia'] }
  ];

  const teacherClassSubjects = [];

  // Para cada professor
  for (const teacher of teachers) {
    // Encontrar escola do professor baseado no email
    const schoolId = teacher.email.includes('escola1') ? 1 : 2;
    
    // Buscar turmas da escola
    const schoolClasses = data.classes.filter(c => c.school_id === schoolId);
    
    // Para cada matéria do professor
    for (const subjectName of teacher.subjects) {
      // Encontrar a matéria
      const subject = data.subjects.find(s => 
        s.name.toLowerCase().includes(subjectName.toLowerCase()) && 
        s.school_id === schoolId
      );
      
      if (subject) {
        // Associar professor a algumas turmas da escola para esta matéria
        const classesToAssign = schoolClasses.slice(0, Math.min(2, schoolClasses.length));
        
        for (const classItem of classesToAssign) {
          // Encontrar o ID do professor
          const teacherUser = teacherUsers?.find(u => u.email === teacher.email);
          if (teacherUser) {
            teacherClassSubjects.push({
              teacher_id: teacherUser.id,
              class_id: classItem.id,
              subject_id: subject.id,
              is_active: true,
              assigned_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  // Se não encontrou associações específicas, criar algumas genéricas
  if (teacherClassSubjects.length === 0) {
    console.log('⚠️ Criando associações genéricas...');
    
    for (let i = 0; i < Math.min(teachers.length, data.classes.length, data.subjects.length); i++) {
      const teacher = teachers[i % teachers.length];
      const classItem = data.classes[i % data.classes.length];
      const subject = data.subjects[i % data.subjects.length];
      
      // Encontrar o ID do professor ou usar um genérico
      const teacherUser = teacherUsers?.find(u => u.email === teacher.email);
      const teacherId = teacherUser?.id || `00000000-0000-0000-0000-00000000000${i + 1}`;
      
      teacherClassSubjects.push({
        teacher_id: teacherId,
        class_id: classItem.id,
        subject_id: subject.id,
        is_active: true,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  console.log(`📝 Inserindo ${teacherClassSubjects.length} associações professor-turma-matéria...`);
  
  // Limpar tabela primeiro
  await supabase.from('teacher_class_subjects').delete().neq('id', 0);
  
  // Inserir novos dados
  const { data: insertedData, error } = await supabase
    .from('teacher_class_subjects')
    .insert(teacherClassSubjects)
    .select();

  if (error) {
    console.error('❌ Erro ao inserir teacher_class_subjects:', error);
    throw error;
  }

  console.log(`✅ ${insertedData.length} associações professor-turma-matéria criadas`);
  
  // Mostrar resumo
  teacherClassSubjects.forEach(tcs => {
    const classItem = data.classes.find(c => c.id === tcs.class_id);
    const subject = data.subjects.find(s => s.id === tcs.subject_id);
    console.log(`   - ${tcs.teacher_name} → ${classItem?.name} → ${subject?.name}`);
  });

  return insertedData;
}

// Função para popular content_classes
async function populateContentClasses(data) {
  console.log('\n📚 Populando tabela content_classes...');
  
  const contentClasses = [];

  // Para cada conteúdo, associar a turmas que têm a matéria correspondente
  for (const content of data.contents) {
    // Buscar turmas que têm professores lecionando esta matéria
    const { data: teacherAssignments, error } = await supabase
      .from('teacher_class_subjects')
      .select('class_id')
      .eq('subject_id', content.subject_id);

    if (error) {
      console.error('❌ Erro ao buscar associações de professores:', error);
      continue;
    }

    const classIds = [...new Set(teacherAssignments.map(ta => ta.class_id))];
    
    // Se não há associações de professores, associar a turmas da mesma escola
    if (classIds.length === 0) {
      const subject = data.subjects.find(s => s.id === content.subject_id);
      if (subject) {
        const schoolClasses = data.classes.filter(c => c.school_id === subject.school_id);
        classIds.push(...schoolClasses.slice(0, 2).map(c => c.id));
      }
    }

    // Criar associações conteúdo-turma
    for (const classId of classIds) {
      contentClasses.push({
        content_id: content.id,
        class_id: classId,
        assigned_at: new Date().toISOString()
      });
    }
  }

  // Se não há conteúdos ou turmas, criar algumas associações básicas
  if (contentClasses.length === 0 && data.contents.length > 0 && data.classes.length > 0) {
    console.log('⚠️ Criando associações básicas conteúdo-turma...');
    
    for (let i = 0; i < Math.min(data.contents.length, data.classes.length * 2); i++) {
      const content = data.contents[i % data.contents.length];
      const classItem = data.classes[Math.floor(i / 2) % data.classes.length];
      
      contentClasses.push({
        content_id: content.id,
        class_id: classItem.id,
        assigned_at: new Date().toISOString()
      });
    }
  }

  console.log(`📝 Inserindo ${contentClasses.length} associações conteúdo-turma...`);
  
  // Limpar tabela primeiro
  await supabase.from('content_classes').delete().neq('id', 0);
  
  // Inserir novos dados
  const { data: insertedData, error } = await supabase
    .from('content_classes')
    .insert(contentClasses)
    .select();

  if (error) {
    console.error('❌ Erro ao inserir content_classes:', error);
    throw error;
  }

  console.log(`✅ ${insertedData.length} associações conteúdo-turma criadas`);
  
  // Mostrar resumo
  contentClasses.forEach(cc => {
    const content = data.contents.find(c => c.id === cc.content_id);
    const classItem = data.classes.find(c => c.id === cc.class_id);
    console.log(`   - ${content?.title} → ${classItem?.name}`);
  });

  return insertedData;
}

// Função para verificar dados inseridos
async function verifyInsertedData() {
  console.log('\n🔍 Verificando dados inseridos...');
  
  const [tcsResult, ccResult] = await Promise.all([
    supabase.from('teacher_class_subjects').select('*'),
    supabase.from('content_classes').select('*')
  ]);

  console.log(`📊 Teacher-Class-Subjects: ${tcsResult.data?.length || 0} registros`);
  console.log(`📊 Content-Classes: ${ccResult.data?.length || 0} registros`);
  
  return {
    teacherClassSubjects: tcsResult.data || [],
    contentClasses: ccResult.data || []
  };
}

// Função principal
async function main() {
  try {
    console.log('🚀 Iniciando população das tabelas de relação...');
    
    // Buscar dados existentes
    const data = await getExistingData();
    
    console.log(`\n📊 Dados encontrados:`);
    console.log(`   - Escolas: ${data.schools.length}`);
    console.log(`   - Turmas: ${data.classes.length}`);
    console.log(`   - Matérias: ${data.subjects.length}`);
    console.log(`   - Conteúdos: ${data.contents.length}`);
    
    if (data.classes.length === 0 || data.subjects.length === 0) {
      console.error('❌ Não há turmas ou matérias suficientes para criar associações');
      return;
    }
    
    // Popular tabelas de relação
    await populateTeacherClassSubjects(data);
    await populateContentClasses(data);
    
    // Verificar resultado
    await verifyInsertedData();
    
    console.log('\n🎉 População das tabelas de relação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('populate-relation-tables.js')) {
  main().catch(console.error);
}