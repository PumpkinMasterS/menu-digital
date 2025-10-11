-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE GESTÃO DE UTILIZADORES
-- Seguindo padrões de web apps modernas de 2025
-- Versão: 3.0 Final
-- =====================================================

-- 1. FUNÇÃO DE ANÁLISE DE DEPENDÊNCIAS (estava em falta)
CREATE OR REPLACE FUNCTION analyze_user_dependencies(p_user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    admin_record admin_users%ROWTYPE;
    content_count INTEGER := 0;
    media_count INTEGER := 0;
    chat_count INTEGER := 0;
    preference_count INTEGER := 0;
    personality_count INTEGER := 0;
    audit_count INTEGER := 0;
    whatsapp_count INTEGER := 0;
    can_delete BOOLEAN := true;
    risk_level TEXT := 'LOW';
    warnings TEXT[] := '{}';
    is_last_super_admin BOOLEAN := false;
BEGIN
    -- Buscar utilizador em ambas as tabelas
    SELECT * INTO user_record FROM auth.users WHERE email = p_user_email;
    SELECT * INTO admin_record FROM admin_users WHERE email = p_user_email;

    -- Verificar se utilizador existe
    IF user_record.id IS NULL AND admin_record.id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Utilizador não encontrado'
        );
    END IF;

    -- Verificar se é o último super_admin
    IF admin_record.role = 'super_admin' OR user_record.raw_app_meta_data->>'role' = 'super_admin' THEN
        SELECT COUNT(*) <= 1 INTO is_last_super_admin
        FROM admin_users 
        WHERE role = 'super_admin' AND is_active = true;
        
        IF is_last_super_admin THEN
            can_delete := false;
            risk_level := 'BLOCKED';
            warnings := array_append(warnings, 'ÚLTIMO SUPER ADMIN - Não pode ser eliminado');
        END IF;
    END IF;

    -- Contar dependências (só se utilizador existir)
    IF user_record.id IS NOT NULL THEN
        -- Contents criados por este utilizador
        SELECT COUNT(*) INTO content_count 
        FROM contents 
        WHERE created_by = user_record.id::text;

        -- Media files enviados por este utilizador
        SELECT COUNT(*) INTO media_count 
        FROM media_files 
        WHERE uploaded_by = user_record.id::text;

        -- Chat logs relacionados
        SELECT COUNT(*) INTO chat_count 
        FROM ai_chat_messages 
        WHERE user_id = user_record.id::text;

        -- Preferências admin
        SELECT COUNT(*) INTO preference_count 
        FROM admin_preferences 
        WHERE admin_id = user_record.id;

        -- Personalidades customizadas
        SELECT COUNT(*) INTO personality_count 
        FROM custom_personalities 
        WHERE created_by = user_record.id;

        -- Logs de auditoria
        SELECT COUNT(*) INTO audit_count 
        FROM security_audit_log 
        WHERE performed_by = p_user_email;

        -- WhatsApp messages
        SELECT COUNT(*) INTO whatsapp_count 
        FROM whatsapp_messages 
        WHERE user_id = user_record.id::text;
    END IF;

    -- Determinar risk level e warnings
    IF content_count > 0 THEN
        warnings := array_append(warnings, content_count || ' conteúdos educacionais ficarão órfãos');
    END IF;

    IF media_count > 0 THEN
        warnings := array_append(warnings, media_count || ' ficheiros de media ficarão órfãos');
    END IF;

    IF chat_count > 0 THEN
        warnings := array_append(warnings, chat_count || ' mensagens de chat serão perdidas');
    END IF;

    IF whatsapp_count > 0 THEN
        warnings := array_append(warnings, whatsapp_count || ' mensagens WhatsApp serão perdidas');
    END IF;

    -- Determinar nível de risco
    IF NOT can_delete THEN
        risk_level := 'BLOCKED';
    ELSIF content_count > 50 OR media_count > 100 THEN
        risk_level := 'HIGH';
        warnings := array_append(warnings, 'ALTO VOLUME DE DADOS - Considere transferir antes de eliminar');
    ELSIF content_count > 10 OR media_count > 20 OR chat_count > 100 THEN
        risk_level := 'MEDIUM';
        warnings := array_append(warnings, 'Volume significativo de dados será perdido');
    ELSE
        risk_level := 'LOW';
    END IF;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'can_delete', can_delete,
        'risk_level', risk_level,
        'user_info', JSON_BUILD_OBJECT(
            'email', p_user_email,
            'name', COALESCE(admin_record.name, user_record.raw_user_meta_data->>'name', 'Sem nome'),
            'role', COALESCE(admin_record.role, user_record.raw_app_meta_data->>'role'),
            'school_id', admin_record.school_id,
            'found_in_auth', user_record.id IS NOT NULL,
            'found_in_admin', admin_record.id IS NOT NULL,
            'is_active', COALESCE(admin_record.is_active, user_record.email_confirmed_at IS NOT NULL)
        ),
        'dependencies', JSON_BUILD_OBJECT(
            'contents', content_count,
            'media_files', media_count,
            'chat_logs', chat_count,
            'preferences', preference_count,
            'personalities', personality_count,
            'audit_logs', audit_count,
            'whatsapp_messages', whatsapp_count,
            'total', content_count + media_count + chat_count + preference_count + personality_count + whatsapp_count
        ),
        'warnings', warnings,
        'recommended_action', CASE 
            WHEN NOT can_delete THEN 'BLOCKED'
            WHEN risk_level = 'HIGH' THEN 'TRANSFER_FIRST'
            WHEN risk_level = 'MEDIUM' THEN 'REVIEW_REQUIRED' 
            ELSE 'SAFE_TO_DELETE'
        END,
        'transfer_required', content_count > 0 OR media_count > 0
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro ao analisar dependências: ' || SQLERRM
    );
END;
$$;

-- 2. CORREÇÃO DA FUNÇÃO CREATE_SCHOOL_USER_ADMIN
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

    -- Log da criação
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'create_user_success',
        JSON_BUILD_OBJECT(
            'created_email', p_email,
            'role', p_role,
            'school_id', p_school_id,
            'school_name', p_school_name,
            'user_id', new_user_id
        ),
        current_setting('app.current_user_email', true),
        NOW()
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
    -- Log do erro
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'create_user_error',
        JSON_BUILD_OBJECT(
            'target_email', p_email,
            'error', SQLERRM,
            'role', p_role
        ),
        current_setting('app.current_user_email', true),
        NOW()
    );

    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro ao criar utilizador: ' || SQLERRM
    );
END;
$$;

-- 3. CORREÇÃO DA FUNÇÃO HARD_DELETE_USER_ADMIN
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

    -- Log da operação
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'hard_delete_user_start',
        JSON_BUILD_OBJECT(
            'target_email', p_user_email,
            'found_in_auth', user_found,
            'found_in_admin', admin_found,
            'target_role', COALESCE(admin_record.role, user_record.raw_app_meta_data->>'role'),
            'analysis', analysis_result
        ),
        current_user_email,
        NOW()
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

    -- Log final de sucesso
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'hard_delete_user_success',
        JSON_BUILD_OBJECT(
            'deleted_email', p_user_email,
            'removed_from_auth', user_found,
            'removed_from_admin', admin_found,
            'dependencies_cleaned', true
        ),
        current_user_email,
        NOW()
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
    -- Log do erro
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'hard_delete_user_error',
        JSON_BUILD_OBJECT(
            'target_email', p_user_email,
            'error', SQLERRM
        ),
        current_user_email,
        NOW()
    );

    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro interno ao eliminar utilizador: ' || SQLERRM
    );
END;
$$;

-- 4. FUNÇÃO PARA VERIFICAR STATUS DO SISTEMA
CREATE OR REPLACE FUNCTION check_user_system_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    functions_status JSON;
    super_admin_count INTEGER;
    total_users INTEGER;
    active_users INTEGER;
BEGIN
    -- Contar utilizadores
    SELECT COUNT(*) INTO total_users FROM admin_users;
    SELECT COUNT(*) INTO active_users FROM admin_users WHERE is_active = true;
    SELECT COUNT(*) INTO super_admin_count FROM admin_users WHERE role = 'super_admin' AND is_active = true;

    -- Verificar se funções existem
    SELECT JSON_BUILD_OBJECT(
        'create_school_user_admin', EXISTS(
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'create_school_user_admin'
        ),
        'hard_delete_user_admin', EXISTS(
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'hard_delete_user_admin'
        ),
        'analyze_user_dependencies', EXISTS(
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'analyze_user_dependencies'
        )
    ) INTO functions_status;

    RETURN JSON_BUILD_OBJECT(
        'system_status', 'OK',
        'functions_available', functions_status,
        'user_stats', JSON_BUILD_OBJECT(
            'total_users', total_users,
            'active_users', active_users,
            'super_admin_count', super_admin_count,
            'system_healthy', super_admin_count > 0
        ),
        'timestamp', NOW()
    );
END;
$$;

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION analyze_user_dependencies TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_system_status TO authenticated;

-- 6. COMENTÁRIOS
COMMENT ON FUNCTION analyze_user_dependencies IS 'Analisa dependências de utilizador antes da eliminação - essencial para operações seguras';
COMMENT ON FUNCTION create_school_user_admin IS 'Criação de utilizadores com sincronização completa entre auth.users e admin_users';
COMMENT ON FUNCTION hard_delete_user_admin IS 'Eliminação segura com análise prévia de dependências e logs completos';
COMMENT ON FUNCTION check_user_system_status IS 'Verificação do status geral do sistema de gestão de utilizadores'; 