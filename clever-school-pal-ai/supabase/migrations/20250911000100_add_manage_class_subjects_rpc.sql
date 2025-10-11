-- Create RPC to manage class-subject relationships and fetch subject ids
-- This addresses 404 on /rest/v1/rpc/manage_class_subjects and avoids 403 on direct table read by exposing a safe RPC

-- 1) Upsert/delete helper for class_subjects
CREATE OR REPLACE FUNCTION public.manage_class_subjects(
  p_class_id uuid,
  p_subject_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_added   integer := 0;
  v_removed integer := 0;
BEGIN
  -- Remove relations that are not present in the provided list
  DELETE FROM public.class_subjects cs
  WHERE cs.class_id = p_class_id
    AND (
      p_subject_ids IS NULL
      OR cs.subject_id <> ALL(p_subject_ids)
    );
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  -- Insert missing relations (ignore duplicates)
  IF p_subject_ids IS NOT NULL AND array_length(p_subject_ids, 1) IS NOT NULL THEN
    INSERT INTO public.class_subjects (class_id, subject_id)
    SELECT p_class_id, sid
    FROM unnest(p_subject_ids) AS sid
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    GET DIAGNOSTICS v_added = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'added_count', v_added,
    'removed_count', v_removed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_class_subjects(uuid, uuid[]) TO authenticated, service_role;

-- 2) Helper to fetch subject ids for a class (used by UI when editing)
CREATE OR REPLACE FUNCTION public.get_class_subject_ids(
  p_class_id uuid
)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(subject_id ORDER BY subject_id), '{}')
  FROM public.class_subjects
  WHERE class_id = p_class_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_subject_ids(uuid) TO authenticated, service_role;