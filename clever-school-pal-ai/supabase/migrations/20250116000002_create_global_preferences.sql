-- Create table for global system preferences (shared by all admins)
CREATE TABLE IF NOT EXISTS global_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preference_key TEXT NOT NULL UNIQUE, -- Chave única no sistema
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_by UUID, -- Quem fez a última alteração
  last_updated_by_name TEXT -- Nome de quem fez a alteração
);

-- Add missing columns for backwards compatibility
ALTER TABLE public.global_preferences ADD COLUMN IF NOT EXISTS preference_key TEXT;
ALTER TABLE public.global_preferences ADD COLUMN IF NOT EXISTS preference_value JSONB;
ALTER TABLE public.global_preferences ADD COLUMN IF NOT EXISTS last_updated_by UUID;
ALTER TABLE public.global_preferences ADD COLUMN IF NOT EXISTS last_updated_by_name TEXT;

-- Add unique constraint if it doesn't exist
ALTER TABLE public.global_preferences ADD CONSTRAINT global_preferences_preference_key_unique UNIQUE (preference_key);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_global_preferences_key ON global_preferences(preference_key);

-- Enable RLS (permissivo para todos os admins)
ALTER TABLE global_preferences ENABLE ROW LEVEL SECURITY;

-- Política permissiva - qualquer admin autenticado pode ver e alterar
CREATE POLICY "Allow all operations for authenticated users" ON global_preferences
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Função para upsert (inserir ou atualizar) preferência global
CREATE OR REPLACE FUNCTION upsert_global_preference(
  p_key TEXT,
  p_value JSONB,
  p_updated_by UUID DEFAULT NULL,
  p_updated_by_name TEXT DEFAULT NULL
)
RETURNS global_preferences AS $$
DECLARE
  result global_preferences;
BEGIN
  INSERT INTO global_preferences (preference_key, preference_value, last_updated_by, last_updated_by_name)
  VALUES (p_key, p_value, p_updated_by, p_updated_by_name)
  ON CONFLICT (preference_key)
  DO UPDATE SET 
    preference_value = EXCLUDED.preference_value,
    updated_at = NOW(),
    last_updated_by = EXCLUDED.last_updated_by,
    last_updated_by_name = EXCLUDED.last_updated_by_name
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para obter preferência global
CREATE OR REPLACE FUNCTION get_global_preference(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT preference_value INTO result
  FROM global_preferences
  WHERE preference_key = p_key;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_global_preferences_updated_at
  BEFORE UPDATE ON global_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Dados padrão serão inseridos pela aplicação quando necessário
-- Removendo inserção automática para evitar conflitos de migração

-- Comentário final
SELECT 'Tabela global_preferences criada com sucesso! Todos os admins compartilham as mesmas preferências.' as status;