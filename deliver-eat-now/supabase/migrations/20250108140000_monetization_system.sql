-- ============================================================================
-- SISTEMA DE MONETIZAÇÃO E FLUXO FINANCEIRO
-- Migration to implement complete monetization model with commission system
-- ============================================================================

-- Create enum for payment cycles
CREATE TYPE payment_cycle AS ENUM ('semanal', 'quinzenal', 'mensal');

-- Create enum for feature types
CREATE TYPE feature_type AS ENUM ('payment', 'subscription', 'analytics', 'marketing', 'mobile_app', 'advanced');

-- ============================================================================
-- FEATURES PREMIUM SYSTEM
-- ============================================================================

-- Table: features - Available premium features
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  feature_code TEXT UNIQUE NOT NULL,
  feature_type feature_type NOT NULL DEFAULT 'advanced',
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  setup_fee DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false, -- true for organization-wide features
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: organization_features - Features activated per organization
CREATE TABLE public.organization_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  monthly_price_override DECIMAL(10,2), -- custom pricing
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, feature_id)
);

-- Table: restaurant_features - Features activated per restaurant
CREATE TABLE public.restaurant_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  monthly_price_override DECIMAL(10,2), -- custom pricing
  activated_by UUID REFERENCES auth.users(id), -- who activated it
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, feature_id)
);

-- ============================================================================
-- COMMISSION SYSTEM
-- ============================================================================

-- Table: commission_config - Global commission configuration
CREATE TABLE public.commission_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  
  -- Commission percentages (can be NULL to use global defaults)
  super_admin_percent DECIMAL(5,2), -- % for super admin (e.g., 15%)
  platform_owner_percent DECIMAL(5,2) DEFAULT 1.00, -- % for platform owner (1-5% flexible)
  driver_percent DECIMAL(5,2), -- % for driver (optional)
  driver_fixed_amount DECIMAL(10,2), -- fixed amount per delivery (alternative to %)
  
  -- Payment cycle configuration
  payment_cycle payment_cycle DEFAULT 'semanal',
  next_payment_date DATE,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either organization or restaurant level config
  CONSTRAINT check_config_level CHECK (
    (organization_id IS NOT NULL AND restaurant_id IS NULL) OR
    (organization_id IS NULL AND restaurant_id IS NOT NULL)
  )
);

-- Table: global_commission_defaults - Platform-wide defaults
CREATE TABLE public.global_commission_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_percent DECIMAL(5,2) DEFAULT 15.00,
  platform_owner_percent DECIMAL(5,2) DEFAULT 1.00, -- 1-5% flexible
  driver_percent DECIMAL(5,2) DEFAULT 0.00,
  driver_fixed_amount DECIMAL(10,2) DEFAULT 3.00, -- €3 per delivery
  payment_cycle payment_cycle DEFAULT 'semanal',
  min_platform_percent DECIMAL(5,2) DEFAULT 1.00,
  max_platform_percent DECIMAL(5,2) DEFAULT 5.00,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT TRACKING SYSTEM
-- ============================================================================

-- Table: payment_splits - Track payment splits for each order
CREATE TABLE public.payment_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id),
  organization_id UUID REFERENCES public.organizations(id),
  super_admin_id UUID REFERENCES auth.users(id),
  driver_id UUID REFERENCES public.drivers(id),
  
  -- Original amounts
  total_order_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Commission calculations
  super_admin_percent DECIMAL(5,2) NOT NULL,
  platform_owner_percent DECIMAL(5,2) NOT NULL,
  driver_percent DECIMAL(5,2) DEFAULT 0,
  driver_fixed_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Split amounts
  restaurant_amount DECIMAL(10,2) NOT NULL, -- net amount to restaurant
  super_admin_amount DECIMAL(10,2) NOT NULL,
  platform_owner_amount DECIMAL(10,2) NOT NULL,
  driver_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Feature fees (monthly charges)
  feature_fees DECIMAL(10,2) DEFAULT 0,
  
  -- Payment status
  is_paid BOOLEAN DEFAULT false,
  payment_cycle payment_cycle DEFAULT 'semanal',
  payment_batch_id UUID, -- groups payments together
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: payment_batches - Group payments for processing
CREATE TABLE public.payment_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_name TEXT NOT NULL,
  payment_cycle payment_cycle NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  total_splits INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS FOR COMMISSION CALCULATIONS
-- ============================================================================

-- Function to get commission config for a restaurant
CREATE OR REPLACE FUNCTION get_commission_config(restaurant_id_input UUID)
RETURNS TABLE(
  super_admin_percent DECIMAL(5,2),
  platform_owner_percent DECIMAL(5,2),
  driver_percent DECIMAL(5,2),
  driver_fixed_amount DECIMAL(10,2),
  payment_cycle payment_cycle
) AS $$
DECLARE
  restaurant_config RECORD;
  org_config RECORD;
  global_config RECORD;
BEGIN
  -- Get restaurant-specific config
  SELECT * INTO restaurant_config
  FROM commission_config
  WHERE restaurant_id = restaurant_id_input AND is_active = true
  LIMIT 1;
  
  -- Get organization-specific config
  SELECT cc.* INTO org_config
  FROM commission_config cc
  JOIN restaurants r ON r.organization_id = cc.organization_id
  WHERE r.id = restaurant_id_input AND cc.is_active = true
  LIMIT 1;
  
  -- Get global defaults
  SELECT * INTO global_config
  FROM global_commission_defaults
  LIMIT 1;
  
  -- Return config with fallback hierarchy
  RETURN QUERY SELECT
    COALESCE(restaurant_config.super_admin_percent, org_config.super_admin_percent, global_config.super_admin_percent),
    COALESCE(restaurant_config.platform_owner_percent, org_config.platform_owner_percent, global_config.platform_owner_percent),
    COALESCE(restaurant_config.driver_percent, org_config.driver_percent, global_config.driver_percent),
    COALESCE(restaurant_config.driver_fixed_amount, org_config.driver_fixed_amount, global_config.driver_fixed_amount),
    COALESCE(restaurant_config.payment_cycle, org_config.payment_cycle, global_config.payment_cycle);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate payment split for an order
CREATE OR REPLACE FUNCTION calculate_payment_split(order_id_input UUID)
RETURNS UUID AS $$
DECLARE
  order_record RECORD;
  config_record RECORD;
  split_id UUID;
  restaurant_net_amount DECIMAL(10,2);
  super_admin_commission DECIMAL(10,2);
  platform_commission DECIMAL(10,2);
  driver_commission DECIMAL(10,2);
  restaurant_org_id UUID;
  super_admin_user_id UUID;
BEGIN
  -- Get order details
  SELECT o.*, r.organization_id INTO order_record, restaurant_org_id
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.id = order_id_input;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', order_id_input;
  END IF;
  
  -- Get commission config
  SELECT * INTO config_record
  FROM get_commission_config(order_record.restaurant_id);
  
  -- Get super admin for this organization
  SELECT p.id INTO super_admin_user_id
  FROM profiles p
  WHERE p.organization_id = restaurant_org_id
    AND p.role = 'super_admin'
    AND p.is_active = true
  LIMIT 1;
  
  -- Calculate commissions
  super_admin_commission := order_record.total_amount * (config_record.super_admin_percent / 100);
  platform_commission := order_record.total_amount * (config_record.platform_owner_percent / 100);
  
  -- Driver commission (percentage or fixed amount)
  IF config_record.driver_percent > 0 THEN
    driver_commission := order_record.total_amount * (config_record.driver_percent / 100);
  ELSE
    driver_commission := COALESCE(config_record.driver_fixed_amount, 0);
  END IF;
  
  -- Restaurant net amount
  restaurant_net_amount := order_record.total_amount - super_admin_commission - platform_commission - driver_commission;
  
  -- Insert payment split record
  INSERT INTO payment_splits (
    order_id,
    restaurant_id,
    organization_id,
    super_admin_id,
    driver_id,
    total_order_amount,
    delivery_fee,
    super_admin_percent,
    platform_owner_percent,
    driver_percent,
    driver_fixed_amount,
    restaurant_amount,
    super_admin_amount,
    platform_owner_amount,
    driver_amount,
    payment_cycle
  ) VALUES (
    order_record.id,
    order_record.restaurant_id,
    restaurant_org_id,
    super_admin_user_id,
    order_record.driver_id,
    order_record.total_amount,
    order_record.delivery_fee,
    config_record.super_admin_percent,
    config_record.platform_owner_percent,
    config_record.driver_percent,
    config_record.driver_fixed_amount,
    restaurant_net_amount,
    super_admin_commission,
    platform_commission,
    driver_commission,
    config_record.payment_cycle
  ) RETURNING id INTO split_id;
  
  RETURN split_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER TO AUTO-CALCULATE SPLITS
-- ============================================================================

-- Function to trigger split calculation when order is delivered
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate split when order is marked as delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    PERFORM calculate_payment_split(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic split calculation
CREATE TRIGGER trigger_calculate_split_on_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_delivered();

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert global commission defaults
INSERT INTO global_commission_defaults (
  super_admin_percent,
  platform_owner_percent,
  driver_percent,
  driver_fixed_amount,
  payment_cycle,
  min_platform_percent,
  max_platform_percent
) VALUES (
  15.00, -- 15% for super admin
  1.00,  -- 1% for platform owner (flexible 1-5%)
  0.00,  -- 0% for driver (using fixed amount instead)
  3.00,  -- €3 fixed per delivery
  'semanal',
  1.00,  -- min 1%
  5.00   -- max 5%
);

-- Insert default premium features
INSERT INTO features (name, description, feature_code, feature_type, monthly_price, setup_fee) VALUES
('Pagamentos Online', 'MB WAY, Cartão de Crédito, Stripe Connect', 'online_payments', 'payment', 9.99, 0),
('Subscrições e Fidelização', 'Sistema completo de subscrições e programas de fidelidade', 'subscriptions', 'subscription', 14.99, 0),
('App Mobile Branded', 'Aplicação móvel personalizada para o restaurante', 'mobile_app', 'mobile_app', 49.99, 199.99),
('Estatísticas Avançadas', 'Analytics detalhados, relatórios financeiros e insights', 'advanced_analytics', 'analytics', 4.99, 0),
('Marketing Avançado', 'Cupões, promoções, email marketing e campanhas', 'advanced_marketing', 'marketing', 6.99, 0),
('Integração POS', 'Integração com sistemas de ponto de venda', 'pos_integration', 'advanced', 19.99, 99.99),
('Multi-localização', 'Gestão de múltiplas localizações do restaurante', 'multi_location', 'advanced', 12.99, 0);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_commission_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;

-- Features policies (public read, admin write)
CREATE POLICY "Anyone can view active features" ON features
  FOR SELECT USING (is_active = true);

CREATE POLICY "Platform owners can manage features" ON features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'platform_owner'
    )
  );

-- Commission config policies
CREATE POLICY "Platform owners can manage all commission configs" ON commission_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'platform_owner'
    )
  );

CREATE POLICY "Super admins can view their organization commission config" ON commission_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role = 'super_admin'
        AND p.organization_id = commission_config.organization_id
    )
  );

-- Payment splits policies
CREATE POLICY "Platform owners can view all payment splits" ON payment_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'platform_owner'
    )
  );

CREATE POLICY "Super admins can view their organization payment splits" ON payment_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role = 'super_admin'
        AND p.organization_id = payment_splits.organization_id
    )
  );

CREATE POLICY "Restaurant admins can view their restaurant payment splits" ON payment_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN restaurants r ON r.owner_id = p.id
      WHERE p.id = auth.uid() 
        AND p.role = 'restaurant_admin'
        AND r.id = payment_splits.restaurant_id
    )
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_payment_splits_restaurant ON payment_splits(restaurant_id);
CREATE INDEX idx_payment_splits_organization ON payment_splits(organization_id);
CREATE INDEX idx_payment_splits_payment_cycle ON payment_splits(payment_cycle, is_paid);
CREATE INDEX idx_payment_splits_created_at ON payment_splits(created_at);
CREATE INDEX idx_commission_config_restaurant ON commission_config(restaurant_id);
CREATE INDEX idx_commission_config_organization ON commission_config(organization_id);
CREATE INDEX idx_restaurant_features_restaurant ON restaurant_features(restaurant_id);
CREATE INDEX idx_organization_features_organization ON organization_features(organization_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE features IS 'Available premium features for pay-per-feature model';
COMMENT ON TABLE commission_config IS 'Commission configuration per restaurant/organization with flexible platform owner percentage (1-5%)';
COMMENT ON TABLE payment_splits IS 'Tracks payment splits for each order with automatic calculation';
COMMENT ON TABLE global_commission_defaults IS 'Platform-wide default commission settings';
COMMENT ON FUNCTION get_commission_config IS 'Gets commission configuration with fallback hierarchy';
COMMENT ON FUNCTION calculate_payment_split IS 'Calculates and stores payment split for delivered orders'; 