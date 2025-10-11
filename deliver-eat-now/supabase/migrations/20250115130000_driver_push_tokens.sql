-- Criar tabela para armazenar tokens de push dos motoristas
CREATE TABLE IF NOT EXISTS driver_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que cada motorista tenha apenas um token ativo por plataforma
  UNIQUE(driver_id, platform)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_driver_push_tokens_driver_id ON driver_push_tokens(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_push_tokens_active ON driver_push_tokens(is_active) WHERE is_active = true;

-- RLS (Row Level Security)
ALTER TABLE driver_push_tokens ENABLE ROW LEVEL SECURITY;

-- Política para motoristas gerenciarem seus próprios tokens
CREATE POLICY "Drivers can manage their own push tokens" ON driver_push_tokens
  FOR ALL USING (auth.uid() = driver_id);

-- Política para admins visualizarem todos os tokens
CREATE POLICY "Admins can view all push tokens" ON driver_push_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_driver_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_driver_push_tokens_updated_at
  BEFORE UPDATE ON driver_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_push_tokens_updated_at();

-- Comentários para documentação
COMMENT ON TABLE driver_push_tokens IS 'Armazena tokens de push notification dos motoristas';
COMMENT ON COLUMN driver_push_tokens.driver_id IS 'ID do motorista (referência para auth.users)';
COMMENT ON COLUMN driver_push_tokens.push_token IS 'Token de push notification do Expo';
COMMENT ON COLUMN driver_push_tokens.platform IS 'Plataforma do dispositivo (ios/android)';
COMMENT ON COLUMN driver_push_tokens.is_active IS 'Indica se o token está ativo';