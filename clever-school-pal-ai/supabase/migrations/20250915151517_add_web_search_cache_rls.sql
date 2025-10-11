-- Adicionar políticas RLS para a tabela web_search_cache
-- Permite que service_role (usada pelas funções Edge) acesse o cache

-- 1. Habilitar RLS se ainda não estiver habilitado
ALTER TABLE web_search_cache ENABLE ROW LEVEL SECURITY;

-- 1.a. Remover políticas existentes se reexecutar a migração de forma idempotente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_search_cache' AND policyname = 'web_search_cache_service_role_all') THEN
    EXECUTE 'DROP POLICY "web_search_cache_service_role_all" ON public.web_search_cache';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_search_cache' AND policyname = 'web_search_cache_insert_service') THEN
    EXECUTE 'DROP POLICY "web_search_cache_insert_service" ON public.web_search_cache';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_search_cache' AND policyname = 'web_search_cache_update_service') THEN
    EXECUTE 'DROP POLICY "web_search_cache_update_service" ON public.web_search_cache';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_search_cache' AND policyname = 'web_search_cache_delete_service') THEN
    EXECUTE 'DROP POLICY "web_search_cache_delete_service" ON public.web_search_cache';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_search_cache' AND policyname = 'web_search_cache_read_anon') THEN
    EXECUTE 'DROP POLICY "web_search_cache_read_anon" ON public.web_search_cache';
  END IF;
END $$;

-- 2. Criar políticas explícitas por operação para service_role
CREATE POLICY "web_search_cache_insert_service" ON public.web_search_cache
FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "web_search_cache_update_service" ON public.web_search_cache
FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "web_search_cache_delete_service" ON public.web_search_cache
FOR DELETE TO service_role
USING (true);

-- 3. (Opcional) Permitir leitura para anon apenas de registros não expirados
CREATE POLICY "web_search_cache_read_anon" ON public.web_search_cache
FOR SELECT TO anon
USING (expires_at IS NULL OR expires_at > now());

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_search_cache TO service_role;
GRANT SELECT ON public.web_search_cache TO anon;

-- 5. Comentários para documentação
COMMENT ON TABLE public.web_search_cache IS 'Cache de resultados de buscas na web. RLS habilitado: service_role tem acesso total; anon somente leitura de registros válidos.';

-- 6. Log de aplicação da migração
DO $$
BEGIN
    RAISE NOTICE 'RLS policies applied to web_search_cache table: service_role full access; anon read non-expired.';
END $$;