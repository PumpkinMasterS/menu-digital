const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function populateDiscordDemoData() {
  try {
    console.log('Criando dados de demonstração para Discord...');
    
    // Primeiro, vamos verificar se existem escolas
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(1);
    
    if (schoolsError) {
      console.error('Erro ao buscar escolas:', schoolsError.message);
      return;
    }
    
    if (!schools || schools.length === 0) {
      console.log('Nenhuma escola encontrada. Criando escola de demonstração...');
      
      const { data: newSchool, error: createSchoolError } = await supabase
        .from('schools')
        .insert([{
          name: 'Escola Demonstração Discord',
          address: 'Rua da Demonstração, 123',
          phone: '123456789',
          email: 'demo@escola.pt'
        }])
        .select()
        .single();
      
      if (createSchoolError) {
        console.error('Erro ao criar escola:', createSchoolError.message);
        return;
      }
      
      schools.push(newSchool);
    }
    
    const schoolId = schools[0].id;
    console.log(`Usando escola: ${schools[0].name} (ID: ${schoolId})`);
    
    // Verificar se existem turmas
    let { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId)
      .limit(2);
    
    if (!classes || classes.length === 0) {
      console.log('Criando turmas de demonstração...');
      
      const { data: newClasses, error: createClassesError } = await supabase
        .from('classes')
        .insert([
          {
            name: '10º A - Ciências',
            school_id: schoolId,
            grade: '10º Ano',
            academic_year: '2024',
            description: 'Turma de Ciências do 10º ano'
          },
          {
            name: '11º B - Humanidades',
            school_id: schoolId,
            grade: '11º Ano',
            academic_year: '2024',
            description: 'Turma de Humanidades do 11º ano'
          }
        ])
        .select();
      
      if (createClassesError) {
        console.error('Erro ao criar turmas:', createClassesError.message);
        return;
      }
      
      classes = newClasses;
    }
    
    console.log(`Usando ${classes.length} turmas`);
    
    // Verificar se existem estudantes
    let { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .in('class_id', classes.map(c => c.id))
      .limit(3);
    
    if (!students || students.length === 0) {
      console.log('Criando estudantes de demonstração...');
      
      const { data: newStudents, error: createStudentsError } = await supabase
        .from('students')
        .insert([
          {
            name: 'João Silva',
            email: 'joao.silva@escola.pt',
            class_id: classes[0].id
          },
          {
            name: 'Maria Santos',
            email: 'maria.santos@escola.pt',
            class_id: classes[0].id
          },
          {
            name: 'Pedro Costa',
            email: 'pedro.costa@escola.pt',
            class_id: classes[1].id
          }
        ])
        .select();
      
      if (createStudentsError) {
        console.error('Erro ao criar estudantes:', createStudentsError.message);
        return;
      }
      
      students = newStudents;
    }
    
    console.log(`Usando ${students.length} estudantes`);
    
    // Agora criar dados do Discord
    console.log('\nCriando dados Discord...');
    
    // 1. Criar servidor Discord (Guild)
    const { data: guild, error: guildError } = await supabase
      .from('discord_guilds')
      .insert([{
        guild_id: '1234567890123456789',
        guild_name: 'Servidor Escola Demonstração',
        school_id: schoolId,
        is_active: true
      }])
      .select()
      .single();
    
    if (guildError && !guildError.message.includes('duplicate')) {
      console.error('Erro ao criar guild:', guildError.message);
      return;
    }
    
    console.log('✅ Servidor Discord criado');
    
    // 2. Criar canais Discord
    const channelsData = [
      {
        channel_id: '1234567890123456780',
        channel_name: 'geral-10a-ciencias',
        guild_id: '1234567890123456789',
        class_id: classes[0].id,
        is_active: true
      },
      {
        channel_id: '1234567890123456781',
        channel_name: 'geral-11b-humanidades',
        guild_id: '1234567890123456789',
        class_id: classes[1].id,
        is_active: true
      },
      {
        channel_id: '1234567890123456782',
        channel_name: 'avisos-gerais',
        guild_id: '1234567890123456789',
        class_id: null,
        is_active: true
      }
    ];
    
    const { error: channelsError } = await supabase
      .from('discord_channels')
      .insert(channelsData);
    
    if (channelsError && !channelsError.message.includes('duplicate')) {
      console.error('Erro ao criar canais:', channelsError.message);
      return;
    }
    
    console.log('✅ Canais Discord criados');
    
    // 3. Criar utilizadores Discord
    const usersData = [
      {
        user_id: '9876543210987654321',
        username: 'joao_silva_10a',
        student_id: students[0].id,
        is_active: true
      },
      {
        user_id: '9876543210987654322',
        username: 'maria_santos_10a',
        student_id: students[1].id,
        is_active: true
      },
      {
        user_id: '9876543210987654323',
        username: 'pedro_costa_11b',
        student_id: students[2].id,
        is_active: true
      }
    ];
    
    const { error: usersError } = await supabase
      .from('discord_users')
      .insert(usersData);
    
    if (usersError && !usersError.message.includes('duplicate')) {
      console.error('Erro ao criar utilizadores:', usersError.message);
      return;
    }
    
    console.log('✅ Utilizadores Discord criados');
    
    // 4. Criar configuração do bot
    const { error: configError } = await supabase
      .from('discord_bot_config')
      .insert([{
        guild_id: '1234567890123456789',
        command_prefix: '!',
        language: 'pt-BR',
        welcome_message: 'Bem-vindo ao servidor educativo! 🎓 Sou o teu assistente de aprendizagem.',
        help_message: 'Olá! Sou o assistente educativo. Posso ajudar-te com dúvidas sobre as matérias, exercícios e muito mais. Usa !ajuda para ver os comandos disponíveis.',
        is_active: true
      }]);
    
    if (configError && !configError.message.includes('duplicate')) {
      console.error('Erro ao criar configuração:', configError.message);
      return;
    }
    
    console.log('✅ Configuração do bot criada');
    
    // Verificar resultados finais
    console.log('\n📊 Verificando dados criados...');
    
    const tables = ['discord_guilds', 'discord_channels', 'discord_users', 'discord_bot_config'];
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`${table}: ${count || 0} registros`);
    }
    
    console.log('\n🎉 Dados de demonstração criados com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Aceda à página de Gestão Discord no painel admin');
    console.log('2. Configure o token do bot Discord nas variáveis de ambiente');
    console.log('3. Convide o bot para o servidor Discord usando o ID: 1234567890123456789');
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

populateDiscordDemoData();