-- Criar tabela para log de notificações push
CREATE TABLE IF NOT EXISTS push_notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_driver_id ON push_notifications_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_type ON push_notifications_log(type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_sent_at ON push_notifications_log(sent_at);

-- Habilitar RLS
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Política para administradores verem todos os logs
CREATE POLICY "Admins can view all push notification logs" ON push_notifications_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para motoristas verem apenas seus próprios logs
CREATE POLICY "Drivers can view their own push notification logs" ON push_notifications_log
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'driver'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE push_notifications_log IS 'Log de notificações push enviadas para motoristas';
COMMENT ON COLUMN push_notifications_log.driver_id IS 'ID do motorista que recebeu a notificação';
COMMENT ON COLUMN push_notifications_log.title IS 'Título da notificação';
COMMENT ON COLUMN push_notifications_log.body IS 'Corpo da notificação';
COMMENT ON COLUMN push_notifications_log.type IS 'Tipo da notificação (new_delivery, delivery_update, general, account_approved, account_rejected)';
COMMENT ON COLUMN push_notifications_log.success_count IS 'Número de notificações enviadas com sucesso';
COMMENT ON COLUMN push_notifications_log.error_count IS 'Número de notificações que falharam';
COMMENT ON COLUMN push_notifications_log.errors IS 'Detalhes dos erros ocorridos durante o envio';
COMMENT ON COLUMN push_notifications_log.sent_at IS 'Data e hora do envio da notificação';