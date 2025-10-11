-- Migration: Sistema de Menu Digital Completo
-- Inspirado no Uber Eats/Glovo com categorias, produtos, modificadores e opções

-- ============================================================================
-- 1. CATEGORIAS DE MENU (com suporte a hierarquia)
-- ============================================================================

CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100), -- Suporte a multiple idiomas
    description TEXT,
    parent_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE, -- Para subcategorias
    sort_order INTEGER DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. PRODUTOS/ITENS DE MENU  
-- ============================================================================

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    description TEXT,
    description_en TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Configurações de modificadores
    has_modifiers BOOLEAN DEFAULT false,
    
    -- Metadata para combos/menus
    is_combo BOOLEAN DEFAULT false,
    combo_description TEXT,
    
    -- SEO e tags
    tags TEXT[], -- Ex: ['vegetariano', 'picante', 'sem-gluten']
    allergens TEXT[], -- Ex: ['nuts', 'dairy', 'gluten']
    
    -- Disponibilidade por horário
    available_from TIME,
    available_until TIME,
    available_days INTEGER[], -- 0=domingo, 1=segunda, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_price CHECK (base_price >= 0)
);

-- ============================================================================
-- 3. MODIFICADORES/GRUPOS DE OPÇÕES
-- ============================================================================

CREATE TABLE menu_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    
    -- Regras de seleção
    is_required BOOLEAN DEFAULT false,
    min_select INTEGER DEFAULT 0,
    max_select INTEGER DEFAULT 1,
    
    -- UI/UX
    display_type VARCHAR(20) DEFAULT 'radio', -- 'radio', 'checkbox', 'dropdown'
    sort_order INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_selection_rules CHECK (
        min_select >= 0 AND 
        max_select >= min_select AND
        (NOT is_required OR min_select > 0)
    )
);

-- ============================================================================
-- 4. OPÇÕES DOS MODIFICADORES
-- ============================================================================

CREATE TABLE menu_modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    
    -- Preço adicional (pode ser negativo para descontos)
    price_modifier DECIMAL(10,2) DEFAULT 0,
    
    -- UI/UX
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    
    -- Metadata
    image_url TEXT,
    tags TEXT[],
    allergens TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. RELACIONAMENTO PRODUTO <-> MODIFICADORES
-- ============================================================================

CREATE TABLE menu_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    modifier_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    
    -- Permite override das regras do modificador para este item específico
    override_required BOOLEAN,
    override_min_select INTEGER,
    override_max_select INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(item_id, modifier_id)
);

-- ============================================================================
-- 6. MENU TEMPLATES (Para clonagem entre restaurantes)
-- ============================================================================

CREATE TABLE menu_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL, -- Estrutura completa do menu serializada
    category VARCHAR(50), -- 'fast-food', 'restaurant', 'coffee-shop', etc.
    is_public BOOLEAN DEFAULT false, -- Se outros podem usar este template
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES PARA PERFORMANCE
-- ============================================================================

-- Categories
CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX idx_menu_categories_parent_id ON menu_categories(parent_id);
CREATE INDEX idx_menu_categories_sort_order ON menu_categories(restaurant_id, sort_order);

-- Items
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(restaurant_id, is_featured);
CREATE INDEX idx_menu_items_sort_order ON menu_items(category_id, sort_order);

-- Modifiers
CREATE INDEX idx_menu_modifiers_restaurant_id ON menu_modifiers(restaurant_id);
CREATE INDEX idx_menu_modifier_options_modifier_id ON menu_modifier_options(modifier_id);
CREATE INDEX idx_menu_item_modifiers_item_id ON menu_item_modifiers(item_id);
CREATE INDEX idx_menu_item_modifiers_modifier_id ON menu_item_modifiers(modifier_id);

-- Templates
CREATE INDEX idx_menu_templates_organization_id ON menu_templates(organization_id);
CREATE INDEX idx_menu_templates_category ON menu_templates(category);

-- ============================================================================
-- TRIGGERS PARA AUTO-UPDATE
-- ============================================================================

CREATE TRIGGER update_menu_categories_updated_at 
    BEFORE UPDATE ON menu_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_modifiers_updated_at 
    BEFORE UPDATE ON menu_modifiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_modifier_options_updated_at 
    BEFORE UPDATE ON menu_modifier_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_templates_updated_at 
    BEFORE UPDATE ON menu_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para calcular preço final de um item com modificadores
CREATE OR REPLACE FUNCTION calculate_item_final_price(
    item_id_param UUID,
    selected_options UUID[]
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    base_price DECIMAL(10,2);
    option_price DECIMAL(10,2);
    total_price DECIMAL(10,2);
BEGIN
    -- Busca preço base do item
    SELECT mi.base_price INTO base_price
    FROM menu_items mi
    WHERE mi.id = item_id_param;
    
    IF base_price IS NULL THEN
        RETURN 0;
    END IF;
    
    total_price := base_price;
    
    -- Soma preços dos modificadores selecionados
    SELECT COALESCE(SUM(mmo.price_modifier), 0) INTO option_price
    FROM menu_modifier_options mmo
    WHERE mmo.id = ANY(selected_options);
    
    total_price := total_price + COALESCE(option_price, 0);
    
    RETURN total_price;
END;
$$ LANGUAGE plpgsql;

-- Função para validar seleção de modificadores
CREATE OR REPLACE FUNCTION validate_modifier_selection(
    item_id_param UUID,
    modifier_selections JSONB -- Formato: {"modifier_id": ["option_id1", "option_id2"]}
) RETURNS BOOLEAN AS $$
DECLARE
    modifier_record RECORD;
    selected_count INTEGER;
BEGIN
    -- Verifica cada modificador do item
    FOR modifier_record IN
        SELECT mm.*, mim.override_required, mim.override_min_select, mim.override_max_select
        FROM menu_modifiers mm
        JOIN menu_item_modifiers mim ON mm.id = mim.modifier_id
        WHERE mim.item_id = item_id_param
    LOOP
        -- Conta quantas opções foram selecionadas para este modificador
        SELECT COALESCE(jsonb_array_length(modifier_selections->modifier_record.id::text), 0) 
        INTO selected_count;
        
        -- Usa override se existir, senão usa valores padrão
        DECLARE
            required BOOLEAN := COALESCE(modifier_record.override_required, modifier_record.is_required);
            min_sel INTEGER := COALESCE(modifier_record.override_min_select, modifier_record.min_select);
            max_sel INTEGER := COALESCE(modifier_record.override_max_select, modifier_record.max_select);
        BEGIN
            -- Valida se modificador obrigatório foi preenchido
            IF required AND selected_count = 0 THEN
                RETURN FALSE;
            END IF;
            
            -- Valida limites de seleção
            IF selected_count < min_sel OR selected_count > max_sel THEN
                RETURN FALSE;
            END IF;
        END;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql; 

-- =====================================================
-- 15. PERFORMANCE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Função para buscar estatísticas do dashboard de forma otimizada
CREATE OR REPLACE FUNCTION get_dashboard_stats(scope_organization_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  WITH counts AS (
    SELECT 
      COUNT(DISTINCT profiles.id) FILTER (
        WHERE CASE 
          WHEN scope_organization_id IS NOT NULL THEN profiles.organization_id = scope_organization_id
          ELSE TRUE
        END
      ) as total_users,
      
      COUNT(DISTINCT restaurants.id) FILTER (
        WHERE CASE 
          WHEN scope_organization_id IS NOT NULL THEN restaurants.organization_id = scope_organization_id
          ELSE TRUE
        END
      ) as total_restaurants,
      
      COUNT(DISTINCT drivers.id) FILTER (
        WHERE CASE 
          WHEN scope_organization_id IS NOT NULL THEN drivers.organization_id = scope_organization_id
          ELSE TRUE
        END
      ) as total_drivers,
      
      COUNT(DISTINCT orders.id) FILTER (
        WHERE CASE 
          WHEN scope_organization_id IS NOT NULL THEN EXISTS(
            SELECT 1 FROM restaurants r WHERE r.id = orders.restaurant_id AND r.organization_id = scope_organization_id
          )
          ELSE TRUE
        END
      ) as total_orders,
      
      COUNT(DISTINCT orders.id) FILTER (
        WHERE orders.created_at >= CURRENT_DATE 
        AND CASE 
          WHEN scope_organization_id IS NOT NULL THEN EXISTS(
            SELECT 1 FROM restaurants r WHERE r.id = orders.restaurant_id AND r.organization_id = scope_organization_id
          )
          ELSE TRUE
        END
      ) as today_orders,
      
      COALESCE(SUM(orders.total_amount) FILTER (
        WHERE orders.status = 'delivered'
        AND CASE 
          WHEN scope_organization_id IS NOT NULL THEN EXISTS(
            SELECT 1 FROM restaurants r WHERE r.id = orders.restaurant_id AND r.organization_id = scope_organization_id
          )
          ELSE TRUE
        END
      ), 0) as revenue
    FROM profiles
    FULL OUTER JOIN restaurants ON TRUE
    FULL OUTER JOIN drivers ON TRUE
    FULL OUTER JOIN orders ON TRUE
  )
  SELECT json_build_object(
    'totalUsers', total_users,
    'totalRestaurants', total_restaurants, 
    'totalDrivers', total_drivers,
    'totalOrders', total_orders,
    'todayOrders', today_orders,
    'revenue', revenue
  ) INTO stats FROM counts;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar logs antigos (performance maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS VOID AS $$
BEGIN
  -- Remove logs mais antigos que 90 dias
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Remove cache entries expirados
  DELETE FROM view_scope_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduler para limpeza automática (executar mensalmente)
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 2 1 * *', -- 1º dia de cada mês às 2h
  'SELECT cleanup_old_audit_logs();'
);

-- =====================================================
-- 16. INDEXES PARA PERFORMANCE
-- =====================================================

-- Indexes para queries de dashboard otimizadas
CREATE INDEX IF NOT EXISTS idx_profiles_organization_role ON profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_restaurants_organization_active ON restaurants(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_organization_status ON drivers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_amount ON orders(status, total_amount) WHERE status = 'delivered';

-- Indexes para cache management
CREATE INDEX IF NOT EXISTS idx_view_scope_cache_expires ON view_scope_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_cleanup ON audit_logs(created_at) WHERE created_at < NOW() - INTERVAL '30 days';

-- =====================================================
-- 17. PERFORMANCE VIEWS
-- =====================================================

-- View para estatísticas em tempo real
CREATE OR REPLACE VIEW dashboard_stats_realtime AS
SELECT 
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT r.id) as total_restaurants,
  COUNT(DISTINCT d.id) as total_drivers,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= CURRENT_DATE) as today_orders,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'delivered'), 0) as total_revenue
FROM profiles p
FULL OUTER JOIN restaurants r ON TRUE
FULL OUTER JOIN drivers d ON TRUE  
FULL OUTER JOIN orders o ON TRUE;

-- View para performance de restaurantes
CREATE OR REPLACE VIEW restaurant_performance_summary AS
SELECT 
  r.id,
  r.name,
  r.organization_id,
  COUNT(o.id) as total_orders,
  AVG(o.total_amount) as avg_order_value,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered') as completed_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
  ROUND(
    COUNT(o.id) FILTER (WHERE o.status = 'cancelled')::numeric / 
    NULLIF(COUNT(o.id), 0) * 100, 2
  ) as cancellation_rate,
  MAX(o.created_at) as last_order_date
FROM restaurants r
LEFT JOIN orders o ON r.id = o.restaurant_id
GROUP BY r.id, r.name, r.organization_id;

-- =====================================================
-- 18. TRIGGERS PARA CACHE INVALIDATION
-- =====================================================

-- Função para invalidar cache quando dados relevantes mudam
CREATE OR REPLACE FUNCTION invalidate_dashboard_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidar cache relacionado a estatísticas
  DELETE FROM view_scope_cache 
  WHERE cache_key LIKE 'dashboard_stats%' 
     OR cache_key LIKE 'organizations%'
     OR cache_key LIKE 'restaurants%';
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para invalidação automática de cache
CREATE TRIGGER trigger_invalidate_cache_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION invalidate_dashboard_cache();

CREATE TRIGGER trigger_invalidate_cache_restaurants  
  AFTER INSERT OR UPDATE OR DELETE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION invalidate_dashboard_cache();

CREATE TRIGGER trigger_invalidate_cache_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION invalidate_dashboard_cache();

-- =====================================================
-- FINAL GRANTS E COMENTÁRIOS
-- =====================================================

-- Grant permissions para funções otimizadas
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;

-- Comentários explicativos
COMMENT ON FUNCTION get_dashboard_stats IS 'Função otimizada para buscar estatísticas do dashboard com scope organizacional';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Função de manutenção para limpar logs antigos automaticamente';
COMMENT ON VIEW dashboard_stats_realtime IS 'View em tempo real para estatísticas gerais do sistema';
COMMENT ON VIEW restaurant_performance_summary IS 'View com resumo de performance por restaurante'; 