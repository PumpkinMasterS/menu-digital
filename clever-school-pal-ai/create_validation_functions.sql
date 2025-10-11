-- Criar funções de validação em falta no Supabase
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Função para validar email institucional
CREATE OR REPLACE FUNCTION public.validate_institutional_email(email_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    domain_part TEXT;
    is_institutional BOOLEAN := false;
    institutional_domains TEXT[] := ARRAY[
        'edu.pt', 'escola.pt', 'agrupamento.pt', 'colegios.pt',
        'universidade.pt', 'instituto.pt', 'politecnico.pt',
        'gov.pt', 'cm-*.pt', 'dge.mec.pt', 'dgeste.mec.pt'
    ];
    domain TEXT;
BEGIN
    -- Validar formato básico do email
    IF email_input IS NULL OR email_input = '' OR email_input !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object(
            'is_valid', false,
            'is_institutional', false,
            'message', 'Formato de email inválido',
            'domain', null
        );
    END IF;

    -- Extrair domínio
    domain_part := split_part(lower(email_input), '@', 2);
    
    -- Verificar se é domínio institucional
    FOREACH domain IN ARRAY institutional_domains
    LOOP
        IF domain LIKE '%*%' THEN
            -- Domínio com wildcard (ex: cm-*.pt)
            IF domain_part ~ replace(domain, '*', '[a-z0-9-]+') THEN
                is_institutional := true;
                EXIT;
            END IF;
        ELSE
            -- Domínio exato
            IF domain_part = domain OR domain_part LIKE '%.' || domain THEN
                is_institutional := true;
                EXIT;
            END IF;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'is_valid', true,
        'is_institutional', is_institutional,
        'message', CASE 
            WHEN is_institutional THEN 'Email institucional válido'
            ELSE 'Email pessoal - considere usar email institucional'
        END,
        'domain', domain_part
    );
END;
$$;

-- 2. Função para validar força da password
CREATE OR REPLACE FUNCTION public.validate_password_strength_v2(password_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    score INTEGER := 0;
    issues TEXT[] := ARRAY[]::TEXT[];
    strength_level TEXT;
    has_upper BOOLEAN := false;
    has_lower BOOLEAN := false;
    has_digit BOOLEAN := false;
    has_special BOOLEAN := false;
    length_ok BOOLEAN := false;
BEGIN
    -- Verificar se password não é nula ou vazia
    IF password_input IS NULL OR password_input = '' THEN
        RETURN json_build_object(
            'is_valid', false,
            'score', 0,
            'strength', 'invalid',
            'message', 'Password não pode estar vazia',
            'issues', ARRAY['Password vazia']
        );
    END IF;

    -- Verificar comprimento mínimo
    IF length(password_input) >= 8 THEN
        length_ok := true;
        score := score + 2;
    ELSE
        issues := array_append(issues, 'Mínimo 8 caracteres');
    END IF;

    -- Verificar letras maiúsculas
    IF password_input ~ '[A-Z]' THEN
        has_upper := true;
        score := score + 1;
    ELSE
        issues := array_append(issues, 'Pelo menos 1 letra maiúscula');
    END IF;

    -- Verificar letras minúsculas
    IF password_input ~ '[a-z]' THEN
        has_lower := true;
        score := score + 1;
    ELSE
        issues := array_append(issues, 'Pelo menos 1 letra minúscula');
    END IF;

    -- Verificar dígitos
    IF password_input ~ '[0-9]' THEN
        has_digit := true;
        score := score + 1;
    ELSE
        issues := array_append(issues, 'Pelo menos 1 número');
    END IF;

    -- Verificar caracteres especiais
    IF password_input ~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?]' THEN
        has_special := true;
        score := score + 2;
    ELSE
        issues := array_append(issues, 'Pelo menos 1 carácter especial');
    END IF;

    -- Bonus por comprimento extra
    IF length(password_input) >= 12 THEN
        score := score + 1;
    END IF;

    -- Determinar nível de força
    IF score >= 7 THEN
        strength_level := 'strong';
    ELSIF score >= 5 THEN
        strength_level := 'medium';
    ELSIF score >= 3 THEN
        strength_level := 'weak';
    ELSE
        strength_level := 'very_weak';
    END IF;

    RETURN json_build_object(
        'is_valid', score >= 5, -- Mínimo score 5 para ser válida
        'score', score,
        'max_score', 8,
        'strength', strength_level,
        'message', CASE 
            WHEN score >= 7 THEN 'Password forte'
            WHEN score >= 5 THEN 'Password média'
            WHEN score >= 3 THEN 'Password fraca'
            ELSE 'Password muito fraca'
        END,
        'issues', issues,
        'requirements_met', json_build_object(
            'length', length_ok,
            'uppercase', has_upper,
            'lowercase', has_lower,
            'digit', has_digit,
            'special', has_special
        )
    );
END;
$$;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION public.validate_institutional_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_institutional_email(TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.validate_password_strength_v2(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_password_strength_v2(TEXT) TO anon;

-- Testar as funções
SELECT 'Funções de validação criadas com sucesso!' as status;

-- Exemplos de teste:
-- SELECT validate_institutional_email('professor@escola.pt');
-- SELECT validate_institutional_email('user@gmail.com');
-- SELECT validate_password_strength_v2('MinhaPassword123!');
-- SELECT validate_password_strength_v2('123');