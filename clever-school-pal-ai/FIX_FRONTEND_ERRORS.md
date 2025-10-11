# Correção dos Erros 404 e 400 no Frontend

## Problema Identificado

1. **Erro 404**: Função `list_admin_users` não existe no Supabase
2. **Erro 400**: Query de estudantes estava buscando coluna `phone_number` que não existe

## Soluções Aplicadas

### ✅ 1. Correção da Query de Estudantes

Já foi corrigida no arquivo `Students.tsx`:
- Removida coluna `phone_number` inexistente
- Mapeamento correto de `whatsapp_number` para `phoneNumber`

### 🔧 2. Criar Função RPC `list_admin_users`

**Execute este SQL no Supabase Dashboard > SQL Editor:**

```sql
-- Função RPC para listar usuários admin (funciona com anon key)
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  school_id UUID,
  school_name TEXT,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retornar usuários com roles de admin (super_admin, director)
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    COALESCE(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name',
      'Usuário'
    )::TEXT as name,
    COALESCE(
      au.raw_user_meta_data->>'role',
      'director'
    )::TEXT as role,
    CASE 
      WHEN au.raw_user_meta_data->>'school_id' IS NOT NULL 
      THEN (au.raw_user_meta_data->>'school_id')::UUID
      ELSE NULL
    END as school_id,
    COALESCE(
      s.name,
      au.raw_user_meta_data->>'school_name',
      'Global'
    )::TEXT as school_name,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.schools s ON s.id = (au.raw_user_meta_data->>'school_id')::UUID
  WHERE 
    au.raw_user_meta_data->>'role' IN ('super_admin', 'director')
    AND au.deleted_at IS NULL
  ORDER BY 
    CASE au.raw_user_meta_data->>'role'
      WHEN 'super_admin' THEN 1
      WHEN 'director' THEN 2
      ELSE 3
    END,
    au.created_at DESC;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO anon;

-- Comentário da função
COMMENT ON FUNCTION public.list_admin_users() IS 'Lista usuários com roles de administrador (super_admin, director)';

-- Testar a função
SELECT * FROM public.list_admin_users();
```

## Verificação

Após executar o SQL acima:

1. **Teste a função RPC:**
   ```bash
   node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config(); const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); supabase.rpc('list_admin_users').then(({data, error}) => { if (error) console.log('❌ Erro:', error.message); else console.log('✅ Usuários encontrados:', data?.length || 0); });"
   ```

2. **Recarregue o frontend** - os erros 404 e 400 devem desaparecer

3. **Verifique se os estudantes aparecem** na página Students

## Status das Correções

- ✅ **Students.tsx**: Corrigido (phone_number removido)
- 🔧 **list_admin_users**: Precisa executar SQL acima
- ✅ **RLS Policies**: Corrigidas via MANUAL_FIX_INSTRUCTIONS.md
- ✅ **school_id em contents**: Adicionado via MANUAL_FIX_INSTRUCTIONS.md

## Próximos Passos

1. Execute o SQL acima no Supabase Dashboard
2. Recarregue o frontend
3. Teste a navegação para Students e Users
4. Verifique se todos os dados aparecem corretamente