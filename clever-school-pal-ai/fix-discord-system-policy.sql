-- Correção para permitir inserções do sistema na tabela discord_interactions
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "discord_interactions_admin_access" ON discord_interactions;
DROP POLICY IF EXISTS "System can insert discord_interactions" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_service_role" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_system_access" ON discord_interactions;

-- 2. Criar política para permitir SELECT para usuários autenticados
CREATE POLICY "discord_interactions_select_policy" ON discord_interactions
    FOR SELECT USING (
        auth.role() = 'authenticated' OR
        auth.role() = 'service_role'
    );

-- 3. Criar política para permitir INSERT do sistema e usuários autenticados
CREATE POLICY "discord_interactions_insert_policy" ON discord_interactions
    FOR INSERT WITH CHECK (
        -- Permitir inserções do sistema (guild_id = 'system')
        guild_id = 'system' OR
        -- Permitir inserções de usuários autenticados
        auth.role() = 'authenticated' OR
        auth.role() = 'service_role'
    );

-- 4. Criar política para permitir UPDATE para usuários autenticados
CREATE POLICY "discord_interactions_update_policy" ON discord_interactions
    FOR UPDATE USING (
        auth.role() = 'authenticated' OR
        auth.role() = 'service_role'
    );

-- 5. Criar política para permitir DELETE para usuários autenticados
CREATE POLICY "discord_interactions_delete_policy" ON discord_interactions
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
WHERE pc.relname = 'discord_interactions' AND pn.nspname = 'public';

SELECT 'Discord interactions RLS policies fixed successfully!' as status;