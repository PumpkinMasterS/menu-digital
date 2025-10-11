-- Correção das políticas RLS para a tabela discord_guilds
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "discord_guilds_select_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_insert_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_update_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_delete_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_insert_permissive" ON discord_guilds;
DROP POLICY IF EXISTS "Enable read access for all users" ON discord_guilds;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON discord_guilds;
DROP POLICY IF EXISTS "Enable update for users based on email" ON discord_guilds;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON discord_guilds;

-- 2. Habilitar RLS na tabela
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;

-- 3. Criar política para SELECT (leitura) - permite leitura para todos
CREATE POLICY "discord_guilds_select_policy" ON discord_guilds
  FOR SELECT USING (true);

-- 4. Criar política para INSERT (inserção) - permite inserção para usuários autenticados
CREATE POLICY "discord_guilds_insert_policy" ON discord_guilds
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );

-- 5. Criar política para UPDATE (atualização) - permite atualização para usuários autenticados
CREATE POLICY "discord_guilds_update_policy" ON discord_guilds
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );

-- 6. Criar política para DELETE (exclusão) - permite exclusão para usuários autenticados
CREATE POLICY "discord_guilds_delete_policy" ON discord_guilds
  FOR DELETE USING (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );

-- Verificar se as políticas foram criadas corretamente
SELECT 
  pol.polname as policyname,
  pol.cmd,
  pol.permissive,
  pol.roles,
  pol.qual,
  pol.with_check
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'discord_guilds' AND pn.nspname = 'public';

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'discord_guilds' AND schemaname = 'public';