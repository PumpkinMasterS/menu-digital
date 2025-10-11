-- ================================================================
-- MIGRAÇÃO: SISTEMA DE PROFESSORES COMPLETO - EduConnect AI 2025
-- Data: 29/01/2025
-- Descrição: Sistema completo para professores com múltiplas turmas e disciplinas
-- ================================================================

-- ================================================================
-- 1. TABELA DE RELACIONAMENTO PROFESSOR-TURMA-DISCIPLINA
-- ================================================================

-- Remover tabela antiga se existir
DROP TABLE IF EXISTS public.teacher_classes CASCADE;

-- Criar nova tabela para relacionamento professor-turma-disciplina
CREATE TABLE IF NOT EXISTS public.teacher_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  teacher_id UUID NOT NULL, -- ID do professor (referência a auth.users)
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- Metadados
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id), -- Quem fez a atribuição
  is_active BOOLEAN DEFAULT true,
  
  -- Dados específicos da atribuição
  notes TEXT, -- Notas específicas sobre esta atribuição
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(teacher_id, class_id, subject_id) -- Um professor não pode ter a mesma disciplina na mesma turma duplicada
);

-- Adicionar coluna is_active se não existir
ALTER TABLE teacher_class_subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_teacher ON teacher_class_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_class ON teacher_class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_subject ON teacher_class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_active ON teacher_class_subjects(is_active);

-- ================================================================
-- 2. FUNÇÃO PARA ATUALIZAR TIMESTAMP
-- ================================================================

CREATE OR REPLACE FUNCTION update_teacher_class_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_class_subjects_updated_at
    BEFORE UPDATE ON teacher_class_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_class_subjects_updated_at();

-- ================================================================
-- 3. POLÍTICAS RLS PARA teacher_class_subjects
-- ================================================================

-- Habilitar RLS
ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;

-- Política: Super admins podem ver tudo
CREATE POLICY "super_admin_all_access_teacher_class_subjects" ON teacher_class_subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_app_meta_data->>'role' = 'super_admin'
        )
    );

-- Política: Diretores e coordenadores podem ver da sua escola
CREATE POLICY "school_admin_access_teacher_class_subjects" ON teacher_class_subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN classes c ON teacher_class_subjects.class_id = c.id
            WHERE u.id = auth.uid()
            AND u.raw_app_meta_data->>'role' IN ('diretor', 'coordenador')
            AND (u.raw_app_meta_data->>'school_id')::UUID = c.school_id
        )
    );

-- Política: Professores podem ver apenas suas próprias atribuições
CREATE POLICY "teacher_own_assignments_teacher_class_subjects" ON teacher_class_subjects
    FOR ALL USING (
        teacher_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_app_meta_data->>'role' = 'professor'
        )
    );

-- ================================================================
-- 4. FUNÇÃO: ATRIBUIR PROFESSOR À TURMA E DISCIPLINA
-- ================================================================

CREATE OR REPLACE FUNCTION assign_teacher_to_class_subject(
    p_teacher_id UUID,
    p_class_id UUID,
    p_subject_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_teacher_role TEXT;
    v_teacher_school_id UUID;
    v_class_school_id UUID;
    v_subject_school_id UUID;
    v_existing_assignment UUID;
    v_teacher_name TEXT;
    v_class_name TEXT;
    v_subject_name TEXT;
BEGIN
    -- Verificar se o usuário é professor
    SELECT 
        raw_app_meta_data->>'role',
        (raw_app_meta_data->>'school_id')::UUID,
        raw_user_meta_data->>'name'
    INTO v_teacher_role, v_teacher_school_id, v_teacher_name
    FROM auth.users
    WHERE id = p_teacher_id;
    
    IF v_teacher_role IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuário não encontrado'
        );
    END IF;
    
    IF v_teacher_role != 'professor' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuário não é professor'
        );
    END IF;
    
    -- Verificar se a turma existe e pegar a escola
    SELECT school_id, name INTO v_class_school_id, v_class_name
    FROM classes
    WHERE id = p_class_id;
    
    IF v_class_school_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Turma não encontrada'
        );
    END IF;
    
    -- Verificar se a disciplina existe e pegar a escola
    SELECT school_id, name INTO v_subject_school_id, v_subject_name
    FROM subjects
    WHERE id = p_subject_id;
    
    IF v_subject_school_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Disciplina não encontrada'
        );
    END IF;
    
    -- Verificar se professor, turma e disciplina são da mesma escola
    IF v_teacher_school_id != v_class_school_id OR v_teacher_school_id != v_subject_school_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Professor, turma e disciplina devem ser da mesma escola'
        );
    END IF;
    
    -- Verificar se já existe atribuição ativa
    SELECT id INTO v_existing_assignment
    FROM teacher_class_subjects
    WHERE teacher_id = p_teacher_id 
      AND class_id = p_class_id 
      AND subject_id = p_subject_id
      AND is_active = true;
    
    IF v_existing_assignment IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Professor já está atribuído a esta disciplina nesta turma'
        );
    END IF;
    
    -- Criar atribuição
    INSERT INTO teacher_class_subjects (
        teacher_id, 
        class_id, 
        subject_id, 
        assigned_by, 
        notes
    ) VALUES (
        p_teacher_id, 
        p_class_id, 
        p_subject_id, 
        auth.uid(), 
        p_notes
    );
    
    RETURN json_build_object(
        'success', true,
        'message', format('Professor %s atribuído à disciplina %s na turma %s', 
                         v_teacher_name, v_subject_name, v_class_name),
        'assignment', json_build_object(
            'teacher_name', v_teacher_name,
            'class_name', v_class_name,
            'subject_name', v_subject_name
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erro interno: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. FUNÇÃO: REMOVER PROFESSOR DA TURMA E DISCIPLINA
-- ================================================================

CREATE OR REPLACE FUNCTION remove_teacher_from_class_subject(
    p_teacher_id UUID,
    p_class_id UUID,
    p_subject_id UUID
) RETURNS JSON AS $$
DECLARE
    v_assignment_id UUID;
    v_teacher_name TEXT;
    v_class_name TEXT;
    v_subject_name TEXT;
BEGIN
    -- Verificar se existe atribuição ativa
    SELECT tcs.id INTO v_assignment_id
    FROM teacher_class_subjects tcs
    WHERE tcs.teacher_id = p_teacher_id 
      AND tcs.class_id = p_class_id 
      AND tcs.subject_id = p_subject_id
      AND tcs.is_active = true;
    
    IF v_assignment_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Atribuição não encontrada ou já inativa'
        );
    END IF;
    
    -- Buscar nomes para retorno
    SELECT 
        u.raw_user_meta_data->>'name',
        c.name,
        s.name
    INTO v_teacher_name, v_class_name, v_subject_name
    FROM teacher_class_subjects tcs
    JOIN auth.users u ON tcs.teacher_id = u.id
    JOIN classes c ON tcs.class_id = c.id
    JOIN subjects s ON tcs.subject_id = s.id
    WHERE tcs.id = v_assignment_id;
    
    -- Desativar atribuição (soft delete)
    UPDATE teacher_class_subjects
    SET is_active = false, updated_at = NOW()
    WHERE id = v_assignment_id;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Professor %s removido da disciplina %s na turma %s', 
                         v_teacher_name, v_subject_name, v_class_name)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erro interno: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. FUNÇÃO: LISTAR ATRIBUIÇÕES DO PROFESSOR
-- ================================================================

CREATE OR REPLACE FUNCTION get_teacher_assignments(p_teacher_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    class_id UUID,
    class_name TEXT,
    class_grade TEXT,
    subject_id UUID,
    subject_name TEXT,
    school_id UUID,
    school_name TEXT,
    student_count BIGINT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tcs.id,
        c.id,
        c.name,
        c.grade,
        s.id,
        s.name,
        c.school_id,
        sch.name,
        COUNT(st.id) as student_count,
        tcs.assigned_at,
        tcs.notes
    FROM teacher_class_subjects tcs
    JOIN classes c ON tcs.class_id = c.id
    JOIN subjects s ON tcs.subject_id = s.id
    JOIN schools sch ON c.school_id = sch.id
    LEFT JOIN students st ON st.class_id = c.id AND st.active = true
    WHERE tcs.teacher_id = p_teacher_id
      AND tcs.is_active = true
    GROUP BY tcs.id, c.id, c.name, c.grade, s.id, s.name, c.school_id, sch.name, tcs.assigned_at, tcs.notes
    ORDER BY c.grade, c.name, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. FUNÇÃO: LISTAR PROFESSORES DA ESCOLA COM SUAS ATRIBUIÇÕES
-- ================================================================

CREATE OR REPLACE FUNCTION get_school_teachers_with_assignments(p_school_id UUID)
RETURNS TABLE (
    teacher_id UUID,
    teacher_name TEXT,
    teacher_email TEXT,
    total_assignments BIGINT,
    assignments JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.raw_user_meta_data->>'name' as name,
        u.email,
        COUNT(tcs.id) as total_assignments,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'class_name', c.name,
                    'class_grade', c.grade,
                    'subject_name', s.name,
                    'student_count', (
                        SELECT COUNT(*) FROM students st 
                        WHERE st.class_id = c.id AND st.active = true
                    ),
                    'assigned_at', tcs.assigned_at
                )
                ORDER BY c.grade, c.name, s.name
            ) FILTER (WHERE tcs.id IS NOT NULL),
            '[]'::JSON
        ) as assignments
    FROM auth.users u
    LEFT JOIN teacher_class_subjects tcs ON u.id = tcs.teacher_id AND tcs.is_active = true
    LEFT JOIN classes c ON tcs.class_id = c.id
    LEFT JOIN subjects s ON tcs.subject_id = s.id
    WHERE u.raw_app_meta_data->>'role' = 'professor'
      AND (u.raw_app_meta_data->>'school_id')::UUID = p_school_id
    GROUP BY u.id, u.raw_user_meta_data->>'name', u.email
    ORDER BY u.raw_user_meta_data->>'name';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. FUNÇÃO: VERIFICAR ACESSO DO PROFESSOR À TURMA E DISCIPLINA
-- ================================================================

CREATE OR REPLACE FUNCTION teacher_has_class_subject_access(
    p_teacher_id UUID,
    p_class_id UUID,
    p_subject_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN := false;
BEGIN
    -- Se subject_id for fornecido, verificar acesso específico
    IF p_subject_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM teacher_class_subjects
            WHERE teacher_id = p_teacher_id 
              AND class_id = p_class_id 
              AND subject_id = p_subject_id
              AND is_active = true
        ) INTO v_has_access;
    ELSE
        -- Verificar se professor tem qualquer acesso à turma
        SELECT EXISTS(
            SELECT 1 FROM teacher_class_subjects
            WHERE teacher_id = p_teacher_id 
              AND class_id = p_class_id
              AND is_active = true
        ) INTO v_has_access;
    END IF;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 9. FUNÇÃO: BUSCAR TURMAS E DISCIPLINAS DISPONÍVEIS PARA PROFESSOR
-- ================================================================

CREATE OR REPLACE FUNCTION get_available_class_subjects_for_teacher(p_teacher_id UUID)
RETURNS TABLE (
    class_id UUID,
    class_name TEXT,
    class_grade TEXT,
    subject_id UUID,
    subject_name TEXT,
    school_id UUID,
    school_name TEXT,
    already_assigned BOOLEAN
) AS $$
DECLARE
    v_teacher_school_id UUID;
BEGIN
    -- Buscar escola do professor
    SELECT (raw_app_meta_data->>'school_id')::UUID INTO v_teacher_school_id
    FROM auth.users
    WHERE id = p_teacher_id
      AND raw_app_meta_data->>'role' = 'professor';
    
    IF v_teacher_school_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.grade,
        s.id,
        s.name,
        c.school_id,
        sch.name,
        EXISTS(
            SELECT 1 FROM teacher_class_subjects tcs
            WHERE tcs.teacher_id = p_teacher_id
              AND tcs.class_id = c.id
              AND tcs.subject_id = s.id
              AND tcs.is_active = true
        ) as already_assigned
    FROM classes c
    JOIN schools sch ON c.school_id = sch.id
    CROSS JOIN subjects s
    WHERE c.school_id = v_teacher_school_id
      AND s.school_id = v_teacher_school_id
      AND s.grade = c.grade -- Disciplina deve ser do mesmo ano da turma
    ORDER BY c.grade, c.name, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 10. CONCEDER PERMISSÕES
-- ================================================================

-- Permitir que usuários autenticados executem as funções
GRANT EXECUTE ON FUNCTION assign_teacher_to_class_subject(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_teacher_from_class_subject(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_teachers_with_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION teacher_has_class_subject_access(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_class_subjects_for_teacher(UUID) TO authenticated;