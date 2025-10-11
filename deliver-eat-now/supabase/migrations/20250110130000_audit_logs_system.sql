-- Migration: Sistema de Audit Logs
-- Registra ações importantes dos usuários, especialmente visualizações descendentes

-- 1. Criar tabela de mudanças de roles
CREATE TABLE role_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  old_role VARCHAR(50) NOT NULL,
  new_role VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes para performance na tabela role_changes
CREATE INDEX idx_role_changes_user_id ON role_changes(user_id);
CREATE INDEX idx_role_changes_changed_by ON role_changes(changed_by_user_id);
CREATE INDEX idx_role_changes_created_at ON role_changes(created_at DESC);

-- 2. Criar tabela de audit logs
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255), -- backup caso user seja deletado
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL, -- ex: 'ENTER_ORGANIZATION_VIEW', 'CREATE_RESTAURANT', etc
  resource_type VARCHAR(50), -- ex: 'organization', 'restaurant', 'menu', 'user'
  resource_id UUID, -- ID do recurso afetado
  resource_name VARCHAR(255), -- nome do recurso para facilitar leitura
  details JSONB, -- informações adicionais da ação
  ip_address INET, -- endereço IP do usuário
  user_agent TEXT, -- browser/app info
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT, -- caso success = false
  session_id VARCHAR(255), -- para agrupar ações da mesma sessão
  organization_scope UUID REFERENCES organizations(id), -- organização no contexto
  restaurant_scope UUID REFERENCES restaurants(id), -- restaurante no contexto
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Criar enum para tipos de ação mais comuns
CREATE TYPE audit_action_type AS ENUM (
  -- Visualizações descendentes
  'ENTER_ORGANIZATION_VIEW',
  'ENTER_REGION_VIEW', 
  'ENTER_RESTAURANT_VIEW',
  'EXIT_VISUALIZATION',
  
  -- Gestão de usuários
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'ACTIVATE_USER',
  'DEACTIVATE_USER',
  
  -- Gestão de restaurantes
  'CREATE_RESTAURANT',
  'UPDATE_RESTAURANT',
  'DELETE_RESTAURANT',
  'ACTIVATE_RESTAURANT',
  'DEACTIVATE_RESTAURANT',
  
  -- Gestão de menus
  'CREATE_MENU',
  'UPDATE_MENU',
  'DELETE_MENU',
  'CLONE_MENU_TEMPLATE',
  'CREATE_MENU_TEMPLATE',
  
  -- Gestão de pedidos
  'CREATE_ORDER',
  'UPDATE_ORDER_STATUS',
  'CANCEL_ORDER',
  'REFUND_ORDER',
  
  -- Segurança
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'ROLE_CHANGE',
  
  -- Sistema
  'BACKUP_CREATED',
  'SYSTEM_MAINTENANCE',
  'DATA_EXPORT',
  'BULK_OPERATION'
);

-- 3. Criar função helper para registrar logs
CREATE OR REPLACE FUNCTION log_audit_action(
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name VARCHAR(255) DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
  current_user_profile RECORD;
BEGIN
  -- Buscar informações do usuário atual
  SELECT id, email, role, organization_id, restaurant_id 
  INTO current_user_profile
  FROM profiles 
  WHERE id = auth.uid();

  -- Inserir log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    resource_type,
    resource_id,
    resource_name,
    details,
    success,
    error_message,
    organization_scope,
    restaurant_scope
  ) VALUES (
    auth.uid(),
    current_user_profile.email,
    current_user_profile.role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details,
    p_success,
    p_error_message,
    current_user_profile.organization_id,
    current_user_profile.restaurant_id
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar triggers automáticos para auditoria de mudanças importantes

-- Trigger: Auditoria de criação/alteração de restaurantes
CREATE OR REPLACE FUNCTION audit_restaurants_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_action(
      'CREATE_RESTAURANT',
      'restaurant',
      NEW.id,
      NEW.name,
      jsonb_build_object(
        'restaurant_data', to_jsonb(NEW),
        'trigger_type', 'auto'
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log apenas se campos importantes mudaram
    IF OLD.name != NEW.name OR OLD.is_active != NEW.is_active OR OLD.address != NEW.address THEN
      PERFORM log_audit_action(
        'UPDATE_RESTAURANT',
        'restaurant',
        NEW.id,
        NEW.name,
        jsonb_build_object(
          'old_data', to_jsonb(OLD),
          'new_data', to_jsonb(NEW),
          'trigger_type', 'auto'
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_action(
      'DELETE_RESTAURANT',
      'restaurant',
      OLD.id,
      OLD.name,
      jsonb_build_object(
        'restaurant_data', to_jsonb(OLD),
        'trigger_type', 'auto'
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_restaurants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION audit_restaurants_changes();

-- Trigger: Auditoria de criação/alteração de usuários
CREATE OR REPLACE FUNCTION audit_profiles_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_action(
      'CREATE_USER',
      'user',
      NEW.id,
      NEW.full_name,
      jsonb_build_object(
        'user_role', NEW.role,
        'user_email', NEW.email,
        'organization_id', NEW.organization_id,
        'restaurant_id', NEW.restaurant_id,
        'trigger_type', 'auto'
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log mudanças importantes
    IF OLD.role != NEW.role THEN
      PERFORM log_audit_action(
        'ROLE_CHANGE',
        'user',
        NEW.id,
        NEW.full_name,
        jsonb_build_object(
          'old_role', OLD.role,
          'new_role', NEW.role,
          'trigger_type', 'auto'
        )
      );
    END IF;
    
    IF OLD.organization_id != NEW.organization_id OR OLD.restaurant_id != NEW.restaurant_id THEN
      PERFORM log_audit_action(
        'UPDATE_USER',
        'user',
        NEW.id,
        NEW.full_name,
        jsonb_build_object(
          'old_organization_id', OLD.organization_id,
          'new_organization_id', NEW.organization_id,
          'old_restaurant_id', OLD.restaurant_id,
          'new_restaurant_id', NEW.restaurant_id,
          'trigger_type', 'auto'
        )
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_profiles_changes();

-- 5. Criar views para relatórios de auditoria

-- View: Resumo de ações por usuário
CREATE VIEW audit_summary_by_user AS
SELECT 
  user_id,
  user_email,
  user_role,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE action LIKE '%_VIEW') as view_actions,
  COUNT(*) FILTER (WHERE resource_type = 'restaurant') as restaurant_actions,
  COUNT(*) FILTER (WHERE resource_type = 'user') as user_actions,
  COUNT(*) FILTER (WHERE success = FALSE) as failed_actions,
  MIN(created_at) as first_action,
  MAX(created_at) as last_action
FROM audit_logs
GROUP BY user_id, user_email, user_role;

-- View: Ações de visualização descendente
CREATE VIEW visualization_audit_log AS
SELECT 
  id,
  user_id,
  user_email,
  user_role,
  action,
  resource_name,
  details,
  organization_scope,
  restaurant_scope,
  created_at
FROM audit_logs
WHERE action IN (
  'ENTER_ORGANIZATION_VIEW',
  'ENTER_REGION_VIEW',
  'ENTER_RESTAURANT_VIEW',
  'EXIT_VISUALIZATION'
)
ORDER BY created_at DESC;

-- View: Ações de hoje
CREATE VIEW todays_audit_log AS
SELECT *
FROM audit_logs
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- View: Ações suspeitas (muitas ações em pouco tempo)
CREATE VIEW suspicious_activities AS
SELECT 
  user_id,
  user_email,
  COUNT(*) as action_count,
  MIN(created_at) as first_action,
  MAX(created_at) as last_action,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as time_span_minutes
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, user_email
HAVING COUNT(*) > 50 -- mais de 50 ações em 1 hora
ORDER BY action_count DESC;

-- 6. Criar índices para performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_success ON audit_logs(success) WHERE success = FALSE;
CREATE INDEX idx_audit_logs_organization_scope ON audit_logs(organization_scope) WHERE organization_scope IS NOT NULL;
CREATE INDEX idx_audit_logs_restaurant_scope ON audit_logs(restaurant_scope) WHERE restaurant_scope IS NOT NULL;

-- Índice composto para queries comuns
CREATE INDEX idx_audit_logs_user_action_date ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_resource_date ON audit_logs(resource_type, resource_id, created_at DESC);

-- 7. RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Platform owners podem ver todos os logs
CREATE POLICY "Platform owners can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

-- Policy: Super admins podem ver logs da sua organização
CREATE POLICY "Super admins can view organization audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
      AND (
        profiles.organization_id = audit_logs.organization_scope
        OR profiles.id = audit_logs.user_id -- podem ver seus próprios logs
      )
    )
  );

-- Policy: Restaurant admins podem ver logs do seu restaurante
CREATE POLICY "Restaurant admins can view restaurant audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'restaurant_admin'
      AND (
        profiles.restaurant_id = audit_logs.restaurant_scope
        OR profiles.id = audit_logs.user_id -- podem ver seus próprios logs
      )
    )
  );

-- Policy: Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- 8. Função para limpeza automática de logs antigos (6 meses)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '6 months'
  AND action NOT IN (
    'CREATE_USER', 'DELETE_USER', 'ROLE_CHANGE', 
    'CREATE_RESTAURANT', 'DELETE_RESTAURANT'
  ); -- manter logs importantes permanentemente
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para gerar relatório de atividade
CREATE OR REPLACE FUNCTION generate_activity_report(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
  summary_type TEXT,
  metric_name TEXT,
  metric_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'TOTALS'::TEXT as summary_type,
    'total_actions'::TEXT as metric_name,
    COUNT(*)::BIGINT as metric_value
  FROM audit_logs 
  WHERE DATE(created_at) BETWEEN start_date AND end_date
  
  UNION ALL
  
  SELECT 
    'TOTALS'::TEXT,
    'unique_users'::TEXT,
    COUNT(DISTINCT user_id)::BIGINT
  FROM audit_logs 
  WHERE DATE(created_at) BETWEEN start_date AND end_date
  
  UNION ALL
  
  SELECT 
    'VISUALIZATION'::TEXT,
    action::TEXT,
    COUNT(*)::BIGINT
  FROM audit_logs 
  WHERE DATE(created_at) BETWEEN start_date AND end_date
  AND action LIKE '%_VIEW'
  GROUP BY action
  
  UNION ALL
  
  SELECT 
    'FAILED_ACTIONS'::TEXT,
    action::TEXT,
    COUNT(*)::BIGINT
  FROM audit_logs 
  WHERE DATE(created_at) BETWEEN start_date AND end_date
  AND success = FALSE
  GROUP BY action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Inserir alguns logs de exemplo (para demonstração)
-- Estes serão removidos em produção
INSERT INTO audit_logs (
  user_id, 
  user_email, 
  user_role, 
  action, 
  resource_type, 
  resource_name, 
  details,
  success
) VALUES 
(
  NULL, -- usuário do sistema
  'system@saborportugues.com',
  'system',
  'SYSTEM_MAINTENANCE',
  'system',
  'Database Migration',
  jsonb_build_object(
    'migration_name', '20250110130000_audit_logs_system',
    'description', 'Sistema de audit logs implementado'
  ),
  TRUE
);

COMMENT ON TABLE audit_logs IS 'Registo de todas as ações importantes realizadas na plataforma';
COMMENT ON FUNCTION log_audit_action IS 'Função helper para registar ações de auditoria';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove logs antigos (6+ meses) para otimizar performance';
COMMENT ON FUNCTION generate_activity_report IS 'Gera relatório de atividade para um período específico'; 