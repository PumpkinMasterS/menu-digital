-- Create views to introspect RLS status and policies from PostgREST
-- This enables verification scripts without requiring custom RPC functions

-- View: public.v_rls_status
CREATE OR REPLACE VIEW public.v_rls_status AS
SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';

-- View: public.v_pg_policies
CREATE OR REPLACE VIEW public.v_pg_policies AS
SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  p.polname AS policyname,
  p.polpermissive AS permissive,
  p.polroles AS roles,
  p.polcmd AS cmd,
  pg_get_expr(p.polqual, p.polrelid) AS qual,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
FROM pg_catalog.pg_policy p
JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';

-- Grants for reading via API (read-only)
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.v_rls_status TO authenticated, service_role;
GRANT SELECT ON public.v_pg_policies TO authenticated, service_role;