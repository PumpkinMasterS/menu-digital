-- ================================================================
-- SISTEMA DE AUDITORIA PARA PREVENIR DESAPARECIMENTO DE UTILIZADORES
-- ================================================================

-- 1. Criar tabela de auditoria para rastrear alterações
CREATE TABLE IF NOT EXISTS public.user_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id UUID,
    email TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 2. Habilitar RLS na tabela de auditoria
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Política para permitir inserção e leitura por utilizadores autenticados
CREATE POLICY "Allow audit log operations" ON user_audit_log
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 4. Função para registar alterações na tabela admin_users
CREATE OR REPLACE FUNCTION audit_admin_users_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Registar operação DELETE
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
            auth.uid()
        );
        RETURN OLD;
    END IF;
    
    -- Registar operação INSERT
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
            auth.uid()
        );
        RETURN NEW;
    END IF;
    
    -- Registar operação UPDATE
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
            auth.uid()
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger para auditoria na tabela admin_users
DROP TRIGGER IF EXISTS audit_admin_users_trigger ON admin_users;
CREATE TRIGGER audit_admin_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION audit_admin_users_changes();

-- 6. Função para auditoria da tabela auth.users (se possível)
CREATE OR REPLACE FUNCTION audit_auth_users_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Registar operação DELETE
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.user_audit_log (
            table_name,
            operation,
            user_id,
            email,
            old_data
        ) VALUES (
            'auth.users',
            'DELETE',
            OLD.id,
            OLD.email,
            jsonb_build_object(
                'id', OLD.id,
                'email', OLD.email,
                'created_at', OLD.created_at,
                'deleted_at', NOW()
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função para verificar integridade dos utilizadores
CREATE OR REPLACE FUNCTION check_user_integrity()
RETURNS TABLE (
    issue_type TEXT,
    user_email TEXT,
    auth_user_id UUID,
    admin_user_id UUID,
    description TEXT
) AS $$
BEGIN
    -- Utilizadores em admin_users sem correspondência em auth.users
    RETURN QUERY
    SELECT 
        'ORPHANED_ADMIN_USER'::TEXT,
        au.email,
        au.user_id,
        au.id,
        'Utilizador existe em admin_users mas não em auth.users'::TEXT
    FROM admin_users au
    LEFT JOIN auth.users u ON au.user_id = u.id
    WHERE u.id IS NULL;
    
    -- Utilizadores em auth.users sem correspondência em admin_users (se aplicável)
    RETURN QUERY
    SELECT 
        'MISSING_ADMIN_USER'::TEXT,
        u.email,
        u.id,
        NULL::UUID,
        'Utilizador existe em auth.users mas não em admin_users'::TEXT
    FROM auth.users u
    LEFT JOIN admin_users au ON u.id = au.user_id
    WHERE au.user_id IS NULL
    AND u.email LIKE '%@%'; -- Filtrar emails válidos
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função para listar logs de auditoria recentes
CREATE OR REPLACE FUNCTION get_recent_user_audit_logs(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    log_id UUID,
    table_name TEXT,
    operation TEXT,
    user_email TEXT,
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ual.id,
        ual.table_name,
        ual.operation,
        ual.email,
        ual.changed_at,
        u.email as changed_by_email
    FROM user_audit_log ual
    LEFT JOIN auth.users u ON ual.changed_by = u.id
    WHERE ual.changed_at >= NOW() - INTERVAL '1 day' * days_back
    ORDER BY ual.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Conceder permissões
GRANT ALL ON user_audit_log TO authenticated;
GRANT ALL ON user_audit_log TO service_role;
GRANT EXECUTE ON FUNCTION check_user_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_user_audit_logs(INTEGER) TO authenticated;

-- 10. Comentários explicativos
COMMENT ON TABLE user_audit_log IS 'Tabela de auditoria para rastrear alterações nas tabelas de utilizadores';
COMMENT ON FUNCTION audit_admin_users_changes() IS 'Função trigger para auditar alterações na tabela admin_users';
COMMENT ON FUNCTION check_user_integrity() IS 'Função para verificar integridade entre auth.users e admin_users';
COMMENT ON FUNCTION get_recent_user_audit_logs(INTEGER) IS 'Função para obter logs de auditoria recentes';

SELECT 'Sistema de auditoria criado com sucesso!' as status;