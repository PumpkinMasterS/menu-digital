-- Create table for admin preferences (personality, themes, etc.)
CREATE TABLE IF NOT EXISTS admin_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add admin_id column for backwards compatibility
ALTER TABLE public.admin_preferences ADD COLUMN IF NOT EXISTS admin_id UUID;
ALTER TABLE public.admin_preferences ADD COLUMN IF NOT EXISTS preference_key TEXT;
ALTER TABLE public.admin_preferences ADD COLUMN IF NOT EXISTS preference_value JSONB;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_preferences_admin_id_preference_key_key' AND conrelid = 'admin_preferences'::regclass
  ) THEN
    ALTER TABLE admin_preferences ADD CONSTRAINT admin_preferences_admin_id_preference_key_key UNIQUE (admin_id, preference_key);
  END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_preferences_admin_id ON admin_preferences(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_preferences_key ON admin_preferences(preference_key);

-- Enable RLS
ALTER TABLE admin_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas para admins
CREATE POLICY "Allow all operations for authenticated users" ON admin_preferences
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Função para upsert (inserir ou atualizar)
CREATE OR REPLACE FUNCTION upsert_admin_preference(
  p_admin_id UUID,
  p_key TEXT,
  p_value JSONB
)
RETURNS admin_preferences AS $$
DECLARE
  result admin_preferences;
BEGIN
  INSERT INTO admin_preferences (admin_id, preference_key, preference_value)
  VALUES (p_admin_id, p_key, p_value)
  ON CONFLICT (admin_id, preference_key)
  DO UPDATE SET 
    preference_value = EXCLUDED.preference_value,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para obter preferência
CREATE OR REPLACE FUNCTION get_admin_preference(
  p_admin_id UUID,
  p_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT preference_value INTO result
  FROM admin_preferences
  WHERE admin_id = p_admin_id AND preference_key = p_key;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_preferences_updated_at
  BEFORE UPDATE ON admin_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Dados padrão serão inseridos pela aplicação quando necessário
-- Removendo inserção automática para evitar conflitos de migração

-- Comentário final
SELECT 'Tabela admin_preferences criada com sucesso!' as status;