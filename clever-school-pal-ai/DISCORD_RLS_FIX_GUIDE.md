# Guia de Correção: Erro 403 - Políticas RLS Discord Guilds

## 🚨 Problema Identificado

O erro `403 Forbidden` com a mensagem "new row violates row-level security policy for table 'discord_guilds'" ocorre porque:

1. **RLS está habilitado** na tabela `discord_guilds`
2. **Políticas RLS estão ausentes ou muito restritivas** para operações INSERT
3. **Usuários autenticados não conseguem inserir dados** devido às políticas inadequadas

## 🔍 Diagnóstico Realizado

### Testes Executados:
- ✅ **Service Role**: Inserção funciona (bypass RLS)
- ❌ **Anon Key**: Inserção falha (sujeita a RLS)
- ✅ **Dados válidos**: Guild ID e School ID estão corretos
- ❌ **Políticas RLS**: Ausentes ou inadequadas para INSERT

### Logs do Erro:
```
POST https://nsaodmuqjtabfblrrdqv.supabase.co/rest/v1/discord_guilds 403 (Forbidden)
Error: new row violates row-level security policy for table "discord_guilds"
Code: 42501
```

## 🛠️ Solução: Corrigir Políticas RLS

### Passo 1: Acessar Supabase Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral

### Passo 2: Executar Script de Correção

1. **Copie o conteúdo** do arquivo `fix-discord-guilds-rls.sql`
2. **Cole no SQL Editor** do Supabase
3. **Execute o script** clicando em "Run"

### Passo 3: Verificar Correção

Após executar o script, você deve ver:

```sql
-- Resultado esperado da verificação de políticas:
policyname                    | cmd    | permissive | roles | qual | with_check
discord_guilds_select_policy  | SELECT | PERMISSIVE | {}    | true | 
discord_guilds_insert_policy  | INSERT | PERMISSIVE | {}    |      | (auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)
discord_guilds_update_policy  | UPDATE | PERMISSIVE | {}    | (auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text) | 
discord_guilds_delete_policy  | DELETE | PERMISSIVE | {}    | (auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text) | 

-- Resultado esperado da verificação de RLS:
schemaname | tablename      | rowsecurity
public     | discord_guilds | t
```

⚠️ **CORREÇÃO APLICADA**: O script foi corrigido para usar `pol.polname` ao invés de `policyname` na consulta de verificação.

## 🔧 Script SQL Completo

```sql
-- Correção das políticas RLS para a tabela discord_guilds
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "discord_guilds_select_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_insert_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_update_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_delete_policy" ON discord_guilds;

-- 2. Habilitar RLS na tabela
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;

-- 3. Criar política para SELECT (leitura)
CREATE POLICY "discord_guilds_select_policy" ON discord_guilds
  FOR SELECT USING (true);

-- 4. Criar política para INSERT (inserção)
CREATE POLICY "discord_guilds_insert_policy" ON discord_guilds
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );

-- 5. Criar política para UPDATE (atualização)
CREATE POLICY "discord_guilds_update_policy" ON discord_guilds
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );

-- 6. Criar política para DELETE (exclusão)
CREATE POLICY "discord_guilds_delete_policy" ON discord_guilds
  FOR DELETE USING (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );
```

## 🧪 Teste da Correção

### Passo 1: Testar no Frontend

1. **Acesse** a aplicação em `http://localhost:8080`
2. **Faça login** como super_admin
3. **Vá para** Discord Management
4. **Tente adicionar** um servidor Discord:
   - Guild ID: `1406268961313521744`
   - Guild Name: `Escola Exemplo`
   - School: Selecione uma escola

### Passo 2: Verificar Logs

**Logs de Sucesso Esperados:**
```
🔍 Auth Debug Info: {isAuthenticated: true, user: 'whiswher@gmail.com', role: 'super_admin', school_id: undefined, hasSession: true}
📤 Inserting guild data: {guild_id: '1406268961313521744', guild_name: 'Escola Exemplo', school_id: '550e8400-e29b-41d4-a716-446655440000'}
✅ Guild added successfully!
```

## 🚨 Solução Alternativa (Temporária)

Se o problema persistir, use uma política mais permissiva temporariamente:

```sql
-- APENAS PARA TESTE - Política muito permissiva
DROP POLICY IF EXISTS "discord_guilds_insert_policy" ON discord_guilds;
CREATE POLICY "discord_guilds_insert_permissive" ON discord_guilds
  FOR INSERT WITH CHECK (true);
```

⚠️ **IMPORTANTE**: Esta política permite inserção sem autenticação. Use apenas para teste e substitua pela política segura depois.

## 📋 Checklist de Verificação

- [ ] Script SQL executado no Supabase Dashboard
- [ ] Políticas RLS criadas corretamente
- [ ] RLS habilitado na tabela discord_guilds
- [ ] Teste de inserção no frontend realizado
- [ ] Logs de sucesso verificados
- [ ] Erro 403 resolvido

## 🔍 Troubleshooting

### Se o erro persistir:

1. **Verifique autenticação**:
   ```javascript
   console.log('Auth status:', supabase.auth.getSession());
   ```

2. **Verifique políticas**:
   ```sql
   SELECT * FROM pg_policy WHERE polrelid = 'discord_guilds'::regclass;
   ```

3. **Teste com service_role** temporariamente:
   ```javascript
   // Apenas para debug - NUNCA em produção
   const adminClient = createClient(url, serviceRoleKey);
   ```

## 📞 Suporte

Se o problema persistir após seguir este guia:

1. Verifique os logs do navegador
2. Verifique as políticas no Supabase Dashboard
3. Teste a autenticação do usuário
4. Verifique as variáveis de ambiente

---

**Status**: 🔧 Aguardando execução do script SQL no Supabase Dashboard
**Próximo passo**: Executar `fix-discord-guilds-rls.sql` no SQL Editor