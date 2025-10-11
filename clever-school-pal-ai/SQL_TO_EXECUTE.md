# 🔧 SQL para Criar Tabela content_classes

## ❌ Problema Identificado
A tabela `content_classes` não existe no Supabase, mas é referenciada no código. Esta tabela é essencial para:
- Associar conteúdos a múltiplas turmas
- Gerenciar atribuições de conteúdo
- Rastrear progresso de atividades

## 🚀 Solução
Execute o seguinte SQL no **Supabase Dashboard → SQL Editor**:

```sql
-- Create content_classes table for many-to-many relationship between contents and classes
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
CREATE INDEX idx_content_classes_content_id ON content_classes(content_id);
CREATE INDEX idx_content_classes_class_id ON content_classes(class_id);
CREATE INDEX idx_content_classes_status ON content_classes(status);
CREATE INDEX idx_content_classes_due_date ON content_classes(due_date);

-- Enable RLS (Row Level Security)
ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for now)
CREATE POLICY "Enable all operations for authenticated users" ON content_classes 
FOR ALL USING (auth.role() = 'authenticated');

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
```

## 📋 Passos para Executar

1. **Ir ao Dashboard do Supabase**: https://supabase.com/dashboard/project/nsaodmuqjtabfblrrdqv
2. **Navegar para SQL Editor** (ícone de terminal no menu lateral)
3. **Colar e executar o SQL acima**
4. **Verificar se a tabela foi criada** indo para Table Editor
5. **Testar a aplicação** - as turmas devem agora ser gravadas corretamente

## ✅ Após Executar o SQL

A aplicação vai funcionar corretamente com:
- ✅ Filtro de turmas por escola e ano
- ✅ Seleção múltipla de turmas
- ✅ Gravação das associações turma-conteúdo
- ✅ Gestão completa de atribuições de conteúdo

## 🔍 Verificação
Após criar a tabela, você pode verificar se funcionou executando:
```sql
SELECT COUNT(*) FROM content_classes;
```
Se retornar `0` sem erro, a tabela foi criada com sucesso! 