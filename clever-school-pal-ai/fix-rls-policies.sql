-- ================================================================
-- CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_guilds DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS

-- Contents policies
DROP POLICY IF EXISTS "Super Admin All Operations on Contents" ON contents;
DROP POLICY IF EXISTS "teachers_view_assigned_contents" ON contents;
DROP POLICY IF EXISTS "contents_select_policy" ON contents;
DROP POLICY IF EXISTS "contents_insert_policy" ON contents;
DROP POLICY IF EXISTS "contents_update_policy" ON contents;
DROP POLICY IF EXISTS "contents_delete_policy" ON contents;
DROP POLICY IF EXISTS "contents_select_simple" ON contents;
DROP POLICY IF EXISTS "contents_insert_simple" ON contents;
DROP POLICY IF EXISTS "contents_update_simple" ON contents;
DROP POLICY IF EXISTS "contents_delete_simple" ON contents;
DROP POLICY IF EXISTS "contents_super_admin_all" ON contents;
DROP POLICY IF EXISTS "contents_select_by_school" ON contents;
DROP POLICY IF EXISTS "contents_insert_by_school" ON contents;

-- Classes policies
DROP POLICY IF EXISTS "Super Admin All Operations on Classes" ON classes;
DROP POLICY IF EXISTS "classes_select_policy" ON classes;
DROP POLICY IF EXISTS "classes_insert_policy" ON classes;
DROP POLICY IF EXISTS "classes_update_policy" ON classes;
DROP POLICY IF EXISTS "classes_delete_policy" ON classes;
DROP POLICY IF EXISTS "classes_select_simple" ON classes;
DROP POLICY IF EXISTS "classes_insert_simple" ON classes;
DROP POLICY IF EXISTS "classes_update_simple" ON classes;
DROP POLICY IF EXISTS "classes_delete_simple" ON classes;
DROP POLICY IF EXISTS "classes_super_admin_all" ON classes;
DROP POLICY IF EXISTS "classes_select_by_school" ON classes;

-- Students policies
DROP POLICY IF EXISTS "Super Admin All Operations on Students" ON students;
DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "students_insert_policy" ON students;
DROP POLICY IF EXISTS "students_update_policy" ON students;
DROP POLICY IF EXISTS "students_delete_policy" ON students;
DROP POLICY IF EXISTS "students_select_simple" ON students;
DROP POLICY IF EXISTS "students_insert_simple" ON students;
DROP POLICY IF EXISTS "students_update_simple" ON students;
DROP POLICY IF EXISTS "students_delete_simple" ON students;
DROP POLICY IF EXISTS "students_super_admin_all" ON students;
DROP POLICY IF EXISTS "students_select_by_school" ON students;

-- Subjects policies
DROP POLICY IF EXISTS "Super Admin All Operations on Subjects" ON subjects;
DROP POLICY IF EXISTS "subjects_select_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_insert_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_select_simple" ON subjects;
DROP POLICY IF EXISTS "subjects_insert_simple" ON subjects;
DROP POLICY IF EXISTS "subjects_update_simple" ON subjects;
DROP POLICY IF EXISTS "subjects_delete_simple" ON subjects;
DROP POLICY IF EXISTS "subjects_super_admin_all" ON subjects;
DROP POLICY IF EXISTS "subjects_select_by_school" ON subjects;

-- Teacher Class Subjects policies (CAUSA DA RECURSÃO)
DROP POLICY IF EXISTS "Super Admin All Operations on Teacher Class Subjects" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_select_policy" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_insert_policy" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_update_policy" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_delete_policy" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_all_simple" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_super_admin_all" ON teacher_class_subjects;
DROP POLICY IF EXISTS "teacher_class_subjects_select_simple" ON teacher_class_subjects;

-- Discord policies
DROP POLICY IF EXISTS "discord_channels_select_policy" ON discord_channels;
DROP POLICY IF EXISTS "discord_users_select_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_channels_all_simple" ON discord_channels;
DROP POLICY IF EXISTS "discord_users_all_simple" ON discord_users;
DROP POLICY IF EXISTS "discord_channels_public_read" ON discord_channels;
DROP POLICY IF EXISTS "discord_users_public_read" ON discord_users;
DROP POLICY IF EXISTS "discord_channels_admin_access" ON discord_channels;
DROP POLICY IF EXISTS "discord_users_admin_access" ON discord_users;
DROP POLICY IF EXISTS "discord_guilds_admin_access" ON discord_guilds;

-- 3. VERIFICAR E ADICIONAR COLUNAS NECESSÁRIAS

-- Adicionar school_id à tabela contents se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contents' AND column_name = 'school_id') THEN
        ALTER TABLE contents ADD COLUMN school_id UUID REFERENCES schools(id);
        
        -- Atualizar school_id baseado no subject_id
        UPDATE contents 
        SET school_id = s.school_id 
        FROM subjects s 
        WHERE contents.subject_id = s.id AND contents.school_id IS NULL;
        
        RAISE NOTICE 'Coluna school_id adicionada à tabela contents';
    ELSE
        RAISE NOTICE 'Coluna school_id já existe na tabela contents';
    END IF;
END $$;

-- 4. CRIAR FUNÇÃO AUXILIAR PARA VERIFICAR SUPER ADMIN (SEM RECURSÃO)
CREATE OR REPLACE FUNCTION is_super_admin_simple()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Verificação direta sem subqueries complexas
    SELECT role INTO user_role 
    FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
    LIMIT 1;
    
    RETURN (user_role = 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRIAR POLÍTICAS RLS SIMPLES E NÃO-RECURSIVAS

-- ===== CONTENTS POLICIES =====
CREATE POLICY "contents_super_admin_access" ON contents
    FOR ALL USING (is_super_admin_simple());

CREATE POLICY "contents_school_access" ON contents
    FOR SELECT USING (
        NOT is_super_admin_simple() AND
        auth.role() = 'authenticated' AND
        school_id = (
            SELECT school_id FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
            LIMIT 1
        )
    );

-- ===== CLASSES POLICIES =====
CREATE POLICY "classes_super_admin_access" ON classes
    FOR ALL USING (is_super_admin_simple());

CREATE POLICY "classes_school_access" ON classes
    FOR SELECT USING (
        NOT is_super_admin_simple() AND
        auth.role() = 'authenticated' AND
        school_id = (
            SELECT school_id FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
            LIMIT 1
        )
    );

-- ===== STUDENTS POLICIES =====
CREATE POLICY "students_super_admin_access" ON students
    FOR ALL USING (is_super_admin_simple());

CREATE POLICY "students_school_access" ON students
    FOR SELECT USING (
        NOT is_super_admin_simple() AND
        auth.role() = 'authenticated' AND
        school_id = (
            SELECT school_id FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
            LIMIT 1
        )
    );

-- ===== SUBJECTS POLICIES =====
CREATE POLICY "subjects_super_admin_access" ON subjects
    FOR ALL USING (is_super_admin_simple());

CREATE POLICY "subjects_school_access" ON subjects
    FOR SELECT USING (
        NOT is_super_admin_simple() AND
        auth.role() = 'authenticated' AND
        school_id = (
            SELECT school_id FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
            LIMIT 1
        )
    );

-- ===== TEACHER_CLASS_SUBJECTS POLICIES (SEM RECURSÃO) =====
CREATE POLICY "teacher_class_subjects_super_admin_access" ON teacher_class_subjects
    FOR ALL USING (is_super_admin_simple());

CREATE POLICY "teacher_class_subjects_teacher_access" ON teacher_class_subjects
    FOR SELECT USING (
        NOT is_super_admin_simple() AND
        auth.role() = 'authenticated' AND
        teacher_id = auth.uid()
    );

-- ===== DISCORD POLICIES (USANDO COLUNAS CORRETAS) =====
CREATE POLICY "discord_guilds_authenticated_read" ON discord_guilds
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "discord_channels_authenticated_read" ON discord_channels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "discord_users_authenticated_read" ON discord_users
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. REABILITAR RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;

-- 7. VERIFICAÇÃO FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS corrigidas com sucesso!';
    RAISE NOTICE '📊 Tabelas com RLS ativo:';
    RAISE NOTICE '   - contents: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'contents');
    RAISE NOTICE '   - classes: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'classes');
    RAISE NOTICE '   - students: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'students');
    RAISE NOTICE '   - subjects: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subjects');
    RAISE NOTICE '   - teacher_class_subjects: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'teacher_class_subjects');
    RAISE NOTICE '   - discord_guilds: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'discord_guilds');
    RAISE NOTICE '   - discord_channels: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'discord_channels');
    RAISE NOTICE '   - discord_users: % políticas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'discord_users');
    RAISE NOTICE '🎉 Execute o teste novamente para verificar!';
END $$;

-- ================================================================
-- INSTRUÇÕES FINAIS:
-- 1. Execute este SQL no Supabase Dashboard > SQL Editor
-- 2. Aguarde a conclusão (pode demorar alguns segundos)
-- 3. Execute o teste: node test-rls-fix.cjs
-- 4. Verifique se os erros 500 foram resolvidos
-- ================================================================