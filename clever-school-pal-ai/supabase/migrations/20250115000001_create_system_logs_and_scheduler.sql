-- ================================================================
-- MIGRAÇÃO: SISTEMA DE LOGS E AGENDADOR AUTOMÁTICO
-- Data: 2025-01-15
-- Descrição: Logs do sistema + Limpeza automática de chat às 5AM
-- ================================================================

-- 1. CRIAR TABELA DE LOGS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL, -- 'daily_chat_cleanup', 'error', 'info', 'warning'
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB, -- Dados detalhados em JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices separadamente para performance
CREATE INDEX IF NOT EXISTS idx_system_logs_type_created ON public.system_logs (log_type, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON public.system_logs (level, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_desc ON public.system_logs (created_at DESC);

-- 2. PERMISSÕES PARA LOGS DO SISTEMA
GRANT SELECT, INSERT ON public.system_logs TO service_role;
GRANT SELECT ON public.system_logs TO authenticated;

-- 3. RLS PARA LOGS (Só service_role pode inserir)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role full access on system_logs" ON public.system_logs;
DROP POLICY IF EXISTS "Allow authenticated read on system_logs" ON public.system_logs;

CREATE POLICY "Allow service_role full access on system_logs" 
  ON public.system_logs 
  FOR ALL 
  TO service_role 
  USING (true);

CREATE POLICY "Allow authenticated read on system_logs" 
  ON public.system_logs 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 4. FUNÇÃO PARA LIMPEZA AUTOMÁTICA DE LOGS ANTIGOS (90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  INSERT INTO public.system_logs (log_type, level, message, metadata)
  VALUES (
    'system_maintenance',
    'info',
    'Logs antigos removidos automaticamente',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'retention_period', '90 days'
    )
  );
END;
$$;

-- 5. CONFIGURAÇÃO DO PG_CRON PARA LIMPEZA ÀS 5AM (se disponível)
-- Nota: pg_cron deve estar habilitado no Supabase
-- Se a extensão cron não existir, pular programação automática
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Limpeza de chat diária às 5AM
    PERFORM cron.schedule(
      'daily-chat-cleanup-5am',
      '0 5 * * *',
      $cron$
      SELECT 
        net.http_post(
          url := 'https://nsaodmuqjtabfblrrdqv.supabase.co/functions/v1/chat-cleanup-scheduler',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''app.supabase_service_role_key'') || ""}','"}',
          body := '{"trigger": "cron_5am", "automated": true}'
        );
      $cron$
    );

    -- Limpeza de logs mensalmente (primeiro dia do mês às 6AM)
    PERFORM cron.schedule(
      'monthly-logs-cleanup',
      '0 6 1 * *',
      $cron$
      SELECT cleanup_old_system_logs();
      $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available; skipping schedule creation';
  END IF;
END $$;

-- 6. FUNÇÃO AUXILIAR PARA TESTAR LIMPEZA MANUALMENTE
CREATE OR REPLACE FUNCTION trigger_chat_cleanup_manually()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
BEGIN
  -- Chamar a Edge Function de limpeza
  SELECT 
    net.http_post(
      url := 'https://nsaodmuqjtabfblrrdqv.supabase.co/functions/v1/chat-cleanup-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''app.supabase_service_role_key'') || ""}',
      body := '{"trigger": "manual", "automated": false}'
    ) INTO response;
  
  -- Log da execução manual
  INSERT INTO public.system_logs (log_type, level, message, metadata)
  VALUES (
    'manual_chat_cleanup',
    'info',
    'Limpeza de chat executada manualmente',
    jsonb_build_object(
      'triggered_at', NOW(),
      'trigger_type', 'manual',
      'response', response
    )
  );
  
  RETURN response;
END;
$$;

-- 7. CONFIGURAÇÕES ADICIONAIS PARA WHATSAPP
-- Aumentar campo de contexto para maior capacidade


-- Índice para busca rápida por WhatsApp
CREATE INDEX IF NOT EXISTS idx_chat_logs_whatsapp 
  ON public.chat_logs (student_id, created_at DESC) 
  WHERE response_type LIKE '%whatsapp%';

-- 8. INSERIR LOG INICIAL
INSERT INTO public.system_logs (log_type, level, message, metadata)
VALUES (
  'system_setup',
  'info',
  'Sistema de limpeza automática de chat configurado',
  jsonb_build_object(
    'setup_date', NOW(),
    'features', ARRAY[
      'daily_chat_cleanup_5am',
      'monthly_logs_cleanup',
      'manual_trigger_function',
      'whatsapp_optimization'
    ],
    'chat_context_limit', 15,
    'cleanup_schedule', '5AM daily'
  )
);

-- ================================================================
-- COMENTÁRIOS DA MIGRAÇÃO
-- ================================================================

COMMENT ON TABLE public.system_logs IS 'Logs do sistema para monitoramento e auditoria';
COMMENT ON FUNCTION trigger_chat_cleanup_manually() IS 'Função para executar limpeza de chat manualmente';
COMMENT ON FUNCTION cleanup_old_system_logs() IS 'Remove logs do sistema com mais de 90 dias';

-- ================================================================
-- STATUS: MIGRAÇÃO COMPLETA
-- ================================================================