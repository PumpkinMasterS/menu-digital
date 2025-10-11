-- RPC to fetch class ids for a given subject, mirroring get_class_subject_ids
-- Used by UI to avoid direct reads of class_subjects and respect RLS

CREATE OR REPLACE FUNCTION public.get_subject_class_ids(
  p_subject_id uuid
)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(class_id ORDER BY class_id), '{}')
  FROM public.class_subjects
  WHERE subject_id = p_subject_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_subject_class_ids(uuid) TO authenticated, service_role;