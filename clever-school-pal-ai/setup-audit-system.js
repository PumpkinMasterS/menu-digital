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

async function executeSQL(query, description) {
  try {
    console.log(`🔧 ${description}...`);
    const { data, error } = await supabase
      .from('_temp_sql_execution')
      .select('*')
      .limit(0); // This will fail but we can catch it
    
    // Since we can't execute raw SQL directly, let's try a different approach
    // We'll use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ ${description} - Erro:`, errorText);
      return false;
    }
    
    console.log(`✅ ${description} - Sucesso`);
    return true;
  } catch (error) {
    console.log(`⚠️ ${description} - Erro:`, error.message);
    return false;
  }
}

async function setupAuditSystem() {
  console.log('🔧 Configurando sistema de auditoria...');
  
  // 1. Criar tabela de auditoria
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.user_audit_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
        user_id UUID,
        email TEXT,
        old_data JSONB,
        new_data JSONB,
        changed_by UUID,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT
    );
  `, 'Criando tabela user_audit_log');
  
  // 2. Habilitar RLS
  await executeSQL(`
    ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow audit log operations" ON user_audit_log;
    CREATE POLICY "Allow audit log operations" ON user_audit_log
        FOR ALL USING (true);
  `, 'Habilitando RLS');
  
  // 3. Criar função de auditoria
  await executeSQL(`
    CREATE OR REPLACE FUNCTION audit_admin_users_changes()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'DELETE' THEN
            INSERT INTO user_audit_log (
                table_name,
                operation,
                user_id,
                email,
                old_data,
                changed_by
            ) VALUES (
                'admin_users',
                'DELETE',
                OLD.user_id,
                OLD.email,
                row_to_json(OLD)::jsonb,
                (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email' LIMIT 1)
            );
            RETURN OLD;
        END IF;
        
        IF TG_OP = 'INSERT' THEN
            INSERT INTO user_audit_log (
                table_name,
                operation,
                user_id,
                email,
                new_data,
                changed_by
            ) VALUES (
                'admin_users',
                'INSERT',
                NEW.user_id,
                NEW.email,
                row_to_json(NEW)::jsonb,
                (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email' LIMIT 1)
            );
            RETURN NEW;
        END IF;
        
        IF TG_OP = 'UPDATE' THEN
            INSERT INTO user_audit_log (
                table_name,
                operation,
                user_id,
                email,
                old_data,
                new_data,
                changed_by
            ) VALUES (
                'admin_users',
                'UPDATE',
                NEW.user_id,
                NEW.email,
                row_to_json(OLD)::jsonb,
                row_to_json(NEW)::jsonb,
                (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email' LIMIT 1)
            );
            RETURN NEW;
        END IF;
        
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `, 'Criando função de auditoria');
  
  // 4. Criar trigger
  await executeSQL(`
    DROP TRIGGER IF EXISTS audit_admin_users_trigger ON admin_users;
    CREATE TRIGGER audit_admin_users_trigger
        AFTER INSERT OR UPDATE OR DELETE ON admin_users
        FOR EACH ROW EXECUTE FUNCTION audit_admin_users_changes();
  `, 'Criando trigger');
  
  // 5. Verificar utilizadores atuais
  console.log('\n🔍 Verificando utilizadores atuais...');
  
  try {
    // Verificar auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('⚠️ Erro ao listar auth.users:', authError.message);
    } else {
      console.log(`📊 Utilizadores em auth.users: ${authUsers.users.length}`);
      authUsers.users.forEach(user => {
        console.log(`   • ${user.email} (ID: ${user.id})`);
      });
    }
    
    // Verificar admin_users
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*');
      
    if (adminError) {
      console.log('⚠️ Erro ao listar admin_users:', adminError.message);
    } else {
      console.log(`\n📊 Utilizadores em admin_users: ${adminUsers.length}`);
      adminUsers.forEach(user => {
        console.log(`   • ${user.email} (Role: ${user.role}, User ID: ${user.user_id})`);
      });
    }
    
    // Verificar integridade
    console.log('\n🔍 Verificando integridade...');
    if (authUsers && adminUsers) {
      const authUserIds = new Set(authUsers.users.map(u => u.id));
      const orphanedAdminUsers = adminUsers.filter(au => !authUserIds.has(au.user_id));
      
      if (orphanedAdminUsers.length > 0) {
        console.log('⚠️ Utilizadores órfãos encontrados em admin_users:');
        orphanedAdminUsers.forEach(user => {
          console.log(`   • ${user.email} (ID: ${user.user_id}) - existe em admin_users mas não em auth.users`);
        });
      } else {
        console.log('✅ Nenhum utilizador órfão encontrado');
      }
    }
    
  } catch (error) {
    console.log('⚠️ Erro ao verificar utilizadores:', error.message);
  }
  
  console.log('\n🎉 Verificação concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('   1. Recriar utilizador whishwher@gmail.com se necessário');
  console.log('   2. Monitorizar logs de auditoria para futuras alterações');
  console.log('   3. Investigar logs do Supabase Dashboard para identificar causa raiz');
}

setupAuditSystem();