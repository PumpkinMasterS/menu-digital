#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuzwckwsnslcmgjftkuw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1enddand3bnNsY21nanJmdGt1dyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzU1Mzk3MzQsImV4cCI6MjA1MTExNTczNH0.Dqd6OftRVmJgmE7zRPY5Q8lKjmQj8VQjVoRrGV3pGxs';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1enddand3bnNsY21nanJmdGt1dyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM1NTM5NzM0LCJleHAiOjIwNTExMTU3MzR9.l3vhwVBCBH5VfxPNW23fPnRqxAGmtLUBLx-lA7U8mTs';

const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugStudentsFetch() {
  console.log('🔍 Debug da query de alunos...\n');

  try {
    // 1. Query original (sem FK explícitas)
    console.log('1. Testando query ORIGINAL (sem FK explícitas):');
    const { data: originalData, error: originalError } = await anonSupabase
      .from("students")
      .select(`
        id,
        name,
        whatsapp_number,
        email,
        active,
        bot_active,
        class_id,
        school_id,
        classes(id, name),
        schools(id, name)
      `)
      .order("name");

    if (originalError) {
      console.log('❌ Erro na query original:', originalError);
    } else {
      console.log('✅ Query original funcionou! Dados:', originalData?.length, 'alunos');
      if (originalData?.length > 0) {
        console.log('   Primeiro aluno:', {
          name: originalData[0].name,
          className: originalData[0].classes?.name,
          schoolName: originalData[0].schools?.name
        });
      }
    }

    console.log('\n2. Testando query com FK EXPLÍCITAS:');
    const { data: fkData, error: fkError } = await anonSupabase
      .from("students")
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
      .order("name");

    if (fkError) {
      console.log('❌ Erro na query com FK explícitas:', fkError);
    } else {
      console.log('✅ Query com FK explícitas funcionou! Dados:', fkData?.length, 'alunos');
      if (fkData?.length > 0) {
        console.log('   Primeiro aluno:', {
          name: fkData[0].name,
          className: fkData[0].classes?.name,
          schoolName: fkData[0].schools?.name
        });
      }
    }

    console.log('\n3. Testando query SIMPLES (sem relações):');
    const { data: simpleData, error: simpleError } = await anonSupabase
      .from("students")
      .select(`
        id,
        name,
        whatsapp_number,
        email,
        active,
        bot_active,
        class_id,
        school_id
      `)
      .order("name");

    if (simpleError) {
      console.log('❌ Erro na query simples:', simpleError);
    } else {
      console.log('✅ Query simples funcionou! Dados:', simpleData?.length, 'alunos');
      if (simpleData?.length > 0) {
        console.log('   Primeiro aluno:', {
          name: simpleData[0].name,
          class_id: simpleData[0].class_id,
          school_id: simpleData[0].school_id
        });
      }
    }

    console.log('\n4. Verificando se existem classes e escolas:');
    const [classesResult, schoolsResult] = await Promise.all([
      anonSupabase.from('classes').select('id, name').order('name'),
      anonSupabase.from('schools').select('id, name').order('name')
    ]);

    if (classesResult.error) {
      console.log('❌ Erro ao buscar classes:', classesResult.error);
    } else {
      console.log('✅ Classes encontradas:', classesResult.data?.length);
      classesResult.data?.slice(0, 3).forEach(cls => 
        console.log(`   - ${cls.name} (${cls.id})`)
      );
    }

    if (schoolsResult.error) {
      console.log('❌ Erro ao buscar escolas:', schoolsResult.error);
    } else {
      console.log('✅ Escolas encontradas:', schoolsResult.data?.length);
      schoolsResult.data?.slice(0, 3).forEach(school => 
        console.log(`   - ${school.name} (${school.id})`)
      );
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

debugStudentsFetch();