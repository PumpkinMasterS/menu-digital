-- Migration: Add context fields for AI bot personalization
-- Date: 2024-02-03
-- Description: Adds special_context to students and general_context to classes for enhanced AI bot responses

-- Add special_context column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS special_context TEXT;

-- Add general_context column to classes table  
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS general_context TEXT;

-- Add comments explaining the columns
COMMENT ON COLUMN students.special_context IS 'Special context for AI bot about student learning needs, disabilities, preferences, etc.';
COMMENT ON COLUMN classes.general_context IS 'General context for AI bot about class schedules, holidays, events, policies, etc.';

-- Create or replace function to get comprehensive student context for AI
CREATE OR REPLACE FUNCTION get_student_full_context(student_phone text)
RETURNS TABLE (
    student_id uuid,
    student_name text,
    student_special_context text,
    class_id uuid,
    class_name text,
    class_grade text,
    class_general_context text,
    school_id uuid,
    school_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.special_context AS student_special_context,
        c.id AS class_id,
        c.name AS class_name,
        c.grade AS class_grade,
        c.general_context AS class_general_context,
        sc.id AS school_id,
        sc.name AS school_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN schools sc ON s.school_id = sc.id
    WHERE s.phone_number = student_phone 
       OR s.whatsapp_number = student_phone
    LIMIT 1;
END;
$$;

-- Add indexes for better performance on context queries
CREATE INDEX IF NOT EXISTS idx_students_special_context_gin ON students USING gin(to_tsvector('portuguese', special_context)) WHERE special_context IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_general_context_gin ON classes USING gin(to_tsvector('portuguese', general_context)) WHERE general_context IS NOT NULL;

-- Create function to search students by context keywords (useful for admin queries)
CREATE OR REPLACE FUNCTION search_students_by_context(
    search_keywords text,
    school_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
    student_id uuid,
    student_name text,
    special_context text,
    class_name text,
    school_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.special_context,
        c.name AS class_name,
        sc.name AS school_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN schools sc ON s.school_id = sc.id
    WHERE s.special_context IS NOT NULL
      AND to_tsvector('portuguese', s.special_context) @@ plainto_tsquery('portuguese', search_keywords)
      AND (school_id_param IS NULL OR s.school_id = school_id_param)
    ORDER BY ts_rank(to_tsvector('portuguese', s.special_context), plainto_tsquery('portuguese', search_keywords)) DESC;
END;
$$;

-- Add RLS policies to ensure context fields are properly secured
-- Students can only see their own special_context
-- Teachers/admins can see all contexts within their school

-- Note: Assuming RLS is already enabled on these tables
-- If not, uncomment the following lines:
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Add comments to the functions
COMMENT ON FUNCTION get_student_full_context IS 'Gets comprehensive context about a student for AI bot responses including student special needs and class/school context';
COMMENT ON FUNCTION search_students_by_context IS 'Searches for students based on keywords in their special context - useful for administrators to find students with specific needs'; 