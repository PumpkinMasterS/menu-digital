const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function registerMyDiscord() {
  try {
    console.log('🔍 Registando o teu Discord ID no sistema...');
    
    // CONFIGURAÇÃO: Altere estes valores com os teus dados
    const MY_DISCORD_ID = '221002870693036032'; // Substitua pelo seu Discord ID
    const MY_USERNAME = '.pumpkinmasterz'; // Substitua pelo seu username Discord
    
    // Primeiro, vamos verificar se existem estudantes disponíveis
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, email')
      .limit(5);
    
    if (studentsError) {
      console.error('❌ Erro ao buscar estudantes:', studentsError.message);
      return;
    }
    
    if (!students || students.length === 0) {
      console.log('❌ Nenhum estudante encontrado na base de dados.');
      console.log('💡 Execute primeiro: node populate-discord-demo-data.cjs');
      return;
    }
    
    console.log('📚 Estudantes disponíveis:');
    students.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (${student.email}) - ID: ${student.id}`);
    });
    
    // Por defeito, vamos usar o primeiro estudante
    // Pode alterar o índice [0] para escolher outro estudante
    const selectedStudent = students[0];
    
    console.log(`\n🎯 A associar ao estudante: ${selectedStudent.name}`);
    
    // Verificar se o Discord ID já existe
    const { data: existingUser } = await supabase
      .from('discord_users')
      .select('*')
      .eq('user_id', MY_DISCORD_ID)
      .single();
    
    if (existingUser) {
      console.log('⚠️  Discord ID já registado. A actualizar...');
      
      const { error: updateError } = await supabase
        .from('discord_users')
        .update({
          username: MY_USERNAME,
          student_id: selectedStudent.id,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', MY_DISCORD_ID);
      
      if (updateError) {
        console.error('❌ Erro ao actualizar:', updateError.message);
        return;
      }
      
      console.log('✅ Discord ID actualizado com sucesso!');
    } else {
      console.log('➕ A criar novo registo...');
      
      const { error: insertError } = await supabase
        .from('discord_users')
        .insert([{
          user_id: MY_DISCORD_ID,
          username: MY_USERNAME,
          student_id: selectedStudent.id,
          is_active: true
        }]);
      
      if (insertError) {
        console.error('❌ Erro ao inserir:', insertError.message);
        return;
      }
      
      console.log('✅ Discord ID registado com sucesso!');
    }
    
    // Verificar o registo final
    const { data: finalUser } = await supabase
      .from('discord_users')
      .select(`
        *,
        students (
          id,
          name,
          email
        )
      `)
      .eq('user_id', MY_DISCORD_ID)
      .single();
    
    console.log('\n📋 Registo final:');
    console.log(`   Discord ID: ${finalUser.user_id}`);
    console.log(`   Username: ${finalUser.username}`);
    console.log(`   Estudante: ${finalUser.students?.name}`);
    console.log(`   Email: ${finalUser.students?.email}`);
    
    console.log('\n🎉 Configuração concluída!');
    console.log('💬 Agora podes testar o bot enviando uma mensagem privada.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Verificar se os valores foram alterados
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🤖 Script de Registo Discord

Como usar:
1. Abra este ficheiro (register-my-discord.cjs)
2. Substitua 'SEU_DISCORD_ID_AQUI' pelo seu Discord ID
3. Substitua 'SEU_USERNAME_AQUI' pelo seu username Discord
4. Execute: node register-my-discord.cjs

📝 Como obter o Discord ID:
1. Discord → Configurações → Avançado → Activar "Modo de Desenvolvedor"
2. Clique direito no seu nome → "Copiar ID"

`);
  process.exit(0);
}

registerMyDiscord();