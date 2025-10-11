-- Corrigir Problemas de Integridade dos Dados
-- Este SQL deve ser executado no Supabase SQL Editor

-- 1. Verificar e listar problemas de integridade
SELECT 'VERIFICAÇÃO DE INTEGRIDADE - CLASSES' as check_type;

-- Listar classes com school_id inválido
SELECT 
  c.id as class_id,
  c.name as class_name,
  c.school_id,
  s.name as school_name,
  CASE 
    WHEN s.id IS NULL THEN 'SCHOOL_ID INVÁLIDO'
    ELSE 'OK'
  END as status
FROM public.classes c
LEFT JOIN public.schools s ON s.id = c.school_id
ORDER BY c.id;

-- 2. Verificar escolas disponíveis
SELECT 'ESCOLAS DISPONÍVEIS' as info;
SELECT id, name, city, state FROM public.schools ORDER BY id;

-- 3. Corrigir classes com school_id inválido
-- Assumindo que temos pelo menos 2 escolas (IDs 1 e 2)
-- Vamos distribuir as classes problemáticas entre as escolas existentes

UPDATE public.classes 
SET school_id = 1 
WHERE school_id NOT IN (SELECT id FROM public.schools)
AND id % 2 = 1; -- Classes com ID ímpar vão para escola 1

UPDATE public.classes 
SET school_id = 2 
WHERE school_id NOT IN (SELECT id FROM public.schools)
AND id % 2 = 0; -- Classes com ID par vão para escola 2

-- Se só tiver uma escola, todas as classes problemáticas vão para ela
UPDATE public.classes 
SET school_id = (SELECT MIN(id) FROM public.schools)
WHERE school_id NOT IN (SELECT id FROM public.schools);

-- 4. Verificar e corrigir students com class_id ou school_id inválido
SELECT 'VERIFICAÇÃO DE INTEGRIDADE - STUDENTS' as check_type;

-- Listar students com problemas
SELECT 
  s.id as student_id,
  s.name as student_name,
  s.email,
  s.class_id,
  c.name as class_name,
  s.school_id,
  sc.name as school_name,
  CASE 
    WHEN c.id IS NULL THEN 'CLASS_ID INVÁLIDO'
    WHEN sc.id IS NULL THEN 'SCHOOL_ID INVÁLIDO'
    WHEN s.school_id != c.school_id THEN 'SCHOOL_ID INCONSISTENTE'
    ELSE 'OK'
  END as status
FROM public.students s
LEFT JOIN public.classes c ON c.id = s.class_id
LEFT JOIN public.schools sc ON sc.id = s.school_id
ORDER BY s.id;

-- Corrigir students com class_id inválido
UPDATE public.students 
SET class_id = (
  SELECT MIN(id) FROM public.classes 
  WHERE school_id = students.school_id
)
WHERE class_id NOT IN (SELECT id FROM public.classes);

-- Corrigir students com school_id inválido
UPDATE public.students 
SET school_id = (
  SELECT school_id FROM public.classes 
  WHERE id = students.class_id
)
WHERE school_id NOT IN (SELECT id FROM public.schools);

-- Corrigir inconsistências entre school_id do student e da class
UPDATE public.students 
SET school_id = (
  SELECT school_id FROM public.classes 
  WHERE id = students.class_id
)
WHERE EXISTS (
  SELECT 1 FROM public.classes c 
  WHERE c.id = students.class_id 
  AND c.school_id != students.school_id
);

-- 5. Verificar e corrigir subjects com school_id inválido
SELECT 'VERIFICAÇÃO DE INTEGRIDADE - SUBJECTS' as check_type;

-- Listar subjects com problemas
SELECT 
  s.id as subject_id,
  s.name as subject_name,
  s.school_id,
  sc.name as school_name,
  CASE 
    WHEN sc.id IS NULL THEN 'SCHOOL_ID INVÁLIDO'
    ELSE 'OK'
  END as status
FROM public.subjects s
LEFT JOIN public.schools sc ON sc.id = s.school_id
ORDER BY s.id;

-- Corrigir subjects com school_id inválido
-- Distribuir entre escolas existentes
UPDATE public.subjects 
SET school_id = 1 
WHERE school_id NOT IN (SELECT id FROM public.schools)
AND id % 2 = 1;

UPDATE public.subjects 
SET school_id = 2 
WHERE school_id NOT IN (SELECT id FROM public.schools)
AND id % 2 = 0;

-- Fallback para uma escola se só existir uma
UPDATE public.subjects 
SET school_id = (SELECT MIN(id) FROM public.schools)
WHERE school_id NOT IN (SELECT id FROM public.schools);

-- 6. Verificar e corrigir contents com subject_id inválido
SELECT 'VERIFICAÇÃO DE INTEGRIDADE - CONTENTS' as check_type;

-- Listar contents com problemas
SELECT 
  c.id as content_id,
  c.title,
  c.subject_id,
  s.name as subject_name,
  CASE 
    WHEN s.id IS NULL THEN 'SUBJECT_ID INVÁLIDO'
    ELSE 'OK'
  END as status
FROM public.contents c
LEFT JOIN public.subjects s ON s.id = c.subject_id
ORDER BY c.id;

-- Corrigir contents com subject_id inválido
UPDATE public.contents 
SET subject_id = (SELECT MIN(id) FROM public.subjects)
WHERE subject_id NOT IN (SELECT id FROM public.subjects);

-- 7. Verificação final de integridade
SELECT 'VERIFICAÇÃO FINAL DE INTEGRIDADE' as final_check;

-- Contar registros com problemas após correção
SELECT 
  'Classes com school_id inválido' as problema,
  COUNT(*) as quantidade
FROM public.classes c
LEFT JOIN public.schools s ON s.id = c.school_id
WHERE s.id IS NULL

UNION ALL

SELECT 
  'Students com class_id inválido' as problema,
  COUNT(*) as quantidade
FROM public.students st
LEFT JOIN public.classes c ON c.id = st.class_id
WHERE c.id IS NULL

UNION ALL

SELECT 
  'Students com school_id inválido' as problema,
  COUNT(*) as quantidade
FROM public.students st
LEFT JOIN public.schools s ON s.id = st.school_id
WHERE s.id IS NULL

UNION ALL

SELECT 
  'Students com school_id inconsistente' as problema,
  COUNT(*) as quantidade
FROM public.students st
JOIN public.classes c ON c.id = st.class_id
WHERE st.school_id != c.school_id

UNION ALL

SELECT 
  'Subjects com school_id inválido' as problema,
  COUNT(*) as quantidade
FROM public.subjects sub
LEFT JOIN public.schools s ON s.id = sub.school_id
WHERE s.id IS NULL

UNION ALL

SELECT 
  'Contents com subject_id inválido' as problema,
  COUNT(*) as quantidade
FROM public.contents c
LEFT JOIN public.subjects s ON s.id = c.subject_id
WHERE s.id IS NULL;

SELECT 'Correção de integridade dos dados concluída' as status;