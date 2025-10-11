const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createListAdminUsersFunction() {
  console.log('🔧 Criando função RPC list_admin_users...');
  
  try {
    // SQL para criar a função RPC
    const createFunctionSQL = `
      -- Criar função para listar usuários admin
      CREATE OR REPLACE FUNCTION public.list_admin_users()
      RETURNS TABLE (
        id uuid,
        email text,
        created_at timestamptz,
        role text,
        school_name text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          au.id,
          au.email,
          au.created_at,
          COALESCE(au.raw_user_meta_data->>'role', 'student') as role,
          COALESCE(s.name, 'Sem escola') as school_name
        FROM auth.users au
        LEFT JOIN public.schools s ON s.id = (au.raw_user_meta_data->>'school_id')::uuid
        WHERE COALESCE(au.raw_user_meta_data->>'role', 'student') IN ('super_admin', 'director')
        ORDER BY au.created_at DESC;
      END;
      $$;
      
      -- Conceder permissões
      GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
      GRANT EXECUTE ON FUNCTION public.list_admin_users() TO anon;
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    });
    
    if (error) {
      console.log('❌ Erro ao criar função via RPC, tentando método alternativo...');
      
      // Tentar criar a função diretamente
      const { error: directError } = await supabase
        .from('_dummy_table_that_does_not_exist')
        .select('*')
        .limit(0);
      
      console.log('📝 Execute este SQL manualmente no Supabase Dashboard:');
      console.log('\n' + '='.repeat(80));
      console.log(createFunctionSQL);
      console.log('='.repeat(80));
      
      console.log('\n📋 Instruções:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Cole e execute o SQL acima');
      console.log('4. A função list_admin_users() estará disponível para o frontend');
      
    } else {
      console.log('✅ Função list_admin_users criada com sucesso!');
    }
    
    // Testar a função
    console.log('\n🧪 Testando a função...');
    const { data: testData, error: testError } = await supabase
      .rpc('list_admin_users');
    
    if (testError) {
      console.log('❌ Erro ao testar função:', testError.message);
    } else {
      console.log(`✅ Função testada com sucesso! Retornou ${testData?.length || 0} usuários admin.`);
      if (testData && testData.length > 0) {
        console.log('👥 Usuários encontrados:');
        testData.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.school_name}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createListAdminUsersFunction();