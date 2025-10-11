-- ================================================================
-- MIGRAÇÃO CORRETIVA: SISTEMA DE LOGS E FUNÇÃO CHECK_USER_EXISTS
-- Data: 2025-01-27
-- Descrição: Corrigir estrutura dos logs + função em falta
-- ================================================================

-- 1. CRIAR FUNÇÃO CHECK_USER_EXISTS (estava em falta)
CREATE OR REPLACE FUNCTION check_user_exists(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_record auth.users%ROWTYPE;
    admin_user_record admin_users%ROWTYPE;
    user_exists BOOLEAN := false;
    user_info JSON;
BEGIN
    -- Buscar em auth.users
    SELECT * INTO auth_user_record FROM auth.users WHERE email = p_email;
    
    -- Buscar em admin_users
    SELECT * INTO admin_user_record FROM admin_users WHERE email = p_email;
    
    -- Verificar se existe em qualquer uma das tabelas
    IF auth_user_record.id IS NOT NULL OR admin_user_record.id IS NOT NULL THEN
        user_exists := true;
        
        user_info := JSON_BUILD_OBJECT(
            'email', p_email,
            'name', COALESCE(admin_user_record.name, auth_user_record.raw_user_meta_data->>'name', 'Sem nome'),
            'role', COALESCE(admin_user_record.role, auth_user_record.raw_app_meta_data->>'role'),
            'is_active', COALESCE(admin_user_record.is_active, auth_user_record.email_confirmed_at IS NOT NULL),
            'created_at', COALESCE(admin_user_record.created_at, auth_user_record.created_at),
            'found_in_auth', auth_user_record.id IS NOT NULL,
            'found_in_admin', admin_user_record.id IS NOT NULL
        );
    END IF;

    RETURN JSON_BUILD_OBJECT(
        'exists', user_exists,
        'user', CASE WHEN user_exists THEN user_info ELSE NULL END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'exists', false,
        'error', 'Erro ao verificar utilizador: ' || SQLERRM
    );
END;
$$;

-- 2. CORRIGIR FUNÇÃO CREATE_SCHOOL_USER_ADMIN - LOGS STRUCTURE
CREATE OR REPLACE FUNCTION create_school_user_admin(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role TEXT,
    p_school_id UUID,
    p_school_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    school_exists BOOLEAN;
BEGIN
    -- Log do início da operação
    RAISE NOTICE 'Criando utilizador: email=%, role=%, school_id=%', p_email, p_role, p_school_id;

    -- Validar role
    IF p_role NOT IN ('diretor', 'coordenador', 'super_admin') THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Role inválida. Deve ser: diretor, coordenador ou super_admin'
        );
    END IF;

    -- Para super_admin, school_id deve ser NULL
    IF p_role = 'super_admin' AND p_school_id IS NOT NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Super Admins não devem estar associados a uma escola específica'
        );
    END IF;

    -- Para outros roles, verificar se escola existe
    IF p_role != 'super_admin' THEN
        IF p_school_id IS NULL THEN
            RETURN JSON_BUILD_OBJECT(
                'success', false,
                'error', 'Roles diretor/coordenador devem estar associados a uma escola'
            );
        END IF;
        
        SELECT EXISTS(SELECT 1 FROM schools WHERE id = p_school_id) INTO school_exists;
        IF NOT school_exists THEN
            RETURN JSON_BUILD_OBJECT(
                'success', false,
                'error', 'Escola não encontrada'
            );
        END IF;
    END IF;

    -- Verificar se email já existe
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) OR 
       EXISTS(SELECT 1 FROM admin_users WHERE email = p_email) THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Email já está em uso no sistema'
        );
    END IF;

    -- Gerar ID único
    new_user_id := gen_random_uuid();

    -- 1. Criar utilizador em auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        JSON_BUILD_OBJECT(
            'role', p_role,
            'school_id', p_school_id,
            'provider', 'email'
        ),
        JSON_BUILD_OBJECT(
            'name', p_name,
            'school_name', COALESCE(p_school_name, 'Global')
        ),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );

    -- 2. Criar utilizador em admin_users (SINCRONIZAÇÃO)
    INSERT INTO admin_users (
        id,
        email,
        name,
        role,
        school_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        p_email,
        p_name,
        p_role,
        CASE WHEN p_role = 'super_admin' THEN NULL ELSE p_school_id END,
        true,
        NOW(),
        NOW()
    );

    -- Log da criação (ESTRUTURA CORRIGIDA)
    INSERT INTO system_logs (log_type, level, message, metadata)
    VALUES (
        'user_management',
        'info',
        'Utilizador criado com sucesso',
        jsonb_build_object(
            'action', 'create_user_success',
            'created_email', p_email,
            'role', p_role,
            'school_id', p_school_id,
            'school_name', p_school_name,
            'user_id', new_user_id,
            'created_by', current_setting('app.current_user_email', true),
            'timestamp', NOW()
        )
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'user_id', new_user_id,
        'email', p_email,
        'role', p_role,
        'school_id', p_school_id,
        'message', 'Utilizador criado e sincronizado com sucesso'
    );

EXCEPTION WHEN OTHERS THEN
    -- Log do erro (ESTRUTURA CORRIGIDA)
    INSERT INTO system_logs (log_type, level, message, metadata)
    VALUES (
        'user_management',
        'error',
        'Erro ao criar utilizador',
        jsonb_build_object(
            'action', 'create_user_error',
            'target_email', p_email,
            'error', SQLERRM,
            'role', p_role,
            'attempted_by', current_setting('app.current_user_email', true),
            'timestamp', NOW()
        )
    );

    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro ao criar utilizador: ' || SQLERRM
    );
END;
$$;

-- 3. CORRIGIR FUNÇÃO HARD_DELETE_USER_ADMIN - LOGS STRUCTURE
CREATE OR REPLACE FUNCTION hard_delete_user_admin(p_user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    admin_record admin_users%ROWTYPE;
    user_found BOOLEAN := false;
    admin_found BOOLEAN := false;
    analysis_result JSON;
    current_user_email TEXT;
BEGIN
    -- Obter utilizador atual para logs
    current_user_email := current_setting('app.current_user_email', true);
    
    -- Log do início da operação
    RAISE NOTICE 'Iniciando hard delete de: %', p_user_email;

    -- Primeiro, analisar dependências
    SELECT * INTO analysis_result FROM analyze_user_dependencies(p_user_email);
    
    -- Verificar se análise foi bem-sucedida
    IF NOT (analysis_result->>'success')::boolean THEN
        RETURN analysis_result;
    END IF;

    -- Verificar se pode ser eliminado
    IF NOT (analysis_result->>'can_delete')::boolean THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Eliminação bloqueada: ' || array_to_string(
                array(SELECT json_array_elements_text(analysis_result->'warnings')), 
                '. '
            ),
            'analysis', analysis_result
        );
    END IF;

    -- Buscar utilizador em ambas as tabelas
    SELECT * INTO user_record FROM auth.users WHERE email = p_user_email;
    user_found := FOUND;

    SELECT * INTO admin_record FROM admin_users WHERE email = p_user_email;
    admin_found := FOUND;

    -- Verificar se utilizador existe
    IF NOT user_found AND NOT admin_found THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Utilizador não encontrado'
        );
    END IF;

    -- Log da operação (ESTRUTURA CORRIGIDA)
    INSERT INTO system_logs (log_type, level, message, metadata)
    VALUES (
        'user_management',
        'warning',
        'Iniciando eliminação de utilizador',
        jsonb_build_object(
            'action', 'hard_delete_user_start',
            'target_email', p_user_email,
            'found_in_auth', user_found,
            'found_in_admin', admin_found,
            'target_role', COALESCE(admin_record.role, user_record.raw_app_meta_data->>'role'),
            'performed_by', current_user_email,
            'analysis', analysis_result,
            'timestamp', NOW()
        )
    );

    -- EXECUTAR ELIMINAÇÃO
    -- 1. Limpar dependências relacionadas (marcar como órfãos)
    IF user_found THEN
        -- Marcar contents como órfãos
        UPDATE contents 
        SET created_by = 'deleted_user_' || p_user_email
        WHERE created_by = user_record.id::text;

        -- Marcar media files como órfãos
        UPDATE media_files 
        SET uploaded_by = 'deleted_user_' || p_user_email
        WHERE uploaded_by = user_record.id::text;

        -- Limpar preferências (CASCADE automático)
        DELETE FROM admin_preferences WHERE admin_id = user_record.id;
    END IF;

    -- 2. Eliminar das tabelas principais
    DELETE FROM auth.users WHERE email = p_user_email;
    DELETE FROM admin_users WHERE email = p_user_email;

    -- Log final de sucesso (ESTRUTURA CORRIGIDA)
    INSERT INTO system_logs (log_type, level, message, metadata)
    VALUES (
        'user_management',
        'info',
        'Utilizador eliminado com sucesso',
        jsonb_build_object(
            'action', 'hard_delete_user_success',
            'deleted_email', p_user_email,
            'removed_from_auth', user_found,
            'removed_from_admin', admin_found,
            'dependencies_cleaned', true,
            'performed_by', current_user_email,
            'timestamp', NOW()
        )
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Utilizador eliminado completamente do sistema',
        'deleted_email', p_user_email,
        'removed_from_auth', user_found,
        'removed_from_admin', admin_found,
        'analysis', analysis_result
    );

EXCEPTION WHEN OTHERS THEN
    -- Log do erro (ESTRUTURA CORRIGIDA)
    INSERT INTO system_logs (log_type, level, message, metadata)
    VALUES (
        'user_management',
        'error',
        'Erro ao eliminar utilizador',
        jsonb_build_object(
            'action', 'hard_delete_user_error',
            'target_email', p_user_email,
            'error', SQLERRM,
            'performed_by', current_user_email,
            'timestamp', NOW()
        )
    );

    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro interno ao eliminar utilizador: ' || SQLERRM
    );
END;
$$;

-- 4. GRANT PERMISSIONS PARA NOVA FUNÇÃO
GRANT EXECUTE ON FUNCTION check_user_exists TO authenticated;

-- 5. COMENTÁRIOS
COMMENT ON FUNCTION check_user_exists IS 'Verifica se um email já existe no sistema (auth.users ou admin_users)';

-- 6. INSERIR LOG DA MIGRAÇÃO
INSERT INTO system_logs (log_type, level, message, metadata)
VALUES (
    'system_migration',
    'info',
    'Migração de correção aplicada com sucesso',
    jsonb_build_object(
        'migration', '20250127000003_fix_system_logs_and_add_check_user_exists',
        'changes', ARRAY[
            'Criada função check_user_exists',
            'Corrigida estrutura de logs em create_school_user_admin',
            'Corrigida estrutura de logs em hard_delete_user_admin',
            'Aplicadas permissões adequadas'
        ],
        'applied_at', NOW()
    )
);

-- ================================================================
-- STATUS: MIGRAÇÃO CORRETIVA COMPLETA
-- ================================================================ 