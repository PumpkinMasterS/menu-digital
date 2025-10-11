-- Script para corrigir recursão infinita nas políticas RLS da tabela classes

-- 1. Primeiro, vamos ver todas as políticas atuais da tabela classes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'classes';

-- 2. Remover TODAS as políticas existentes da tabela classes para evitar conflitos
DROP POLICY IF EXISTS "Allow all operations on classes" ON classes;
DROP POLICY IF EXISTS "Super admin full access classes" ON classes;
DROP POLICY IF EXISTS "School admin access classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON classes;
DROP POLICY IF EXISTS "teachers_view_assigned_classes" ON classes;
DROP POLICY IF EXISTS "Users can view classes" ON classes;
DROP POLICY IF EXISTS "Users can insert classes" ON classes;
DROP POLICY IF EXISTS "Users can update classes" ON classes;
DROP POLICY IF EXISTS "Users can delete classes" ON classes;

-- 3. Criar uma política simples e não recursiva para usuários autenticados
CREATE POLICY "authenticated_users_full_access_classes" ON classes
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Verificar se a política foi criada corretamente
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'classes';

-- 5. Testar uma query simples na tabela classes
SELECT COUNT(*) as total_classes FROM classes;

-- 6. Fazer o mesmo para outras tabelas que podem ter problemas similares

-- STUDENTS
DROP POLICY IF EXISTS "Allow all operations on students" ON students;
DROP POLICY IF EXISTS "Super admin full access students" ON students;
DROP POLICY IF EXISTS "School admin access students" ON students;
DROP POLICY IF EXISTS "Teachers can view their class students" ON students;
DROP POLICY IF EXISTS "teachers_view_class_students" ON students;

CREATE POLICY "authenticated_users_full_access_students" ON students
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- SUBJECTS
DROP POLICY IF EXISTS "Allow all operations on subjects" ON subjects;
DROP POLICY IF EXISTS "Super admin full access subjects" ON subjects;
DROP POLICY IF EXISTS "School admin access subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers can view their subjects" ON subjects;
DROP POLICY IF EXISTS "teachers_view_assigned_subjects" ON subjects;

CREATE POLICY "authenticated_users_full_access_subjects" ON subjects
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- CONTENTS
DROP POLICY IF EXISTS "Allow all operations on contents" ON contents;
DROP POLICY IF EXISTS "Super admin full access contents" ON contents;
DROP POLICY IF EXISTS "School admin access contents" ON contents;
DROP POLICY IF EXISTS "Teachers can view content for their classes" ON contents;
DROP POLICY IF EXISTS "teachers_view_subject_contents" ON contents;
DROP POLICY IF EXISTS "teachers_create_subject_contents" ON contents;

CREATE POLICY "authenticated_users_full_access_contents" ON contents
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- SCHOOLS
DROP POLICY IF EXISTS "Allow all operations on schools" ON schools;
DROP POLICY IF EXISTS "Super admin full access schools" ON schools;
DROP POLICY IF EXISTS "School admin access schools" ON schools;

CREATE POLICY "authenticated_users_full_access_schools" ON schools
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 7. Verificar se todas as políticas foram aplicadas corretamente
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('classes', 'students', 'subjects', 'contents', 'schools')
GROUP BY tablename
ORDER BY tablename;

-- 8. Testar queries básicas em todas as tabelas
SELECT 'classes' as tabela, COUNT(*) as total FROM classes
UNION ALL
SELECT 'students' as tabela, COUNT(*) as total FROM students
UNION ALL
SELECT 'subjects' as tabela, COUNT(*) as total FROM subjects
UNION ALL
SELECT 'contents' as tabela, COUNT(*) as total FROM contents
UNION ALL
SELECT 'schools' as tabela, COUNT(*) as total FROM schools;