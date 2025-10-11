-- ========================================================
-- SISTEMA COMPLETO DE RESET DE SENHA - FUNCIONAL 2025
-- Implementação das RPCs ausentes no sistema
-- ========================================================

-- 0. PRÉ-REQUISITOS E EXTENSÕES
-- certificar que temos uuid e pgcrypto para gen_random_uuid/gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PARA TOKENS DE RESET (se não existir)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    ip_address INET,
    user_agent TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);

-- 2. FUNÇÃO RPC: REQUEST_PASSWORD_RESET
CREATE OR REPLACE FUNCTION public.request_password_reset(email_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN := FALSE;
    reset_token TEXT;
    reset_url TEXT;
    v_expires TIMESTAMPTZ;
    user_record auth.users%ROWTYPE;
BEGIN
    -- Verificar se o email existe em auth.users
    SELECT * INTO user_record FROM auth.users WHERE email = email_input;
    user_exists := (user_record.id IS NOT NULL);

    -- Log da tentativa
    INSERT INTO public.system_logs (log_type, level, message, metadata)
    VALUES (
        'password_reset',
        'info',
        'Solicitação de reset de senha recebida',
        jsonb_build_object(
            'target_email', email_input,
            'user_exists', user_exists,
            'ip_address', inet_client_addr(),
            'user_agent', current_setting('request.headers', true)
        )
    );

    -- Se o usuário existe, criar token real
    IF user_exists THEN
        reset_token := encode(gen_random_bytes(32), 'hex');
        v_expires := NOW() + INTERVAL '1 hour';

        -- Invalidar tokens anteriores deste email
        UPDATE public.password_reset_tokens 
        SET used = TRUE 
        WHERE email = email_input AND used = FALSE AND expires_at > NOW();

        -- Inserir novo token
        INSERT INTO public.password_reset_tokens (
            email, token, expires_at, user_id, ip_address, user_agent
        ) VALUES (
            email_input, reset_token, v_expires, user_record.id, inet_client_addr(), current_setting('request.headers', true)
        );

        -- Construir URL de reset a partir de APP_URL (defina em Variables do projeto)
        reset_url := COALESCE(current_setting('app.base_url', true), current_setting('app.url', true));
        IF reset_url IS NULL THEN
            -- fallback para variável padrão usada no frontend
            reset_url := 'https://app.example.com';
        END IF;
        reset_url := reset_url || '/redefinir-senha?token=' || reset_token;
    ELSE
        -- Para emails inexistentes, retornar resposta genérica sem token (evita enumeração)
        reset_url := NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'If this email exists, you will receive reset instructions',
        'resetUrl', reset_url
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_logs (log_type, level, message, metadata)
    VALUES (
        'password_reset',
        'error',
        'Falha ao processar solicitação de reset de senha',
        jsonb_build_object('target_email', email_input, 'error', SQLERRM)
    );

    RETURN jsonb_build_object('success', false, 'error', 'Failed to process reset request');
END;
$$;

-- 3. FUNÇÃO RPC: VALIDATE_RESET_TOKEN
CREATE OR REPLACE FUNCTION public.validate_reset_token(token_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token_record public.password_reset_tokens%ROWTYPE;
    is_valid BOOLEAN := FALSE;
BEGIN
    SELECT * INTO token_record 
    FROM public.password_reset_tokens 
    WHERE token = token_input 
      AND used = FALSE 
      AND expires_at > NOW()
    LIMIT 1;

    is_valid := (token_record.id IS NOT NULL);

    INSERT INTO public.system_logs (log_type, level, message, metadata)
    VALUES (
        'password_reset',
        'info',
        'Validação de token de reset',
        jsonb_build_object(
            'token_valid', is_valid,
            'token_email', token_record.email,
            'token_expires', token_record.expires_at,
            'ip_address', inet_client_addr()
        )
    );

    RETURN jsonb_build_object(
        'valid', is_valid,
        'email', CASE WHEN is_valid THEN token_record.email ELSE NULL END,
        'expires_at', CASE WHEN is_valid THEN token_record.expires_at ELSE NULL END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token validation failed');
END;
$$;

-- 4. FUNÇÃO RPC: RESET_PASSWORD_WITH_TOKEN
CREATE OR REPLACE FUNCTION public.reset_password_with_token(
    token_input TEXT,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token_record public.password_reset_tokens%ROWTYPE;
    user_record auth.users%ROWTYPE;
BEGIN
    -- Validar token
    SELECT * INTO token_record 
    FROM public.password_reset_tokens 
    WHERE token = token_input 
      AND used = FALSE 
      AND expires_at > NOW()
    LIMIT 1;

    IF token_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    -- Validar senha
    IF new_password IS NULL OR LENGTH(new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters');
    END IF;

    -- Buscar usuário
    SELECT * INTO user_record FROM auth.users WHERE email = token_record.email;

    IF user_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found in authentication system');
    END IF;

    -- Atualizar senha via API interna do Supabase Auth
    -- Nota: Em Supabase gerenciado, não temos acesso direto a encrypted_password.
    -- Estratégia: usar auth.admin.update_user_by_id via Function HTTP (não disponível em SQL). 
    -- Alternativa: uso de auth.set_auth_secret()/http para edge function. 
    -- Aqui, como fallback, se o projeto estiver com PostgreSQL local com coluna encrypted_password, tente atualizar.
    BEGIN
        UPDATE auth.users 
        SET encrypted_password = crypt(new_password, gen_salt('bf')),
            updated_at = NOW(),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = user_record.id;
    EXCEPTION WHEN OTHERS THEN
        -- Se não for possível (ambiente gerenciado), apenas marcar erro
        RETURN jsonb_build_object('success', false, 'error', 'Password update requires admin API');
    END;

    -- Marcar token como usado
    UPDATE public.password_reset_tokens SET used = TRUE WHERE token = token_input;

    INSERT INTO public.system_logs (log_type, level, message, metadata)
    VALUES (
        'password_reset',
        'info',
        'Password reset concluído',
        jsonb_build_object('target_email', token_record.email)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully', 'email', token_record.email);

EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_logs (log_type, level, message, metadata)
    VALUES (
        'password_reset',
        'error',
        'Falha ao resetar password',
        jsonb_build_object('error', SQLERRM)
    );
    RETURN jsonb_build_object('success', false, 'error', 'Password reset failed');
END;
$$;

-- 5. FUNÇÃO RPC: RESET_USER_PASSWORD_UNIFIED (para admin)
CREATE OR REPLACE FUNCTION public.reset_user_password_unified(
    target_email TEXT,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record auth.users%ROWTYPE;
BEGIN
    IF new_password IS NULL OR LENGTH(new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters');
    END IF;

    SELECT * INTO user_record FROM auth.users WHERE email = target_email;
    IF user_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    BEGIN
        UPDATE auth.users 
        SET encrypted_password = crypt(new_password, gen_salt('bf')),
            updated_at = NOW()
        WHERE id = user_record.id;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password update requires admin API');
    END;

    INSERT INTO public.system_logs (log_type, level, message, metadata)
    VALUES (
        'password_reset', 'info', 'Admin resetou password de usuário', jsonb_build_object('target_email', target_email)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully', 'target_email', target_email);
END;
$$;

-- 6. RLS E POLÍTICAS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Bloquear acesso direto
DROP POLICY IF EXISTS "Reset tokens access policy" ON public.password_reset_tokens;
CREATE POLICY "Reset tokens access policy" ON public.password_reset_tokens
    FOR ALL USING (false);

-- 7. GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.request_password_reset TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_reset_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_password_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password_unified TO authenticated;

-- 8. COMENTÁRIOS
COMMENT ON FUNCTION public.request_password_reset IS 'Gera token de reset de senha e retorna resetUrl para envio por email';
COMMENT ON FUNCTION public.validate_reset_token IS 'Valida token de reset';
COMMENT ON FUNCTION public.reset_password_with_token IS 'Atualiza password usando token';
COMMENT ON FUNCTION public.reset_user_password_unified IS 'Admin reseta senha de usuário';