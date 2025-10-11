-- Create content_classes table for many-to-many relationship between contents and classes

-- Drop table if exists (for safety)
DROP TABLE IF EXISTS content_classes CASCADE;

-- Create content_classes table
CREATE TABLE content_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    is_required BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    
    -- Ensure unique content-class pairs
    UNIQUE(content_id, class_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_classes_content_id ON content_classes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_class_id ON content_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_status ON content_classes(status);
CREATE INDEX IF NOT EXISTS idx_content_classes_due_date ON content_classes(due_date);

-- Enable RLS (Row Level Security)
ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view content_classes for their schools" ON content_classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contents c
            JOIN subjects s ON c.subject_id = s.id
            WHERE c.id = content_classes.content_id
        )
    );

CREATE POLICY "Users can insert content_classes for their schools" ON content_classes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM contents c
            JOIN subjects s ON c.subject_id = s.id
            WHERE c.id = content_classes.content_id
        )
    );

CREATE POLICY "Users can update content_classes for their schools" ON content_classes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM contents c
            JOIN subjects s ON c.subject_id = s.id
            WHERE c.id = content_classes.content_id
        )
    );

CREATE POLICY "Users can delete content_classes for their schools" ON content_classes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM contents c
            JOIN subjects s ON c.subject_id = s.id
            WHERE c.id = content_classes.content_id
        )
    );

-- Grant permissions
GRANT ALL ON content_classes TO authenticated;
GRANT ALL ON content_classes TO service_role;

-- Add comments for documentation
COMMENT ON TABLE content_classes IS 'Junction table linking contents to classes for assignment management';
COMMENT ON COLUMN content_classes.content_id IS 'Reference to the content being assigned';
COMMENT ON COLUMN content_classes.class_id IS 'Reference to the class receiving the assignment';
COMMENT ON COLUMN content_classes.assigned_at IS 'When the content was assigned to the class';
COMMENT ON COLUMN content_classes.due_date IS 'Optional due date for the assignment';
COMMENT ON COLUMN content_classes.is_required IS 'Whether the content is required or optional';
COMMENT ON COLUMN content_classes.status IS 'Current status of the assignment';