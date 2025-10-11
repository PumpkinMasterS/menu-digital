-- =============================================
-- CORREÇÃO CRÍTICA DAS FUNÇÕES DE UTILIZADORES
-- Fix para problemas identificados no sistema
-- =============================================

-- 1. CORRIGIR HARD DELETE FUNCTION - Lógica incorreta
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
BEGIN
    -- Buscar utilizador em auth.users
    SELECT * INTO user_record FROM auth.users WHERE email = p_user_email;
    user_found := FOUND;

    -- Buscar utilizador em admin_users
    SELECT * INTO admin_record FROM admin_users WHERE email = p_user_email;
    admin_found := FOUND;

    -- Verificar se utilizador existe em pelo menos uma tabela
    IF NOT user_found AND NOT admin_found THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Utilizador não encontrado'
        );
    END IF;

    -- Verificar se não é super_admin (proteção)
    IF (user_record.raw_app_meta_data->>'role') = 'super_admin' OR 
       (admin_found AND admin_record.role = 'super_admin') THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Não é possível eliminar super administradores'
        );
    END IF;

    -- Log da operação
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'hard_delete_user',
        JSON_BUILD_OBJECT(
            'deleted_email', p_user_email,
            'found_in_auth', user_found,
            'found_in_admin', admin_found,
            'admin_role', CASE WHEN admin_found THEN admin_record.role ELSE null END
        ),
        current_setting('app.current_user_email', true),
        NOW()
    );

    -- Delete completo de ambas as tabelas
    DELETE FROM auth.users WHERE email = p_user_email;
    DELETE FROM admin_users WHERE email = p_user_email;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Utilizador eliminado completamente do sistema',
        'deleted_email', p_user_email,
        'removed_from_auth', user_found,
        'removed_from_admin', admin_found
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- 2. CORRIGIR CREATE SCHOOL USER FUNCTION - Sincronização incompleta
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
    -- Verificar se escola existe
    SELECT EXISTS(SELECT 1 FROM schools WHERE id = p_school_id) INTO school_exists;
    IF NOT school_exists THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Escola não encontrada'
        );
    END IF;

    -- Validar role
    IF p_role NOT IN ('diretor', 'coordenador', 'super_admin') THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Role inválida. Deve ser: diretor, coordenador ou super_admin'
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
        gen_random_uuid(),
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
            'school_name', p_school_name
        ),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    ) RETURNING id INTO new_user_id;

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
        'create_user',
        JSON_BUILD_OBJECT(
            'created_email', p_email,
            'role', p_role,
            'school_id', p_school_id,
            'school_name', p_school_name
        ),
        current_setting('app.current_user_email', true),
        NOW()
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'user_id', new_user_id,
        'email', p_email,
        'role', p_role,
        'message', 'Utilizador criado e sincronizado com sucesso'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro ao criar utilizador: ' || SQLERRM
    );
END;
$$;

-- 3. NOVA FUNÇÃO: SINCRONIZAR DADOS (Para corrigir utilizadores órfãos)
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphan_count INTEGER := 0;
    fixed_count INTEGER := 0;
    auth_user RECORD;
BEGIN
    -- Encontrar utilizadores em auth.users mas não em admin_users
    FOR auth_user IN 
        SELECT u.id, u.email, u.raw_app_meta_data, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN admin_users au ON u.email = au.email
        WHERE au.email IS NULL
        AND u.raw_app_meta_data->>'role' IN ('diretor', 'coordenador', 'super_admin')
    LOOP
        orphan_count := orphan_count + 1;
        
        -- Inserir em admin_users
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
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'name', 'Nome não definido'),
            auth_user.raw_app_meta_data->>'role',
            CASE 
                WHEN auth_user.raw_app_meta_data->>'role' = 'super_admin' THEN NULL
                ELSE (auth_user.raw_app_meta_data->>'school_id')::UUID
            END,
            true,
            NOW(),
            NOW()
        );
        
        fixed_count := fixed_count + 1;
    END LOOP;

    -- Log da sincronização
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'sync_user_data',
        JSON_BUILD_OBJECT(
            'orphans_found', orphan_count,
            'orphans_fixed', fixed_count
        ),
        current_setting('app.current_user_email', true),
        NOW()
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'orphans_found', orphan_count,
        'orphans_fixed', fixed_count,
        'message', format('Sincronização completa: %s utilizadores órfãos corrigidos', fixed_count)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro na sincronização: ' || SQLERRM
    );
END;
$$;

-- 4. MELHORAR UPDATE FUNCTION - Adicionar logs e validações
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
    changes_made JSONB := '{}'::jsonb;
    user_found BOOLEAN := false;
    admin_found BOOLEAN := false;
BEGIN
    -- Buscar registros existentes
    SELECT * INTO user_record FROM auth.users WHERE email = p_old_email;
    user_found := FOUND;
    
    SELECT * INTO admin_record FROM admin_users WHERE email = p_old_email;
    admin_found := FOUND;

    IF NOT user_found AND NOT admin_found THEN
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
        changes_made := changes_made || jsonb_build_object('email_changed', true);
    END IF;

    -- Validar role se fornecida
    IF p_role IS NOT NULL AND p_role NOT IN ('diretor', 'coordenador', 'super_admin') THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Role inválida. Deve ser: diretor, coordenador ou super_admin'
        );
    END IF;

    -- Atualizar auth.users se existir
    IF user_found THEN
        new_app_metadata := COALESCE(user_record.raw_app_meta_data, '{}'::jsonb);
        new_user_metadata := COALESCE(user_record.raw_user_meta_data, '{}'::jsonb);

        -- Atualizar metadados conforme parâmetros fornecidos
        IF p_role IS NOT NULL THEN
            new_app_metadata := new_app_metadata || jsonb_build_object('role', p_role);
            changes_made := changes_made || jsonb_build_object('role_changed', true);
        END IF;

        IF p_school_id IS NOT NULL THEN
            new_app_metadata := new_app_metadata || jsonb_build_object('school_id', p_school_id);
            changes_made := changes_made || jsonb_build_object('school_changed', true);
        END IF;

        IF p_name IS NOT NULL THEN
            new_user_metadata := new_user_metadata || jsonb_build_object('name', p_name);
            changes_made := changes_made || jsonb_build_object('name_changed', true);
        END IF;

        IF p_school_name IS NOT NULL THEN
            new_user_metadata := new_user_metadata || jsonb_build_object('school_name', p_school_name);
        END IF;

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
    IF admin_found THEN
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

    -- Log da atualização
    INSERT INTO system_logs (action, details, user_email, timestamp)
    VALUES (
        'update_user',
        JSON_BUILD_OBJECT(
            'target_email', p_old_email,
            'new_email', p_new_email,
            'changes_made', changes_made,
            'found_in_auth', user_found,
            'found_in_admin', admin_found
        ),
        current_setting('app.current_user_email', true),
        NOW()
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Utilizador atualizado com sucesso',
        'updated_email', COALESCE(p_new_email, p_old_email),
        'changes_made', changes_made
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Erro ao atualizar utilizador: ' || SQLERRM
    );
END;
$$;

-- 5. CRIAR TABELA DE LOGS SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB,
    user_email TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance (usando colunas que existem na tabela)
CREATE INDEX IF NOT EXISTS idx_system_logs_log_type ON system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

COMMENT ON TABLE system_logs IS 'Logs de auditoria para operações do sistema de utilizadores';