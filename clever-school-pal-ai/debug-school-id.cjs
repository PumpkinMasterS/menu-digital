/**
 * 🔍 DEBUG SCHOOL_ID - Verificar formato do school_id
 * Investigar se o school_id está sendo enviado como UUID ou número
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSchoolId() {
  console.log('🔍 === DEBUG SCHOOL_ID ===\n');

  try {
    // 1. Verificar usuários e seus school_ids
    console.log('1️⃣ Verificando usuários auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários:', authError);
      return;
    }

    console.log(`📊 Total de usuários: ${authUsers.users.length}\n`);

    authUsers.users.forEach((user, index) => {
      const appMeta = user.app_metadata || {};
      const userMeta = user.user_metadata || {};
      
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${appMeta.role || userMeta.role || 'N/A'}`);
      console.log(`   School ID (app_metadata): ${appMeta.school_id || 'N/A'}`);
      console.log(`   School ID (user_metadata): ${userMeta.school_id || 'N/A'}`);
      console.log(`   School ID Type (app): ${typeof appMeta.school_id}`);
      console.log(`   School ID Type (user): ${typeof userMeta.school_id}`);
      
      // Verificar se é UUID válido
      const schoolId = appMeta.school_id || userMeta.school_id;
      if (schoolId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(schoolId);
        console.log(`   É UUID válido: ${isUUID}`);
      }
      console.log('');
    });

    // 2. Verificar escolas disponíveis
    console.log('\n2️⃣ Verificando escolas disponíveis...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, slug')
      .limit(10);

    if (schoolsError) {
      console.error('❌ Erro ao buscar escolas:', schoolsError);
    } else {
      console.log(`📊 Total de escolas: ${schools.length}\n`);
      schools.forEach((school, index) => {
        console.log(`🏫 Escola ${index + 1}:`);
        console.log(`   ID: ${school.id}`);
        console.log(`   Nome: ${school.name}`);
        console.log(`   Slug: ${school.slug}`);
        console.log(`   ID Type: ${typeof school.id}`);
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(school.id);
        console.log(`   É UUID válido: ${isUUID}`);
        console.log('');
      });
    }

    // 3. Verificar guilds existentes
    console.log('\n3️⃣ Verificando guilds Discord existentes...');
    const { data: guilds, error: guildsError } = await supabase
      .from('discord_guilds')
      .select('*')
      .limit(5);

    if (guildsError) {
      console.error('❌ Erro ao buscar guilds:', guildsError);
    } else {
      console.log(`📊 Total de guilds: ${guilds.length}\n`);
      guilds.forEach((guild, index) => {
        console.log(`🎮 Guild ${index + 1}:`);
        console.log(`   Guild ID: ${guild.guild_id}`);
        console.log(`   Nome: ${guild.guild_name}`);
        console.log(`   School ID: ${guild.school_id}`);
        console.log(`   School ID Type: ${typeof guild.school_id}`);
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guild.school_id);
        console.log(`   É UUID válido: ${isUUID}`);
        console.log('');
      });
    }

    // 4. Teste de inserção com dados corretos
    console.log('\n4️⃣ Testando inserção com school_id correto...');
    
    if (schools && schools.length > 0) {
      const testSchoolId = schools[0].id; // Usar o primeiro school_id válido
      console.log(`🧪 Testando com school_id: ${testSchoolId}`);
      
      const testGuildData = {
        guild_id: '123456789012345678', // Guild ID de teste
        guild_name: 'Servidor de Teste - Debug',
        school_id: testSchoolId
      };
      
      console.log('📤 Dados de teste:', testGuildData);
      
      const { data: insertResult, error: insertError } = await supabase
        .from('discord_guilds')
        .insert([testGuildData])
        .select();
      
      if (insertError) {
        console.error('❌ Erro na inserção de teste:', insertError);
      } else {
        console.log('✅ Inserção de teste bem-sucedida:', insertResult);
        
        // Limpar dados de teste
        await supabase
          .from('discord_guilds')
          .delete()
          .eq('guild_id', '123456789012345678');
        console.log('🧹 Dados de teste removidos');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }

  console.log('\n🔍 === FIM DEBUG SCHOOL_ID ===');
}

debugSchoolId();