-- ================================================================
-- MIGRAÇÃO: ATUALIZAR RLS PARA SISTEMA COMPLETO DE PROFESSORES
-- Data: 29/01/2025
-- Descrição: Atualizar políticas RLS para o novo sistema teacher_class_subjects
-- ================================================================

-- ================================================================
-- 1. ATUALIZAR FUNÇÃO has_school_access PARA INCLUIR PROFESSORES
-- ================================================================

CREATE OR REPLACE FUNCTION has_school_access(target_school_id uuid)
RETURNS boolean AS $$
DECLARE
    user_role text;
    user_school_id uuid;
    user_id uuid;
BEGIN
    -- Buscar dados do usuário atual
    user_id := auth.uid();
    user_role := auth.jwt() ->> 'role';
    user_school_id := (auth.jwt() ->> 'school_id')::uuid;
    
    -- Se não estiver autenticado, negar acesso
    IF user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Super admin tem acesso a tudo
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- Diretor e coordenador têm acesso à sua escola
    IF user_role IN ('diretor', 'coordenador') THEN
        RETURN user_school_id = target_school_id;
    END IF;
    
    -- Professor tem acesso às escolas onde ensina
    IF user_role = 'professor' THEN
        -- Verificar se o professor tem atribuições na escola
        RETURN EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            JOIN classes c ON tcs.class_id = c.id
            WHERE tcs.teacher_id = user_id
              AND c.school_id = target_school_id
              AND tcs.is_active = true
        );
    END IF;
    
    -- Por padrão, negar acesso
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 2. NOVA FUNÇÃO: VERIFICAR ACESSO DO PROFESSOR À TURMA
-- ================================================================

CREATE OR REPLACE FUNCTION teacher_has_class_access(
    p_teacher_id uuid,
    p_class_id uuid
) RETURNS boolean AS $$
BEGIN
    -- Verificar se professor tem acesso à turma (qualquer disciplina)
    RETURN EXISTS (
        SELECT 1 FROM teacher_class_subjects
        WHERE teacher_id = p_teacher_id
          AND class_id = p_class_id
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. ATUALIZAR POLÍTICAS RLS PARA TABELA students
-- ================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Teachers can view their class students" ON students;
DROP POLICY IF EXISTS "Teachers can manage their class students" ON students;

-- Política: Professores podem ver alunos das suas turmas
CREATE POLICY "teachers_view_class_students" ON students
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.class_id = students.class_id
              AND tcs.is_active = true
        )
    );

-- Política: Professores podem atualizar alunos das suas turmas (apenas alguns campos)
CREATE POLICY "teachers_update_class_students" ON students
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.class_id = students.class_id
              AND tcs.is_active = true
        )
    );

-- ================================================================
-- 4. ATUALIZAR POLÍTICAS RLS PARA TABELA classes
-- ================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Teachers can view their assigned classes" ON classes;

-- Política: Professores podem ver suas turmas atribuídas
CREATE POLICY "teachers_view_assigned_classes" ON classes
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.class_id = classes.id
              AND tcs.is_active = true
        )
    );

-- ================================================================
-- 5. ATUALIZAR POLÍTICAS RLS PARA TABELA subjects
-- ================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Teachers can view their subjects" ON subjects;

-- Política: Professores podem ver disciplinas que ensinam
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

-- ================================================================
-- 6. ATUALIZAR POLÍTICAS RLS PARA TABELA class_subjects
-- ================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Teachers can view class subjects" ON class_subjects;

-- Política: Professores podem ver disciplinas das suas turmas
CREATE POLICY "teachers_view_class_subjects" ON class_subjects
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND (tcs.class_id = class_subjects.class_id OR tcs.subject_id = class_subjects.subject_id)
              AND tcs.is_active = true
        )
    );

-- ================================================================
-- 7. ATUALIZAR POLÍTICAS RLS PARA TABELA contents
-- ================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Teachers can view content for their classes" ON contents;

-- Política: Professores podem ver conteúdos das suas disciplinas
CREATE POLICY "teachers_view_subject_contents" ON contents
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.subject_id = contents.subject_id
              AND tcs.is_active = true
        )
    );

-- Política: Professores podem criar conteúdos para suas disciplinas
CREATE POLICY "teachers_create_subject_contents" ON contents
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.subject_id = contents.subject_id
              AND tcs.is_active = true
        )
    );

-- Política: Professores podem atualizar conteúdos das suas disciplinas
CREATE POLICY "teachers_update_subject_contents" ON contents
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.subject_id = contents.subject_id
              AND tcs.is_active = true
        )
    );

-- ================================================================
-- 8. ATUALIZAR POLÍTICAS RLS PARA TABELA content_classes
-- ================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Teachers can view content classes" ON content_classes;

-- Política: Professores podem ver conteúdos das suas turmas
CREATE POLICY "teachers_view_content_classes" ON content_classes
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.class_id = content_classes.class_id
              AND tcs.is_active = true
        )
    );

-- Política: Professores podem gerenciar conteúdos das suas turmas
CREATE POLICY "teachers_manage_content_classes" ON content_classes
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'professor'
        AND EXISTS (
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = auth.uid()
              AND tcs.class_id = content_classes.class_id
              AND tcs.is_active = true
        )
    );

-- ================================================================
-- 9. CONCEDER PERMISSÕES PARA NOVAS FUNÇÕES
-- ================================================================

GRANT EXECUTE ON FUNCTION has_school_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION teacher_has_class_access(uuid, uuid) TO authenticated;

-- ================================================================
-- 10. COMENTÁRIOS E DOCUMENTAÇÃO
-- ================================================================

COMMENT ON FUNCTION has_school_access IS 'Verifica se usuário tem acesso a uma escola específica (incluindo professores)';
COMMENT ON FUNCTION teacher_has_class_access IS 'Verifica se professor tem acesso a uma turma específica';
COMMENT ON POLICY "teachers_view_class_students" ON students IS 'Professores podem ver alunos das suas turmas';
COMMENT ON POLICY "teachers_view_assigned_classes" ON classes IS 'Professores podem ver suas turmas atribuídas';
COMMENT ON POLICY "teachers_view_assigned_subjects" ON subjects IS 'Professores podem ver disciplinas que ensinam';
COMMENT ON POLICY "teachers_view_subject_contents" ON contents IS 'Professores podem ver conteúdos das suas disciplinas'; 