-- Add missing columns to existing tables

-- Add school_id column to subjects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'school_id'
    ) THEN
        ALTER TABLE subjects ADD COLUMN school_id UUID;
    END IF;
END $$;

-- Add missing columns to subjects table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'grade'
    ) THEN
        ALTER TABLE subjects ADD COLUMN grade TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'teacher_name'
    ) THEN
        ALTER TABLE subjects ADD COLUMN teacher_name TEXT;
    END IF;
END $$;

-- Add school_id column to classes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'school_id'
    ) THEN
        ALTER TABLE classes ADD COLUMN school_id UUID;
    END IF;
END $$;

-- Add missing columns to classes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'grade'
    ) THEN
        ALTER TABLE classes ADD COLUMN grade TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'academic_year'
    ) THEN
        ALTER TABLE classes ADD COLUMN academic_year TEXT;
    END IF;
END $$;

-- Add foreign key constraints after columns exist
DO $$
BEGIN
    -- Add foreign key for subjects.school_id if schools table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'subjects_school_id_fkey'
        ) THEN
            ALTER TABLE subjects ADD CONSTRAINT subjects_school_id_fkey 
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    -- Add foreign key for classes.school_id if schools table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'classes_school_id_fkey'
        ) THEN
            ALTER TABLE classes ADD CONSTRAINT classes_school_id_fkey 
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

-- Insert sample data for subjects if table is empty (using base table structure)
INSERT INTO subjects (name, description, grade, teacher_name) 
SELECT 'Matemática', 'Disciplina de matemática básica', '1º Ano', 'Prof. João Silva'
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'Matemática');

INSERT INTO subjects (name, description, grade, teacher_name) 
SELECT 'Português', 'Língua portuguesa e literatura', '1º Ano', 'Prof. Maria Santos'
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'Português');

INSERT INTO subjects (name, description, grade, teacher_name) 
SELECT 'Ciências', 'Ciências naturais', '1º Ano', 'Prof. Ana Costa'
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'Ciências');

INSERT INTO subjects (name, description, grade, teacher_name) 
SELECT 'História', 'História do Brasil e mundial', '2º Ano', 'Prof. Carlos Lima'
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'História');

INSERT INTO subjects (name, description, grade, teacher_name) 
SELECT 'Geografia', 'Geografia física e humana', '2º Ano', 'Prof. Lucia Oliveira'
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'Geografia');

-- Remove NOT NULL constraint from school_id if it exists
DO $$
BEGIN
    -- Remove NOT NULL constraint from classes.school_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'school_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE classes ALTER COLUMN school_id DROP NOT NULL;
    END IF;
    
    -- Remove NOT NULL constraint from subjects.school_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'school_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE subjects ALTER COLUMN school_id DROP NOT NULL;
    END IF;
END $$;

-- Insert sample data for classes if table is empty (using base table structure)
INSERT INTO classes (name, grade, academic_year, description) 
SELECT 'Turma A', '1º Ano', '2024', 'Turma do primeiro ano - manhã'
WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'Turma A' AND grade = '1º Ano');

INSERT INTO classes (name, grade, academic_year, description) 
SELECT 'Turma B', '1º Ano', '2024', 'Turma do primeiro ano - tarde'
WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'Turma B' AND grade = '1º Ano');

INSERT INTO classes (name, grade, academic_year, description) 
SELECT 'Turma A', '2º Ano', '2024', 'Turma do segundo ano - manhã'
WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'Turma A' AND grade = '2º Ano');

INSERT INTO classes (name, grade, academic_year, description) 
SELECT 'Turma B', '2º Ano', '2024', 'Turma do segundo ano - tarde'
WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'Turma B' AND grade = '2º Ano');

INSERT INTO classes (name, grade, academic_year, description) 
SELECT 'Turma A', '3º Ano', '2024', 'Turma do terceiro ano - manhã'
WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'Turma A' AND grade = '3º Ano');