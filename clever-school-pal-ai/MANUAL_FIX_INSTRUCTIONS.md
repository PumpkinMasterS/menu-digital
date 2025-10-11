# 🔧 INSTRUÇÕES PARA CORREÇÃO MANUAL DAS POLÍTICAS RLS

## ❌ PROBLEMAS IDENTIFICADOS:
1. **Coluna `school_id` não existe na tabela `contents`**
2. **Recursão infinita nas políticas RLS das tabelas `classes`, `students`, `subjects`**
3. **Função `exec_sql` não disponível via API**

## 🛠️ SOLUÇÃO MANUAL:

### PASSO 1: Aceder ao Supabase Dashboard
1. Ir para: https://supabase.com/dashboard
2. Selecionar o projeto: `nsaodmuqjtabfblrrdqv`
3. Ir para **SQL Editor**

### PASSO 2: Executar os seguintes comandos SQL (um de cada vez):

```sql
-- 1. Desativar RLS temporariamente
ALTER TABLE contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;
```

```sql
-- 2. Adicionar coluna school_id à tabela contents (se não existir)
ALTER TABLE contents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
```

```sql
-- 3. Atualizar school_id baseado no subject_id
UPDATE contents 
SET school_id = (
    SELECT school_id 
    FROM subjects 
    WHERE subjects.id = contents.subject_id
)
WHERE school_id IS NULL;
```

```sql
-- 4. Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "teachers_view_assigned_contents" ON contents;
DROP POLICY IF EXISTS "Super Admin All Operations on Contents" ON contents;
DROP POLICY IF EXISTS "teachers_view_assigned_classes" ON classes;
DROP POLICY IF EXISTS "teachers_view_class_students" ON students;
DROP POLICY IF EXISTS "teachers_view_assigned_subjects" ON subjects;
```

```sql
-- 5. Criar função helper simples
CREATE OR REPLACE FUNCTION is_super_admin_simple()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
    LIMIT 1;
    
    RETURN COALESCE(user_role = 'super_admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```sql
-- 6. Criar políticas simples e não-recursivas
CREATE POLICY "simple_contents_policy" ON contents
    FOR ALL 
    USING (is_super_admin_simple() OR auth.role() = 'authenticated')
    WITH CHECK (is_super_admin_simple() OR auth.role() = 'authenticated');

CREATE POLICY "simple_classes_policy" ON classes
    FOR ALL 
    USING (is_super_admin_simple() OR auth.role() = 'authenticated')
    WITH CHECK (is_super_admin_simple() OR auth.role() = 'authenticated');

CREATE POLICY "simple_students_policy" ON students
    FOR ALL 
    USING (is_super_admin_simple() OR auth.role() = 'authenticated')
    WITH CHECK (is_super_admin_simple() OR auth.role() = 'authenticated');

CREATE POLICY "simple_subjects_policy" ON subjects
    FOR ALL 
    USING (is_super_admin_simple() OR auth.role() = 'authenticated')
    WITH CHECK (is_super_admin_simple() OR auth.role() = 'authenticated');
```

```sql
-- 7. Reativar RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
```

### PASSO 3: Verificar se funcionou
Executar no terminal:
```bash
node test-rls-fix.cjs
```

## 🎯 RESULTADO ESPERADO:
- ✅ Sem erros de "infinite recursion"
- ✅ Coluna `school_id` existe na tabela `contents`
- ✅ Todas as consultas funcionam corretamente
- ✅ Dashboard carrega sem erros 500

## 📞 SUPORTE:
Se ainda houver problemas, execute:
```bash
node test-rls-fix.cjs
```
E partilhe o output completo.