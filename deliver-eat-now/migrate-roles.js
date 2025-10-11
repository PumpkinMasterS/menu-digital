import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://misswwtaysshbnnsjhtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pc3N3d3RheXNzaGJubnNqaHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MTczMjYsImV4cCI6MjA2NzI5MzMyNn0.fm4pHr65zETB3zcQE--faMicdWr7pSDCatTKfMy0suE';

// Criar cliente Supabase com a service role key para poder fazer alterações
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateRoles() {
  console.log('🔄 Iniciando migração de roles...');
  
  try {
    // 1. Verificar usuários com platform_admin
    console.log('\n📊 Verificando usuários com role platform_admin...');
    const { data: adminUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'platform_admin');
    
    if (fetchError) {
      console.error('❌ Erro ao buscar usuários:', fetchError);
      return;
    }
    
    console.log(`📋 Encontrados ${adminUsers.length} usuários com platform_admin:`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
    });
    
    if (adminUsers.length === 0) {
      console.log('✅ Nenhum usuário encontrado para migrar.');
      return;
    }
    
    // 2. Atualizar usuários para platform_owner
    console.log('\n🔄 Atualizando usuários para platform_owner...');
    const { data: updatedUsers, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'platform_owner' })
      .eq('role', 'platform_admin')
      .select('id, email, role');
    
    if (updateError) {
      console.error('❌ Erro ao atualizar usuários:', updateError);
      return;
    }
    
    console.log(`✅ ${updatedUsers.length} usuários atualizados com sucesso:`);
    updatedUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.id}) -> ${user.role}`);
    });
    
    // 3. Verificar se há tabela user_roles
    console.log('\n🔍 Verificando tabela user_roles...');
    const { data: userRolesTable, error: tableError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST114') {
      console.log('ℹ️ Tabela user_roles não existe, pulando migração de user_roles.');
    } else if (tableError) {
      console.error('❌ Erro ao verificar tabela user_roles:', tableError);
    } else {
      console.log('📋 Tabela user_roles encontrada, verificando registros...');
      
      // 4. Atualizar user_roles se existir
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'platform_owner');
      
      if (rolesError) {
        console.error('❌ Erro ao buscar role platform_owner:', rolesError);
        return;
      }
      
      if (!rolesData || rolesData.length === 0) {
        console.log('❌ Role platform_owner não encontrado na tabela roles.');
        return;
      }
      
      const platformOwnerId = rolesData[0].id;
      console.log(`📋 Role platform_owner encontrado com ID: ${platformOwnerId}`);
      
      // Buscar role platform_admin
      const { data: platformAdminRole, error: adminRoleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'platform_admin');
      
      if (adminRoleError) {
        console.error('❌ Erro ao buscar role platform_admin:', adminRoleError);
        return;
      }
      
      if (!platformAdminRole || platformAdminRole.length === 0) {
        console.log('ℹ️ Role platform_admin não encontrado na tabela roles.');
      } else {
        const platformAdminId = platformAdminRole[0].id;
        console.log(`📋 Role platform_admin encontrado com ID: ${platformAdminId}`);
        
        // Atualizar user_roles
        const { data: updatedUserRoles, error: userRolesUpdateError } = await supabase
          .from('user_roles')
          .update({ role_id: platformOwnerId })
          .eq('role_id', platformAdminId);
        
        if (userRolesUpdateError) {
          console.error('❌ Erro ao atualizar user_roles:', userRolesUpdateError);
        } else {
          console.log(`✅ ${updatedUserRoles.length} registros em user_roles atualizados.`);
        }
      }
    }
    
    // 5. Verificação final
    console.log('\n🔍 Verificação final...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'platform_admin');
    
    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError);
    } else {
      if (finalCheck.length === 0) {
        console.log('✅ Migração concluída com sucesso! Nenhum usuário com platform_admin restante.');
      } else {
        console.log(`⚠️ Ainda existem ${finalCheck.length} usuários com platform_admin.`);
      }
    }
    
    console.log('\n🎉 Migração de roles concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
}

// Executar migração
migrateRoles();
