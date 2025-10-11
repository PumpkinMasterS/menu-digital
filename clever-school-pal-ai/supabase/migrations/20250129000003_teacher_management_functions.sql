-- ================================================================
-- MIGRAÇÃO: FUNÇÕES COMPLEMENTARES PARA SISTEMA DE PROFESSORES
-- Data: 29/01/2025
-- Descrição: Funções complementares e limpeza do sistema antigo
-- ================================================================

-- ================================================================
-- 1. REMOVER FUNÇÕES ANTIGAS
-- ================================================================

DROP FUNCTION IF EXISTS assign_teacher_to_class(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS get_teacher_classes(TEXT);
DROP FUNCTION IF EXISTS is_teacher_of_class(UUID, UUID);
DROP FUNCTION IF EXISTS teacher_has_access(UUID, UUID);

-- ================================================================
-- 2. FUNÇÃO: ESTATÍSTICAS DO PROFESSOR
-- ================================================================

CREATE OR REPLACE FUNCTION get_teacher_statistics(p_teacher_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'total_classes', COUNT(DISTINCT tcs.class_id),
        'total_subjects', COUNT(DISTINCT tcs.subject_id),
        'total_students', COALESCE(SUM(
            (SELECT COUNT(*) FROM students st 
             WHERE st.class_id = tcs.class_id AND st.active = true)
        ), 0),
        'assignments_by_grade', JSON_AGG(
            DISTINCT JSON_BUILD_OBJECT(
                'grade', c.grade,
                'class_count', (
                    SELECT COUNT(*) FROM teacher_class_subjects tcs2
                    JOIN classes c2 ON tcs2.class_id = c2.id
                    WHERE tcs2.teacher_id = p_teacher_id
                      AND c2.grade = c.grade
                      AND tcs2.is_active = true
                )
            )
        ) FILTER (WHERE c.grade IS NOT NULL)
    ) INTO v_stats
    FROM teacher_class_subjects tcs
    JOIN classes c ON tcs.class_id = c.id
    WHERE tcs.teacher_id = p_teacher_id
      AND tcs.is_active = true;
    
    RETURN COALESCE(v_stats, JSON_BUILD_OBJECT(
        'total_classes', 0,
        'total_subjects', 0,
        'total_students', 0,
        'assignments_by_grade', '[]'::JSON
    ));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Erro ao buscar estatísticas: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. FUNÇÃO: BUSCAR PROFESSORES POR DISCIPLINA
-- ================================================================

CREATE OR REPLACE FUNCTION get_teachers_by_subject(
    p_subject_id UUID,
    p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
    teacher_id UUID,
    teacher_name TEXT,
    teacher_email TEXT,
    classes_teaching TEXT[],
    total_students BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.raw_user_meta_data->>'name' as name,
        u.email,
        ARRAY_AGG(c.name ORDER BY c.name) as classes_teaching,
        SUM(
            (SELECT COUNT(*) FROM students st 
             WHERE st.class_id = c.id AND st.active = true)
        ) as total_students
    FROM auth.users u
    JOIN teacher_class_subjects tcs ON u.id = tcs.teacher_id
    JOIN classes c ON tcs.class_id = c.id
    WHERE tcs.subject_id = p_subject_id
      AND tcs.is_active = true
      AND u.raw_app_meta_data->>'role' = 'professor'
      AND (p_school_id IS NULL OR c.school_id = p_school_id)
    GROUP BY u.id, u.raw_user_meta_data->>'name', u.email
    ORDER BY u.raw_user_meta_data->>'name';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. FUNÇÃO: BUSCAR TURMAS SEM PROFESSOR PARA DISCIPLINA
-- ================================================================

CREATE OR REPLACE FUNCTION get_classes_without_teacher_for_subject(
    p_subject_id UUID,
    p_school_id UUID
)
RETURNS TABLE (
    class_id UUID,
    class_name TEXT,
    class_grade TEXT,
    student_count BIGINT,
    has_subject BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.grade,
        COUNT(st.id) as student_count,
        EXISTS(
            SELECT 1 FROM class_subjects cs
            WHERE cs.class_id = c.id AND cs.subject_id = p_subject_id
        ) as has_subject
    FROM classes c
    LEFT JOIN students st ON st.class_id = c.id AND st.active = true
    WHERE c.school_id = p_school_id
      AND NOT EXISTS (
          SELECT 1 FROM teacher_class_subjects tcs
          WHERE tcs.class_id = c.id 
            AND tcs.subject_id = p_subject_id
            AND tcs.is_active = true
      )
      -- Verificar se a disciplina é do mesmo ano da turma
      AND EXISTS (
          SELECT 1 FROM subjects s
          WHERE s.id = p_subject_id
            AND s.grade = c.grade
      )
    GROUP BY c.id, c.name, c.grade
    ORDER BY c.grade, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. FUNÇÃO: TRANSFERIR ATRIBUIÇÕES DE PROFESSOR
-- ================================================================

CREATE OR REPLACE FUNCTION transfer_teacher_assignments(
    p_from_teacher_id UUID,
    p_to_teacher_id UUID,
    p_class_id UUID DEFAULT NULL,
    p_subject_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_from_teacher_name TEXT;
    v_to_teacher_name TEXT;
    v_assignments_transferred INTEGER := 0;
    v_filter_condition TEXT := '';
BEGIN
    -- Verificar se ambos são professores
    SELECT raw_user_meta_data->>'name' INTO v_from_teacher_name
    FROM auth.users
    WHERE id = p_from_teacher_id
      AND raw_app_meta_data->>'role' = 'professor';
    
    SELECT raw_user_meta_data->>'name' INTO v_to_teacher_name
    FROM auth.users
    WHERE id = p_to_teacher_id
      AND raw_app_meta_data->>'role' = 'professor';
    
    IF v_from_teacher_name IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Professor de origem não encontrado'
        );
    END IF;
    
    IF v_to_teacher_name IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Professor de destino não encontrado'
        );
    END IF;
    
    -- Verificar se são da mesma escola
    IF NOT EXISTS (
        SELECT 1 FROM auth.users u1, auth.users u2
        WHERE u1.id = p_from_teacher_id
          AND u2.id = p_to_teacher_id
          AND u1.raw_app_meta_data->>'school_id' = u2.raw_app_meta_data->>'school_id'
    ) THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Professores devem ser da mesma escola'
        );
    END IF;
    
    -- Desativar atribuições antigas
    UPDATE teacher_class_subjects
    SET is_active = false, updated_at = NOW()
    WHERE teacher_id = p_from_teacher_id
      AND is_active = true
      AND (p_class_id IS NULL OR class_id = p_class_id)
      AND (p_subject_id IS NULL OR subject_id = p_subject_id);
    
    GET DIAGNOSTICS v_assignments_transferred = ROW_COUNT;
    
    -- Criar novas atribuições para o novo professor
    INSERT INTO teacher_class_subjects (teacher_id, class_id, subject_id, assigned_by, notes)
    SELECT 
        p_to_teacher_id,
        class_id,
        subject_id,
        auth.uid(),
        format('Transferido de %s em %s', v_from_teacher_name, NOW()::DATE)
    FROM teacher_class_subjects
    WHERE teacher_id = p_from_teacher_id
      AND is_active = false
      AND updated_at = NOW()::DATE
      AND (p_class_id IS NULL OR class_id = p_class_id)
      AND (p_subject_id IS NULL OR subject_id = p_subject_id)
    ON CONFLICT (teacher_id, class_id, subject_id) DO NOTHING;
    
    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', format('Transferidas %s atribuições de %s para %s', 
                         v_assignments_transferred, v_from_teacher_name, v_to_teacher_name),
        'assignments_transferred', v_assignments_transferred
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Erro na transferência: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. FUNÇÃO: RELATÓRIO COMPLETO DE ATRIBUIÇÕES DA ESCOLA
-- ================================================================

CREATE OR REPLACE FUNCTION get_school_assignments_report(p_school_id UUID)
RETURNS JSON AS $$
DECLARE
    v_report JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'school_info', (
            SELECT JSON_BUILD_OBJECT(
                'id', id,
                'name', name,
                'total_teachers', (
                    SELECT COUNT(*) FROM auth.users
                    WHERE raw_app_meta_data->>'role' = 'professor'
                      AND (raw_app_meta_data->>'school_id')::UUID = p_school_id
                ),
                'total_classes', (
                    SELECT COUNT(*) FROM classes WHERE school_id = p_school_id
                ),
                'total_subjects', (
                    SELECT COUNT(*) FROM subjects WHERE school_id = p_school_id
                )
            )
            FROM schools WHERE id = p_school_id
        ),
        'assignments_by_grade', (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'grade', grade,
                    'classes', JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'class_name', class_name,
                            'subjects', subjects
                        )
                    )
                )
            )
            FROM (
                SELECT 
                    c.grade,
                    c.name as class_name,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'subject_name', s.name,
                            'teacher_name', u.raw_user_meta_data->>'name',
                            'teacher_email', u.email,
                            'assigned_at', tcs.assigned_at
                        )
                    ) as subjects
                FROM classes c
                LEFT JOIN teacher_class_subjects tcs ON c.id = tcs.class_id AND tcs.is_active = true
                LEFT JOIN subjects s ON tcs.subject_id = s.id
                LEFT JOIN auth.users u ON tcs.teacher_id = u.id
                WHERE c.school_id = p_school_id
                GROUP BY c.grade, c.name
                ORDER BY c.grade, c.name
            ) grade_data
            GROUP BY grade
        ),
        'unassigned_combinations', (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'class_name', c.name,
                    'class_grade', c.grade,
                    'subject_name', s.name,
                    'student_count', (
                        SELECT COUNT(*) FROM students st 
                        WHERE st.class_id = c.id AND st.active = true
                    )
                )
            )
            FROM classes c
            CROSS JOIN subjects s
            WHERE c.school_id = p_school_id
              AND s.school_id = p_school_id
              AND s.grade = c.grade
              AND NOT EXISTS (
                  SELECT 1 FROM teacher_class_subjects tcs
                  WHERE tcs.class_id = c.id
                    AND tcs.subject_id = s.id
                    AND tcs.is_active = true
              )
        )
    ) INTO v_report;
    
    RETURN v_report;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Erro ao gerar relatório: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. CONCEDER PERMISSÕES
-- ================================================================

GRANT EXECUTE ON FUNCTION get_teacher_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teachers_by_subject(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_classes_without_teacher_for_subject(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_teacher_assignments(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_assignments_report(UUID) TO authenticated;

-- ================================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ================================================================

COMMENT ON FUNCTION get_teacher_statistics IS 'Retorna estatísticas detalhadas de um professor';
COMMENT ON FUNCTION get_teachers_by_subject IS 'Lista professores que ensinam uma disciplina específica';
COMMENT ON FUNCTION get_classes_without_teacher_for_subject IS 'Lista turmas sem professor para uma disciplina';
COMMENT ON FUNCTION transfer_teacher_assignments IS 'Transfere atribuições de um professor para outro';
COMMENT ON FUNCTION get_school_assignments_report IS 'Gera relatório completo de atribuições da escola'; 