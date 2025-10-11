import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateUserDeletion() {
  try {
    console.log('🔍 Investigando possíveis causas de eliminação de utilizadores...\n');
    
    // 1. Verificar políticas RLS na tabela admin_users
    console.log('1️⃣ Verificando políticas RLS na tabela admin_users:');
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'admin_users';
        `
      });
    
    if (rlsError) {
      console.log('   ⚠️ Não foi possível verificar políticas RLS:', rlsError.message);
    } else {
      console.log('   📋 Políticas encontradas:', rlsPolicies?.length || 0);
      if (rlsPolicies?.length > 0) {
        rlsPolicies.forEach(policy => {
          console.log(`   - ${policy.policyname}: ${policy.cmd} para ${policy.roles}`);
        });
      }
    }
    
    // 2. Verificar triggers na tabela admin_users
    console.log('\n2️⃣ Verificando triggers na tabela admin_users:');
    const { data: triggers, error: triggerError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            trigger_name,
            event_manipulation,
            action_timing,
            action_statement
          FROM information_schema.triggers 
          WHERE event_object_table = 'admin_users';
        `
      });
    
    if (triggerError) {
      console.log('   ⚠️ Não foi possível verificar triggers:', triggerError.message);
    } else {
      console.log('   🔧 Triggers encontrados:', triggers?.length || 0);
      if (triggers?.length > 0) {
        triggers.forEach(trigger => {
          console.log(`   - ${trigger.trigger_name}: ${trigger.event_manipulation} ${trigger.action_timing}`);
        });
      }
    }
    
    // 3. Verificar se há funções que podem eliminar utilizadores
    console.log('\n3️⃣ Verificando funções relacionadas com utilizadores:');
    const { data: functions, error: funcError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            routine_name,
            routine_type,
            routine_definition
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND (routine_name ILIKE '%user%' OR routine_name ILIKE '%admin%' OR routine_name ILIKE '%delete%')
          ORDER BY routine_name;
        `
      });
    
    if (funcError) {
      console.log('   ⚠️ Não foi possível verificar funções:', funcError.message);
    } else {
      console.log('   ⚙️ Funções encontradas:', functions?.length || 0);
      if (functions?.length > 0) {
        functions.forEach(func => {
          console.log(`   - ${func.routine_name} (${func.routine_type})`);
        });
      }
    }
    
    // 4. Verificar configurações de retenção de dados
    console.log('\n4️⃣ Verificando configurações da base de dados:');
    const { data: settings, error: settingsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT name, setting, unit, context 
          FROM pg_settings 
          WHERE name ILIKE '%retention%' OR name ILIKE '%cleanup%' OR name ILIKE '%vacuum%'
          ORDER BY name;
        `
      });
    
    if (settingsError) {
      console.log('   ⚠️ Não foi possível verificar configurações:', settingsError.message);
    } else {
      console.log('   ⚙️ Configurações relevantes:', settings?.length || 0);
      if (settings?.length > 0) {
        settings.forEach(setting => {
          console.log(`   - ${setting.name}: ${setting.setting} ${setting.unit || ''}`);
        });
      }
    }
    
    // 5. Verificar logs recentes (se disponíveis)
    console.log('\n5️⃣ Verificando atividade recente na tabela admin_users:');
    const { data: recentActivity, error: activityError } = await supabase
      .from('admin_users')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (activityError) {
      console.log('   ⚠️ Não foi possível verificar atividade recente:', activityError.message);
    } else {
      console.log('   📊 Utilizadores ativos recentes:', recentActivity?.length || 0);
      if (recentActivity?.length > 0) {
        recentActivity.forEach(user => {
          console.log(`   - ${user.email} (${user.role}) - Atualizado: ${user.updated_at}`);
        });
      }
    }
    
    console.log('\n📋 Resumo da investigação:');
    console.log('   ✅ Utilizador whiswher@gmail.com foi recriado com sucesso');
    console.log('   🔍 Verifique os logs do Supabase Dashboard para mais detalhes');
    console.log('   ⚠️ Considere implementar auditoria para rastrear alterações futuras');
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error.message);
  }
}

investigateUserDeletion();