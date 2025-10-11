-- Criar Políticas RLS Baseadas em Roles
-- Este SQL deve ser executado no Supabase SQL Editor

-- 1. Remover todas as políticas existentes
DROP POLICY IF EXISTS "authenticated_full_access" ON public.schools;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.classes;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.subjects;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.students;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.contents;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.teacher_class_subjects;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.content_classes;

-- 2. POLÍTICAS PARA TABELA SCHOOLS

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_schools_all" ON public.schools
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem ver e editar apenas sua escola
CREATE POLICY "director_schools_own" ON public.schools
FOR ALL TO authenticated
USING (public.has_role('director') AND public.can_access_school(id))
WITH CHECK (public.has_role('director') AND public.can_access_school(id));

-- Teachers e students podem apenas ver sua escola
CREATE POLICY "teacher_student_schools_read" ON public.schools
FOR SELECT TO authenticated
USING (public.has_role_or_higher('student') AND public.can_access_school(id));

-- 3. POLÍTICAS PARA TABELA CLASSES

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_classes_all" ON public.classes
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem gerenciar turmas de sua escola
CREATE POLICY "director_classes_school" ON public.classes
FOR ALL TO authenticated
USING (public.has_role('director') AND public.can_access_school(school_id))
WITH CHECK (public.has_role('director') AND public.can_access_school(school_id));

-- Teachers podem ver turmas onde lecionam
CREATE POLICY "teacher_classes_assigned" ON public.classes
FOR SELECT TO authenticated
USING (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.class_id = classes.id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Students podem ver apenas sua turma
CREATE POLICY "student_classes_own" ON public.classes
FOR SELECT TO authenticated
USING (
  public.has_role('student') AND 
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.class_id = classes.id
    AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 4. POLÍTICAS PARA TABELA SUBJECTS

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_subjects_all" ON public.subjects
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem gerenciar matérias de sua escola
CREATE POLICY "director_subjects_school" ON public.subjects
FOR ALL TO authenticated
USING (public.has_role('director') AND public.can_access_school(school_id))
WITH CHECK (public.has_role('director') AND public.can_access_school(school_id));

-- Teachers podem ver matérias que lecionam
CREATE POLICY "teacher_subjects_assigned" ON public.subjects
FOR SELECT TO authenticated
USING (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.subject_id = subjects.id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Students podem ver matérias de sua turma
CREATE POLICY "student_subjects_class" ON public.subjects
FOR SELECT TO authenticated
USING (
  public.has_role('student') AND 
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teacher_class_subjects tcs ON tcs.class_id = s.class_id
    WHERE tcs.subject_id = subjects.id
    AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 5. POLÍTICAS PARA TABELA STUDENTS

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_students_all" ON public.students
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem gerenciar alunos de sua escola
CREATE POLICY "director_students_school" ON public.students
FOR ALL TO authenticated
USING (public.has_role('director') AND public.can_access_school(school_id))
WITH CHECK (public.has_role('director') AND public.can_access_school(school_id));

-- Teachers podem ver alunos de suas turmas
CREATE POLICY "teacher_students_classes" ON public.students
FOR SELECT TO authenticated
USING (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.class_id = students.class_id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Students podem ver apenas seus próprios dados
CREATE POLICY "student_own_data" ON public.students
FOR SELECT TO authenticated
USING (
  public.has_role('student') AND 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Students podem atualizar alguns de seus dados
CREATE POLICY "student_update_own" ON public.students
FOR UPDATE TO authenticated
USING (
  public.has_role('student') AND 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  public.has_role('student') AND 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 6. POLÍTICAS PARA TABELA CONTENTS

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_contents_all" ON public.contents
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem gerenciar conteúdos de sua escola
CREATE POLICY "director_contents_school" ON public.contents
FOR ALL TO authenticated
USING (
  public.has_role('director') AND 
  EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = contents.subject_id
    AND public.can_access_school(s.school_id)
  )
)
WITH CHECK (
  public.has_role('director') AND 
  EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = contents.subject_id
    AND public.can_access_school(s.school_id)
  )
);

-- Teachers podem gerenciar conteúdos de suas matérias
CREATE POLICY "teacher_contents_subjects" ON public.contents
FOR ALL TO authenticated
USING (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.subject_id = contents.subject_id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.subject_id = contents.subject_id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Students podem ver conteúdos de suas turmas
CREATE POLICY "student_contents_class" ON public.contents
FOR SELECT TO authenticated
USING (
  public.has_role('student') AND 
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.content_classes cc ON cc.class_id = s.class_id
    WHERE cc.content_id = contents.id
    AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 7. POLÍTICAS PARA TABELA TEACHER_CLASS_SUBJECTS

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_tcs_all" ON public.teacher_class_subjects
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem gerenciar associações de sua escola
CREATE POLICY "director_tcs_school" ON public.teacher_class_subjects
FOR ALL TO authenticated
USING (
  public.has_role('director') AND 
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = teacher_class_subjects.class_id
    AND public.can_access_school(c.school_id)
  )
)
WITH CHECK (
  public.has_role('director') AND 
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = teacher_class_subjects.class_id
    AND public.can_access_school(c.school_id)
  )
);

-- Teachers podem ver suas próprias associações
CREATE POLICY "teacher_tcs_own" ON public.teacher_class_subjects
FOR SELECT TO authenticated
USING (
  public.has_role('teacher') AND 
  teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 8. POLÍTICAS PARA TABELA CONTENT_CLASSES

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_cc_all" ON public.content_classes
FOR ALL TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Directors podem gerenciar associações de sua escola
CREATE POLICY "director_cc_school" ON public.content_classes
FOR ALL TO authenticated
USING (
  public.has_role('director') AND 
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = content_classes.class_id
    AND public.can_access_school(c.school_id)
  )
)
WITH CHECK (
  public.has_role('director') AND 
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = content_classes.class_id
    AND public.can_access_school(c.school_id)
  )
);

-- Teachers podem gerenciar associações de suas turmas/matérias
CREATE POLICY "teacher_cc_assigned" ON public.content_classes
FOR ALL TO authenticated
USING (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.class_id = content_classes.class_id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  public.has_role('teacher') AND 
  EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    WHERE tcs.class_id = content_classes.class_id
    AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Students podem ver associações de suas turmas
CREATE POLICY "student_cc_class" ON public.content_classes
FOR SELECT TO authenticated
USING (
  public.has_role('student') AND 
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.class_id = content_classes.class_id
    AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 9. Remover acesso anônimo (desabilitar políticas para usuários não autenticados)
-- As políticas acima só se aplicam a usuários autenticados
-- Usuários anônimos não terão acesso a nenhuma tabela

SELECT 'Políticas RLS baseadas em roles criadas com sucesso' as status;