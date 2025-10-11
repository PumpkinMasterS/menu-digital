// Mock Data Population Script
// Creates 2 schools, 4 classes, and 8 students for testing

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL and Key are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateMockData() {
  console.log('🚀 Starting mock data population...');

  try {
    // 1. Create Schools
    console.log('📚 Creating schools...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .insert([
        {
          name: 'Escola Municipal João Silva',
          address: 'Rua das Flores, 123 - Centro',
          phone: '(11) 3456-7890',
          email: 'contato@escolajoaosilva.edu.br',
          description: 'Escola municipal com foco em educação integral e tecnologia educacional.',
          active: true
        },
        {
          name: 'Colégio Estadual Maria Santos',
          address: 'Av. Principal, 456 - Jardim das Rosas',
          phone: '(11) 2345-6789',
          email: 'secretaria@mariasantos.edu.br',
          description: 'Colégio estadual com tradição em ensino de qualidade e formação cidadã.',
          active: true
        }
      ])
      .select();

    if (schoolsError) throw schoolsError;
    console.log('✅ Schools created:', schools.length);

    // 2. Create Subjects
    console.log('📖 Creating subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .insert([
        {
          name: 'Matemática',
          description: 'Disciplina de matemática fundamental',
          color: '#FF6B6B',
          icon: '📊'
        },
        {
          name: 'Português',
          description: 'Língua portuguesa e literatura',
          color: '#4ECDC4',
          icon: '📚'
        },
        {
          name: 'Ciências',
          description: 'Ciências naturais e experimentais',
          color: '#45B7D1',
          icon: '🔬'
        },
        {
          name: 'História',
          description: 'História do Brasil e mundial',
          color: '#96CEB4',
          icon: '🏛️'
        }
      ])
      .select();

    if (subjectsError) throw subjectsError;
    console.log('✅ Subjects created:', subjects.length);

    // 3. Create Classes
    console.log('🎓 Creating classes...');
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .insert([
        {
          school_id: schools[0].id,
          name: '5º Ano A',
          year: 2025,
          description: 'Turma do 5º ano do ensino fundamental - manhã',
          active: true
        },
        {
          school_id: schools[0].id,
          name: '6º Ano B',
          year: 2025,
          description: 'Turma do 6º ano do ensino fundamental - tarde',
          active: true
        },
        {
          school_id: schools[1].id,
          name: '7º Ano A',
          year: 2025,
          description: 'Turma do 7º ano do ensino fundamental - manhã',
          active: true
        },
        {
          school_id: schools[1].id,
          name: '8º Ano C',
          year: 2025,
          description: 'Turma do 8º ano do ensino fundamental - tarde',
          active: true
        }
      ])
      .select();

    if (classesError) throw classesError;
    console.log('✅ Classes created:', classes.length);

    // 4. Create Students
    console.log('👥 Creating students...');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .insert([
        // Students for School 1, Class 1 (5º Ano A)
        {
          school_id: schools[0].id,
          class_id: classes[0].id,
          name: 'Ana Clara Silva',
          email: 'ana.clara@email.com',
          student_number: '2025001',
          birth_date: '2014-03-15',
          parent_name: 'Carlos Silva',
          parent_email: 'carlos.silva@email.com',
          parent_phone: '(11) 99999-1111',
          active: true
        },
        {
          school_id: schools[0].id,
          class_id: classes[0].id,
          name: 'Bruno Santos',
          email: 'bruno.santos@email.com',
          student_number: '2025002',
          birth_date: '2014-07-22',
          parent_name: 'Maria Santos',
          parent_email: 'maria.santos@email.com',
          parent_phone: '(11) 99999-2222',
          active: true
        },
        // Students for School 1, Class 2 (6º Ano B)
        {
          school_id: schools[0].id,
          class_id: classes[1].id,
          name: 'Carolina Oliveira',
          email: 'carolina.oliveira@email.com',
          student_number: '2025003',
          birth_date: '2013-11-08',
          parent_name: 'João Oliveira',
          parent_email: 'joao.oliveira@email.com',
          parent_phone: '(11) 99999-3333',
          active: true
        },
        {
          school_id: schools[0].id,
          class_id: classes[1].id,
          name: 'Diego Ferreira',
          email: 'diego.ferreira@email.com',
          student_number: '2025004',
          birth_date: '2013-05-30',
          parent_name: 'Ana Ferreira',
          parent_email: 'ana.ferreira@email.com',
          parent_phone: '(11) 99999-4444',
          active: true
        },
        // Students for School 2, Class 3 (7º Ano A)
        {
          school_id: schools[1].id,
          class_id: classes[2].id,
          name: 'Eduarda Costa',
          email: 'eduarda.costa@email.com',
          student_number: '2025005',
          birth_date: '2012-09-12',
          parent_name: 'Roberto Costa',
          parent_email: 'roberto.costa@email.com',
          parent_phone: '(11) 99999-5555',
          active: true
        },
        {
          school_id: schools[1].id,
          class_id: classes[2].id,
          name: 'Felipe Rodrigues',
          email: 'felipe.rodrigues@email.com',
          student_number: '2025006',
          birth_date: '2012-12-03',
          parent_name: 'Lucia Rodrigues',
          parent_email: 'lucia.rodrigues@email.com',
          parent_phone: '(11) 99999-6666',
          active: true
        },
        // Students for School 2, Class 4 (8º Ano C)
        {
          school_id: schools[1].id,
          class_id: classes[3].id,
          name: 'Gabriela Lima',
          email: 'gabriela.lima@email.com',
          student_number: '2025007',
          birth_date: '2011-04-18',
          parent_name: 'Pedro Lima',
          parent_email: 'pedro.lima@email.com',
          parent_phone: '(11) 99999-7777',
          active: true
        },
        {
          school_id: schools[1].id,
          class_id: classes[3].id,
          name: 'Henrique Alves',
          email: 'henrique.alves@email.com',
          student_number: '2025008',
          birth_date: '2011-08-25',
          parent_name: 'Sandra Alves',
          parent_email: 'sandra.alves@email.com',
          parent_phone: '(11) 99999-8888',
          active: true
        }
      ])
      .select();

    if (studentsError) throw studentsError;
    console.log('✅ Students created:', students.length);

    // 5. Create Class-Subject relationships
    console.log('🔗 Creating class-subject relationships...');
    const classSubjects = [];
    
    // Each class will have all subjects
    for (const classItem of classes) {
      for (const subject of subjects) {
        classSubjects.push({
          class_id: classItem.id,
          subject_id: subject.id,
          teacher_name: `Professor(a) de ${subject.name}`,
          teacher_email: `professor.${subject.name.toLowerCase()}@${classItem.school_id === schools[0].id ? 'escolajoaosilva' : 'mariasantos'}.edu.br`,
          active: true
        });
      }
    }

    const { data: classSubjectsData, error: classSubjectsError } = await supabase
      .from('class_subjects')
      .insert(classSubjects)
      .select();

    if (classSubjectsError) throw classSubjectsError;
    console.log('✅ Class-subject relationships created:', classSubjectsData.length);

    // 6. Create some sample content
    console.log('📝 Creating sample content...');
    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .insert([
        {
          school_id: schools[0].id,
          subject_id: subjects[0].id, // Matemática
          title: 'Frações - Conceitos Básicos',
          content: 'Uma fração representa uma parte de um todo. É composta por numerador (parte de cima) e denominador (parte de baixo). Por exemplo: 1/2 representa metade de algo.',
          summary: 'Introdução aos conceitos básicos de frações',
          topics: ['frações', 'numerador', 'denominador', 'matemática básica'],
          year: 5,
          difficulty_level: 2,
          content_type: 'lesson',
          tags: ['matemática', '5º ano', 'frações'],
          active: true
        },
        {
          school_id: schools[1].id,
          subject_id: subjects[1].id, // Português
          title: 'Verbos - Tempos Verbais',
          content: 'Os verbos são palavras que indicam ação, estado ou fenômeno. Eles podem ser conjugados em diferentes tempos: presente, passado e futuro.',
          summary: 'Estudo dos tempos verbais em português',
          topics: ['verbos', 'tempos verbais', 'conjugação', 'gramática'],
          year: 7,
          difficulty_level: 3,
          content_type: 'lesson',
          tags: ['português', '7º ano', 'verbos'],
          active: true
        }
      ])
      .select();

    if (contentsError) throw contentsError;
    console.log('✅ Sample content created:', contents.length);

    console.log('\n🎉 Mock data population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Schools: ${schools.length}`);
    console.log(`- Subjects: ${subjects.length}`);
    console.log(`- Classes: ${classes.length}`);
    console.log(`- Students: ${students.length}`);
    console.log(`- Class-Subject relationships: ${classSubjectsData.length}`);
    console.log(`- Sample contents: ${contents.length}`);

  } catch (error) {
    console.error('❌ Error populating mock data:', error);
    process.exit(1);
  }
}

// Run the population script
populateMockData();