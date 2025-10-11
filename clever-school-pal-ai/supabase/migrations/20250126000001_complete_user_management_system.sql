-- ====================================
-- SISTEMA COMPLETO DE GESTÃO DE UTILIZADORES
-- Version: 2.0 - Professional Grade
-- Date: 2025-01-26
-- ====================================

-- 1. HARD DELETE USER - Delete completo (auth.users + admin_users)
CREATE OR REPLACE FUNCTION hard_delete_user_admin(p_user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    admin_record admin_users%ROWTYPE;
BEGIN
    -- Verificar se utilizador existe
    SELECT * INTO user_record FROM auth.users WHERE email = p_user_email;
    SELECT * INTO admin_record FROM admin_users WHERE email = p_user_email;

    IF NOT FOUND AND admin_record.id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Utilizador não encontrado'
        );
    END IF;

    -- Verificar se não é super_admin
    IF (user_record.raw_app_meta_data->>'role') = 'super_admin' OR admin_record.role = 'super_admin' THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Não é possível eliminar super administradores'
        );
    END IF;

    -- Delete completo de ambas as tabelas
    DELETE FROM auth.users WHERE email = p_user_email;
    DELETE FROM admin_users WHERE email = p_user_email;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Utilizador eliminado completamente do sistema',
        'deleted_email', p_user_email
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 2. UPDATE USER COMPLETE - Edição completa de utilizadores
CREATE OR REPLACE FUNCTION update_user_admin(
    p_old_email TEXT,
    p_new_email TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_school_id UUID DEFAULT NULL,
    p_school_name TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    admin_record admin_users%ROWTYPE;
    new_app_metadata JSONB;
    new_user_metadata JSONB;
BEGIN
    -- Buscar registros existentes
    SELECT * INTO user_record FROM auth.users WHERE email = p_old_email;
    SELECT * INTO admin_record FROM admin_users WHERE email = p_old_email;

    IF NOT FOUND AND admin_record.id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Utilizador não encontrado'
        );
    END IF;

    -- Verificar se novo email já existe (se foi fornecido)
    IF p_new_email IS NOT NULL AND p_new_email != p_old_email THEN
        IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_new_email) OR 
           EXISTS (SELECT 1 FROM admin_users WHERE email = p_new_email) THEN
            RETURN JSON_BUILD_OBJECT(
                'success', false,
                'error', 'Novo email já está em uso'
            );
        END IF;
    END IF;

    -- Construir novos metadados
    new_app_metadata := COALESCE(user_record.raw_app_meta_data, '{}'::jsonb);
    new_user_metadata := COALESCE(user_record.raw_user_meta_data, '{}'::jsonb);

    -- Atualizar metadados conforme parâmetros fornecidos
    IF p_role IS NOT NULL THEN
        new_app_metadata := new_app_metadata || jsonb_build_object('role', p_role);
    END IF;

    IF p_school_id IS NOT NULL THEN
        new_app_metadata := new_app_metadata || jsonb_build_object('school_id', p_school_id);
    END IF;

    IF p_name IS NOT NULL THEN
        new_user_metadata := new_user_metadata || jsonb_build_object('name', p_name);
    END IF;

    IF p_school_name IS NOT NULL THEN
        new_user_metadata := new_user_metadata || jsonb_build_object('school_name', p_school_name);
    END IF;

    -- Atualizar auth.users se existir
    IF user_record.id IS NOT NULL THEN
        UPDATE auth.users 
        SET 
            email = COALESCE(p_new_email, email),
            raw_app_meta_data = new_app_metadata,
            raw_user_meta_data = new_user_metadata,
            updated_at = NOW(),
            email_confirmed_at = CASE 
                WHEN p_is_active = false THEN NULL 
                WHEN p_is_active = true THEN COALESCE(email_confirmed_at, NOW())
                ELSE email_confirmed_at 
            END
        WHERE email = p_old_email;
    END IF;

    -- Atualizar admin_users se existir
    IF admin_record.id IS NOT NULL THEN
        UPDATE admin_users 
        SET 
            email = COALESCE(p_new_email, email),
            name = COALESCE(p_name, name),
            role = COALESCE(p_role, role),
            school_id = COALESCE(p_school_id, school_id),
            is_active = COALESCE(p_is_active, is_active),
            updated_at = NOW()
        WHERE email = p_old_email;
    END IF;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Utilizador atualizado com sucesso',
        'updated_email', COALESCE(p_new_email, p_old_email)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 3. UPDATE SCHOOL USERS - Atualizar diretor/coordenador de uma escola
CREATE OR REPLACE FUNCTION update_school_users(
    p_school_id UUID,
    p_director_email TEXT DEFAULT NULL,
    p_director_name TEXT DEFAULT NULL,
    p_coordinator_email TEXT DEFAULT NULL,
    p_coordinator_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    school_record schools%ROWTYPE;
    director_updated BOOLEAN := false;
    coordinator_updated BOOLEAN := false;
    result_message TEXT := '';
BEGIN
    -- Verificar se escola existe
    SELECT * INTO school_record FROM schools WHERE id = p_school_id;
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Escola não encontrada'
        );
    END IF;

    -- Atualizar diretor se fornecido
    IF p_director_email IS NOT NULL THEN
        UPDATE auth.users 
        SET 
            raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', p_director_name),
            updated_at = NOW()
        WHERE email = p_director_email 
        AND raw_app_meta_data->>'role' = 'diretor'
        AND raw_app_meta_data->>'school_id' = p_school_id::TEXT;

        UPDATE admin_users 
        SET 
            name = COALESCE(p_director_name, name),
            updated_at = NOW()
        WHERE email = p_director_email 
        AND role = 'diretor'
        AND school_id = p_school_id;

        IF FOUND THEN
            director_updated := true;
            result_message := result_message || 'Diretor atualizado. ';
        END IF;
    END IF;

    -- Atualizar coordenador se fornecido
    IF p_coordinator_email IS NOT NULL THEN
        UPDATE auth.users 
        SET 
            raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', p_coordinator_name),
            updated_at = NOW()
        WHERE email = p_coordinator_email 
        AND raw_app_meta_data->>'role' = 'coordenador'
        AND raw_app_meta_data->>'school_id' = p_school_id::TEXT;

        UPDATE admin_users 
        SET 
            name = COALESCE(p_coordinator_name, name),
            updated_at = NOW()
        WHERE email = p_coordinator_email 
        AND role = 'coordenador'
        AND school_id = p_school_id;

        IF FOUND THEN
            coordinator_updated := true;
            result_message := result_message || 'Coordenador atualizado. ';
        END IF;
    END IF;

    IF NOT director_updated AND NOT coordinator_updated THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Nenhum utilizador foi atualizado. Verifique os emails fornecidos.'
        );
    END IF;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', TRIM(result_message),
        'school_id', p_school_id,
        'director_updated', director_updated,
        'coordinator_updated', coordinator_updated
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 4. CREATE USER IN SCHOOL - Criar utilizador diretamente numa escola
CREATE OR REPLACE FUNCTION create_user_in_school(
    p_school_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_role TEXT,
    p_password TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    school_record schools%ROWTYPE;
    new_password TEXT;
    result JSON;
BEGIN
    -- Verificar se escola existe
    SELECT * INTO school_record FROM schools WHERE id = p_school_id;
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Escola não encontrada'
        );
    END IF;

    -- Validar role
    IF p_role NOT IN ('diretor', 'coordenador') THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Role deve ser diretor ou coordenador'
        );
    END IF;

    -- Verificar se email já existe
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) OR 
       EXISTS(SELECT 1 FROM admin_users WHERE email = p_email) THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Email já está em uso no sistema'
        );
    END IF;

    -- Gerar password se não fornecida
    new_password := COALESCE(p_password, p_role || '123');

    -- Usar função existente para criar o utilizador
    SELECT * INTO result FROM create_school_user_admin(
        p_email, 
        new_password, 
        p_name, 
        p_role, 
        p_school_id, 
        school_record.name
    );

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 5. TOGGLE USER STATUS - Ativar/Desativar utilizador
CREATE OR REPLACE FUNCTION toggle_user_status(
    p_user_email TEXT,
    p_activate BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    admin_record admin_users%ROWTYPE;
    action_text TEXT;
BEGIN
    -- Buscar utilizador
    SELECT * INTO user_record FROM auth.users WHERE email = p_user_email;
    SELECT * INTO admin_record FROM admin_users WHERE email = p_user_email;

    IF NOT FOUND AND admin_record.id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Utilizador não encontrado'
        );
    END IF;

    action_text := CASE WHEN p_activate THEN 'ativado' ELSE 'desativado' END;

    -- Atualizar auth.users
    IF user_record.id IS NOT NULL THEN
        UPDATE auth.users 
        SET 
            email_confirmed_at = CASE 
                WHEN p_activate THEN COALESCE(email_confirmed_at, NOW()) 
                ELSE NULL 
            END,
            updated_at = NOW()
        WHERE email = p_user_email;
    END IF;

    -- Atualizar admin_users
    IF admin_record.id IS NOT NULL THEN
        UPDATE admin_users 
        SET 
            is_active = p_activate,
            updated_at = NOW()
        WHERE email = p_user_email;
    END IF;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Utilizador ' || action_text || ' com sucesso',
        'user_email', p_user_email,
        'is_active', p_activate
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 6. BULK USER OPERATIONS - Operações em lote
CREATE OR REPLACE FUNCTION bulk_user_operation(
    p_operation TEXT,
    p_user_emails TEXT[],
    p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    email_item TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    results JSONB := '[]'::jsonb;
    operation_result JSON;
BEGIN
    FOREACH email_item IN ARRAY p_user_emails
    LOOP
        BEGIN
            CASE p_operation
                WHEN 'activate' THEN
                    SELECT * INTO operation_result FROM toggle_user_status(email_item, true);
                WHEN 'deactivate' THEN
                    SELECT * INTO operation_result FROM toggle_user_status(email_item, false);
                WHEN 'delete' THEN
                    SELECT * INTO operation_result FROM delete_user_admin(email_item);
                WHEN 'hard_delete' THEN
                    SELECT * INTO operation_result FROM hard_delete_user_admin(email_item);
                ELSE
                    operation_result := JSON_BUILD_OBJECT(
                        'success', false, 
                        'error', 'Operação não suportada: ' || p_operation
                    );
            END CASE;

            -- Adicionar resultado ao array
            results := results || jsonb_build_object(
                'email', email_item,
                'success', (operation_result->>'success')::boolean,
                'message', operation_result->>'message',
                'error', operation_result->>'error'
            );

            IF (operation_result->>'success')::boolean THEN
                success_count := success_count + 1;
            ELSE
                error_count := error_count + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            results := results || jsonb_build_object(
                'email', email_item,
                'success', false,
                'error', SQLERRM
            );
            error_count := error_count + 1;
        END;
    END LOOP;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'operation', p_operation,
        'total_processed', array_length(p_user_emails, 1),
        'success_count', success_count,
        'error_count', error_count,
        'results', results
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 7. GET USER AUDIT LOG - Histórico de alterações do utilizador
CREATE OR REPLACE FUNCTION get_user_audit_log(
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    action_type TEXT,
    table_name TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_by TEXT,
    performed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.action_type,
        sal.table_name,
        sal.old_values,
        sal.new_values,
        sal.performed_by,
        sal.performed_at
    FROM security_audit_log sal
    WHERE sal.old_values->>'email' = p_user_email 
       OR sal.new_values->>'email' = p_user_email
       OR sal.new_values->>'old_email' = p_user_email
    ORDER BY sal.performed_at DESC
    LIMIT p_limit;
END;
$$;

-- Comentários finais
COMMENT ON FUNCTION hard_delete_user_admin IS 'Delete completo de utilizador de auth.users e admin_users';
COMMENT ON FUNCTION update_user_admin IS 'Edição completa de utilizador com sincronização entre auth.users e admin_users';
COMMENT ON FUNCTION update_school_users IS 'Atualizar diretor e coordenador de uma escola específica';
COMMENT ON FUNCTION create_user_in_school IS 'Criar novo utilizador diretamente numa escola existente';
COMMENT ON FUNCTION toggle_user_status IS 'Ativar ou desativar utilizador';
COMMENT ON FUNCTION bulk_user_operation IS 'Operações em lote para múltiplos utilizadores';
COMMENT ON FUNCTION get_user_audit_log IS 'Histórico de alterações de um utilizador específico'; 