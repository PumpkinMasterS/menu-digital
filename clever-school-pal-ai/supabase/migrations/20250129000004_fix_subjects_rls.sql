-- ================================================================
-- FIX SUBJECTS RLS POLICIES
-- Adicionar política de super admin para subjects
-- ================================================================

-- Habilitar RLS na tabela subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Allow all operations on subjects" ON subjects;
DROP POLICY IF EXISTS "teachers_view_assigned_subjects" ON subjects;

-- Política: Super Admin e usuários autenticados podem acessar subjects
CREATE POLICY "Super Admin All Operations on Subjects" ON subjects
    FOR ALL USING (is_super_admin() OR auth.role() = 'authenticated');

-- Política específica para professores verem suas disciplinas
CREATE POLICY "teachers_view_assigned_subjects" ON subjects
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.subject_id = subjects.id
              AND tcs.is_active = true
        )
    );

-- Comentário explicativo
COMMENT ON POLICY "Super Admin All Operations on Subjects" ON subjects IS 
'Permite que super administradores e usuários autenticados acessem todas as disciplinas';

COMMENT ON POLICY "teachers_view_assigned_subjects" ON subjects IS 
'Permite que professores vejam apenas as disciplinas que ensinam';