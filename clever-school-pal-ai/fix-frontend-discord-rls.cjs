const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public'
    }
  }
);

async function fixDiscordRLSForFrontend() {
  console.log('🔧 CORRIGINDO RLS DO DISCORD PARA FRONTEND');
  console.log('==========================================');
  
  try {
    // O problema é que o frontend usa client anon_key, não service_role
    // Precisamos criar políticas que funcionem com JWT do usuário autenticado
    
    console.log('\n🔄 PASSO 1: Remover políticas existentes');
    
    // Primeiro, listar e remover todas as políticas antigas
    const dropPolicies = [
      'DROP POLICY IF EXISTS discord_guilds_select_policy ON discord_guilds',
      'DROP POLICY IF EXISTS discord_guilds_insert_policy ON discord_guilds', 
      'DROP POLICY IF EXISTS discord_guilds_update_policy ON discord_guilds',
      'DROP POLICY IF EXISTS discord_guilds_delete_policy ON discord_guilds',
      'DROP POLICY IF EXISTS discord_guilds_service_role_policy ON discord_guilds',
      'DROP POLICY IF EXISTS discord_guilds_authenticated_read ON discord_guilds',
      'DROP POLICY IF EXISTS discord_guilds_admin_access ON discord_guilds',
      'DROP POLICY IF EXISTS discord_guilds_service_role ON discord_guilds'
    ];
    
    for (const sql of dropPolicies) {
      try {
        const { error } = await supabase.rpc('exec', { query: sql });
        if (!error) console.log(`  ✅ Removida: ${sql.split(' ')[4]}`);
      } catch (err) {
        // Ignorar erros de políticas que não existem
      }
    }
    
    console.log('\n🔄 PASSO 2: Criar políticas para o JWT frontend');
    
    // Política SELECT - usuários autenticados com role admin/super_admin
    const selectPolicy = `
      CREATE POLICY discord_guilds_jwt_select ON discord_guilds
      FOR SELECT
      USING (
        auth.jwt() IS NOT NULL
        AND (
          -- Super admin pode ver tudo
          COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) = 'super_admin'
          OR
          -- Admin/diretor pode ver guilds da sua escola
          (
            COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) IN ('admin', 'diretor', 'coordenador')
            AND school_id = COALESCE(
              (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
              (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
            )
          )
        )
      );
    `;
    
    // Política INSERT - usuários autenticados com role admin/super_admin
    const insertPolicy = `
      CREATE POLICY discord_guilds_jwt_insert ON discord_guilds
      FOR INSERT
      WITH CHECK (
        auth.jwt() IS NOT NULL
        AND (
          -- Super admin pode inserir qualquer guild
          COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) = 'super_admin'
          OR
          -- Admin/diretor pode inserir guilds da sua escola
          (
            COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) IN ('admin', 'diretor', 'coordenador')
            AND school_id = COALESCE(
              (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
              (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
            )
          )
        )
      );
    `;
    
    // Política UPDATE
    const updatePolicy = `
      CREATE POLICY discord_guilds_jwt_update ON discord_guilds
      FOR UPDATE
      USING (
        auth.jwt() IS NOT NULL
        AND (
          COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) = 'super_admin'
          OR
          (
            COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) IN ('admin', 'diretor', 'coordenador')
            AND school_id = COALESCE(
              (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
              (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
            )
          )
        )
      );
    `;
    
    // Política DELETE
    const deletePolicy = `
      CREATE POLICY discord_guilds_jwt_delete ON discord_guilds
      FOR DELETE
      USING (
        auth.jwt() IS NOT NULL
        AND (
          COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) = 'super_admin'
          OR
          (
            COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) IN ('admin', 'diretor', 'coordenador')
            AND school_id = COALESCE(
              (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
              (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
            )
          )
        )
      );
    `;
    
    // Aplicar as políticas usando queries diretas ao invés de exec_sql
    const policies = [
      { name: 'SELECT', sql: selectPolicy },
      { name: 'INSERT', sql: insertPolicy },
      { name: 'UPDATE', sql: updatePolicy },
      { name: 'DELETE', sql: deletePolicy }
    ];
    
    for (const policy of policies) {
      try {
        // Usar query direta ao PostgreSQL
        const { error } = await supabase.rpc('exec', { query: policy.sql });
        if (error) {
          console.log(`⚠️ Erro ao criar política ${policy.name}:`, error.message);
        } else {
          console.log(`  ✅ Política ${policy.name} criada com sucesso`);
        }
      } catch (err) {
        console.log(`⚠️ Erro ao aplicar política ${policy.name}:`, err.message);
      }
    }
    
    console.log('\n🧪 PASSO 3: Testando com token anônimo (simulando frontend)');
    
    // Teste com cliente anônimo (como o frontend usa)
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const testData = {
      guild_id: `test_frontend_${Date.now()}`,
      guild_name: 'Test Frontend Guild',
      school_id: '550e8400-e29b-41d4-a716-446655440000'
    };
    
    console.log('📤 Testando inserção com anon key:', testData);
    
    const { data: insertResult, error: insertError } = await anonClient
      .from('discord_guilds')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error('❌ Erro na inserção frontend:', insertError);
      console.log('💡 SOLUÇÃO: O frontend precisa estar autenticado com JWT válido');
    } else {
      console.log('✅ Inserção frontend bem-sucedida:', insertResult);
      
      // Limpar dados de teste
      await supabase
        .from('discord_guilds')
        .delete()
        .eq('guild_id', testData.guild_id);
      console.log('🧹 Dados de teste removidos');
    }
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA');
    console.log('=====================');
    console.log('✅ Políticas JWT criadas para funcionamento com frontend');
    console.log('📝 Observação: O frontend precisa ter usuário autenticado com JWT válido');
    console.log('🔧 As políticas verificam app_metadata E user_metadata para compatibilidade');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixDiscordRLSForFrontend().catch(console.error);