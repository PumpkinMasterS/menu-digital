-- ============================================================================
-- SUBSCRIPTION SYSTEM WITH MB WAY PAYMENTS - MIGRATION
-- Version: 1.0.0
-- Date: 2025-01-07
-- Author: SaborPortugues Team
-- Description: Sistema completo de assinaturas com MB WAY SIBS como primário
-- ============================================================================

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Subscription status enum
CREATE TYPE subscription_status_new AS ENUM ('active', 'paused', 'cancelled', 'expired', 'pending_payment');

-- Payment method enum (focused on MB WAY)
CREATE TYPE payment_method_new AS ENUM ('mbway_sibs', 'mbway_ifthenpay', 'mbway_eupago', 'mbway_easypay', 'stripe_card', 'bank_transfer');

-- Payment status enum
CREATE TYPE payment_status_new AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');

-- Plan billing cycle enum
CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'annual');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Plans table - Define subscription plans available
CREATE TABLE subscription_plans_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Plan details
    name TEXT NOT NULL,
    name_pt TEXT NOT NULL,
    description TEXT,
    description_pt TEXT,
    
    -- Pricing (in euro cents for precision)
    price_cents INTEGER NOT NULL, -- e.g., 1999 for €19.99
    currency TEXT DEFAULT 'EUR',
    
    -- Platform commission
    platform_fee_percentage DECIMAL(5,2) DEFAULT 5.0, -- e.g., 5.0 for 5%
    
    -- Plan limits and features
    delivery_limit INTEGER NOT NULL, -- Number of deliveries included
    max_menu_items INTEGER DEFAULT NULL, -- NULL = unlimited
    analytics_included BOOLEAN DEFAULT true,
    priority_support BOOLEAN DEFAULT false,
    custom_branding BOOLEAN DEFAULT false,
    
    -- Billing configuration
    billing_cycle billing_cycle DEFAULT 'monthly',
    billing_cycle_days INTEGER DEFAULT 30, -- For custom cycles
    trial_days INTEGER DEFAULT 0,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_price CHECK (price_cents > 0),
    CONSTRAINT valid_platform_fee CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100),
    CONSTRAINT valid_delivery_limit CHECK (delivery_limit > 0),
    CONSTRAINT valid_billing_days CHECK (billing_cycle_days > 0)
);

-- Subscriptions table - Active subscriptions for restaurants
CREATE TABLE restaurant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans_new(id) ON DELETE RESTRICT,
    
    -- Subscription status
    status subscription_status_new DEFAULT 'pending_payment',
    
    -- Billing periods
    current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end DATE NOT NULL,
    next_billing_date DATE NOT NULL,
    
    -- Payment information
    payment_method payment_method_new NOT NULL DEFAULT 'mbway_sibs',
    payment_phone TEXT, -- For MB WAY payments
    
    -- Trial information
    trial_start DATE,
    trial_end DATE,
    is_trial BOOLEAN DEFAULT false,
    
    -- Cancellation information
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Usage tracking
    deliveries_used INTEGER DEFAULT 0,
    deliveries_remaining INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_period CHECK (current_period_end > current_period_start),
    CONSTRAINT valid_trial_period CHECK (
        (trial_start IS NULL AND trial_end IS NULL) OR 
        (trial_start IS NOT NULL AND trial_end IS NOT NULL AND trial_end > trial_start)
    ),
    CONSTRAINT one_active_subscription_per_restaurant UNIQUE (restaurant_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Payments table - Payment history with automatic split calculation
CREATE TABLE subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES restaurant_subscriptions(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_reference TEXT UNIQUE NOT NULL, -- MB WAY reference or external ID
    amount_cents INTEGER NOT NULL, -- Total amount in cents
    currency TEXT DEFAULT 'EUR',
    
    -- Split calculation (calculated automatically)
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    platform_fee_percentage DECIMAL(5,2) NOT NULL,
    net_to_restaurant_cents INTEGER NOT NULL DEFAULT 0,
    
    -- Payment status and method
    status payment_status_new DEFAULT 'pending',
    payment_method payment_method_new NOT NULL,
    
    -- External payment provider data
    provider_transaction_id TEXT, -- IfThenPay, EuPago, etc. transaction ID
    provider_name TEXT, -- 'ifthenpay', 'eupago', 'easypay', 'sibs_direct'
    provider_response JSONB, -- Full response from provider
    
    -- Billing period this payment covers
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount_cents > 0),
    CONSTRAINT valid_split CHECK (
        platform_fee_cents >= 0 AND 
        net_to_restaurant_cents >= 0 AND
        (platform_fee_cents + net_to_restaurant_cents) = amount_cents
    ),
    CONSTRAINT valid_billing_period CHECK (billing_period_end > billing_period_start)
);

-- Scheduled deliveries table - Generated after successful payment
CREATE TABLE scheduled_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES restaurant_subscriptions(id) ON DELETE CASCADE,
    
    -- Delivery scheduling
    scheduled_date DATE NOT NULL,
    delivery_slot_start TIME,
    delivery_slot_end TIME,
    
    -- Delivery status
    status TEXT DEFAULT 'scheduled', -- scheduled, cancelled, completed, failed
    
    -- Associated order (when delivery is executed)
    order_id UUID REFERENCES orders(id),
    
    -- Delivery details
    delivery_address TEXT,
    delivery_instructions TEXT,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_restaurant_delivery_date UNIQUE (restaurant_id, scheduled_date),
    CONSTRAINT valid_delivery_slot CHECK (
        (delivery_slot_start IS NULL AND delivery_slot_end IS NULL) OR
        (delivery_slot_start IS NOT NULL AND delivery_slot_end IS NOT NULL AND delivery_slot_end > delivery_slot_start)
    )
);

-- Payment audit log for compliance
CREATE TABLE payment_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES subscription_payments(id) ON DELETE CASCADE,
    
    -- Audit details
    action TEXT NOT NULL, -- 'created', 'status_changed', 'amount_updated', etc.
    old_values JSONB,
    new_values JSONB,
    
    -- User and context
    user_id UUID,
    user_role TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate payment split automatically
CREATE OR REPLACE FUNCTION calculate_payment_split()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate platform fee based on subscription plan
    SELECT sp.platform_fee_percentage
    INTO NEW.platform_fee_percentage
    FROM restaurant_subscriptions rs
    JOIN subscription_plans_new sp ON rs.plan_id = sp.id
    WHERE rs.id = NEW.subscription_id;
    
    -- Calculate split amounts
    NEW.platform_fee_cents := ROUND(NEW.amount_cents * (NEW.platform_fee_percentage / 100.0));
    NEW.net_to_restaurant_cents := NEW.amount_cents - NEW.platform_fee_cents;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update subscription deliveries remaining
CREATE OR REPLACE FUNCTION update_subscription_deliveries()
RETURNS TRIGGER AS $$
BEGIN
    -- Get delivery limit from plan
    UPDATE restaurant_subscriptions rs
    SET deliveries_remaining = sp.delivery_limit - rs.deliveries_used
    FROM subscription_plans_new sp
    WHERE rs.plan_id = sp.id AND rs.id = NEW.subscription_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate scheduled deliveries for a subscription
CREATE OR REPLACE FUNCTION generate_scheduled_deliveries(
    p_subscription_id UUID,
    p_delivery_count INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_restaurant_id UUID;
    v_organization_id UUID;
    v_current_period_start DATE;
    v_current_period_end DATE;
    v_delivery_limit INTEGER;
    v_delivery_interval INTEGER;
    v_current_date DATE;
    v_deliveries_created INTEGER := 0;
BEGIN
    -- Get subscription details
    SELECT 
        rs.restaurant_id,
        rs.organization_id,
        rs.current_period_start,
        rs.current_period_end,
        sp.delivery_limit
    INTO 
        v_restaurant_id,
        v_organization_id,
        v_current_period_start,
        v_current_period_end,
        v_delivery_limit
    FROM restaurant_subscriptions rs
    JOIN subscription_plans_new sp ON rs.plan_id = sp.id
    WHERE rs.id = p_subscription_id;
    
    -- Use provided count or plan default
    v_delivery_limit := COALESCE(p_delivery_count, v_delivery_limit);
    
    -- Calculate delivery interval (distribute evenly across billing period)
    v_delivery_interval := (v_current_period_end - v_current_period_start) / v_delivery_limit;
    
    -- Generate scheduled deliveries
    FOR i IN 1..v_delivery_limit LOOP
        v_current_date := v_current_period_start + (v_delivery_interval * (i - 1));
        
        -- Skip weekends (optional - can be configured per restaurant)
        WHILE EXTRACT(DOW FROM v_current_date) IN (0, 6) LOOP
            v_current_date := v_current_date + 1;
        END LOOP;
        
        -- Create scheduled delivery
        INSERT INTO scheduled_deliveries (
            organization_id,
            restaurant_id,
            subscription_id,
            scheduled_date,
            status
        ) VALUES (
            v_organization_id,
            v_restaurant_id,
            p_subscription_id,
            v_current_date,
            'scheduled'
        )
        ON CONFLICT (restaurant_id, scheduled_date) DO NOTHING;
        
        v_deliveries_created := v_deliveries_created + 1;
    END LOOP;
    
    RETURN v_deliveries_created;
END;
$$ LANGUAGE plpgsql;

-- Function to handle payment confirmation
CREATE OR REPLACE FUNCTION confirm_subscription_payment(
    p_payment_reference TEXT,
    p_provider_transaction_id TEXT,
    p_provider_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_payment_id UUID;
    v_subscription_id UUID;
    v_deliveries_created INTEGER;
BEGIN
    -- Update payment status
    UPDATE subscription_payments
    SET 
        status = 'paid',
        provider_transaction_id = p_provider_transaction_id,
        provider_response = p_provider_response,
        paid_at = NOW(),
        confirmed_at = NOW()
    WHERE payment_reference = p_payment_reference
    RETURNING id, subscription_id INTO v_payment_id, v_subscription_id;
    
    IF v_payment_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update subscription status
    UPDATE restaurant_subscriptions
    SET 
        status = 'active',
        next_billing_date = current_period_end + INTERVAL '1 day'
    WHERE id = v_subscription_id;
    
    -- Generate scheduled deliveries
    SELECT generate_scheduled_deliveries(v_subscription_id) INTO v_deliveries_created;
    
    -- Log the confirmation
    INSERT INTO payment_audit_log (payment_id, action, new_values)
    VALUES (v_payment_id, 'payment_confirmed', jsonb_build_object(
        'provider_transaction_id', p_provider_transaction_id,
        'deliveries_created', v_deliveries_created
    ));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically calculate payment split
CREATE TRIGGER trigger_calculate_payment_split
    BEFORE INSERT OR UPDATE ON subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_split();

-- Trigger to update deliveries remaining
CREATE TRIGGER trigger_update_deliveries_remaining
    AFTER INSERT OR UPDATE ON subscription_payments
    FOR EACH ROW
    WHEN (NEW.status = 'paid')
    EXECUTE FUNCTION update_subscription_deliveries();

-- Update timestamps trigger
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans_new
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_subscriptions_updated_at
    BEFORE UPDATE ON restaurant_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at
    BEFORE UPDATE ON subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_deliveries_updated_at
    BEFORE UPDATE ON scheduled_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Subscription plans indexes
CREATE INDEX idx_subscription_plans_active ON subscription_plans_new (is_active, sort_order);
CREATE INDEX idx_subscription_plans_organization ON subscription_plans_new (organization_id);

-- Restaurant subscriptions indexes
CREATE INDEX idx_restaurant_subscriptions_restaurant ON restaurant_subscriptions (restaurant_id);
CREATE INDEX idx_restaurant_subscriptions_status ON restaurant_subscriptions (status);
CREATE INDEX idx_restaurant_subscriptions_billing ON restaurant_subscriptions (next_billing_date);
CREATE INDEX idx_restaurant_subscriptions_active ON restaurant_subscriptions (restaurant_id) WHERE status = 'active';

-- Payments indexes
CREATE INDEX idx_subscription_payments_reference ON subscription_payments (payment_reference);
CREATE INDEX idx_subscription_payments_subscription ON subscription_payments (subscription_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments (status);
CREATE INDEX idx_subscription_payments_billing_period ON subscription_payments (billing_period_start, billing_period_end);

-- Scheduled deliveries indexes
CREATE INDEX idx_scheduled_deliveries_restaurant_date ON scheduled_deliveries (restaurant_id, scheduled_date);
CREATE INDEX idx_scheduled_deliveries_status ON scheduled_deliveries (status);
CREATE INDEX idx_scheduled_deliveries_date_range ON scheduled_deliveries (scheduled_date) WHERE status = 'scheduled';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE subscription_plans_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Subscription plans policies
CREATE POLICY "Plans viewable by organization members" ON subscription_plans_new
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY "Plans manageable by super_admin and platform_owner" ON subscription_plans_new
    FOR ALL USING (
        auth.user_role() IN ('super_admin', 'platform_owner') AND
        organization_id = auth.user_organization_id()
    );

-- Restaurant subscriptions policies
CREATE POLICY "Subscriptions viewable by restaurant owners and admins" ON restaurant_subscriptions
    FOR SELECT USING (
        organization_id = auth.user_organization_id() AND (
            auth.user_role() IN ('super_admin', 'platform_owner') OR
            (auth.user_role() = 'restaurant_admin' AND restaurant_id IN (
                SELECT id FROM restaurants WHERE owner_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Subscriptions manageable by restaurant owners" ON restaurant_subscriptions
    FOR ALL USING (
        organization_id = auth.user_organization_id() AND
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
        )
    );

-- Payment policies
CREATE POLICY "Payments viewable by subscription owners and admins" ON subscription_payments
    FOR SELECT USING (
        organization_id = auth.user_organization_id() AND (
            auth.user_role() IN ('super_admin', 'platform_owner') OR
            subscription_id IN (
                SELECT id FROM restaurant_subscriptions rs
                JOIN restaurants r ON rs.restaurant_id = r.id
                WHERE r.owner_id = auth.uid()
            )
        )
    );

-- Scheduled deliveries policies
CREATE POLICY "Deliveries viewable by restaurant owners and admins" ON scheduled_deliveries
    FOR SELECT USING (
        organization_id = auth.user_organization_id() AND (
            auth.user_role() IN ('super_admin', 'platform_owner') OR
            restaurant_id IN (
                SELECT id FROM restaurants WHERE owner_id = auth.uid()
            )
        )
    );

-- Audit log policies (admin only)
CREATE POLICY "Audit log viewable by admins only" ON payment_audit_log
    FOR SELECT USING (auth.user_role() IN ('super_admin', 'platform_owner'));

-- ============================================================================
-- INITIAL DATA - SAMPLE PLANS
-- ============================================================================

-- Insert sample subscription plans for Portugal
INSERT INTO subscription_plans_new (
    organization_id,
    name,
    name_pt,
    description,
    description_pt,
    price_cents,
    platform_fee_percentage,
    delivery_limit,
    billing_cycle,
    is_active,
    is_popular,
    sort_order,
    features
) VALUES 
-- Basic Plan
(
    '550e8400-e29b-41d4-a716-446655440000', -- Default organization
    'Basic Plan',
    'Plano Básico',
    'Perfect for small restaurants starting their delivery journey',
    'Perfeito para pequenos restaurantes que começam as entregas',
    1999, -- €19.99
    5.0,
    20, -- 20 deliveries per month
    'monthly',
    true,
    false,
    1,
    '["Basic analytics", "Email support", "Standard delivery slots"]'::jsonb
),
-- Professional Plan
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Professional Plan',
    'Plano Profissional',
    'Advanced features for growing restaurants',
    'Funcionalidades avançadas para restaurantes em crescimento',
    3999, -- €39.99
    4.5,
    50, -- 50 deliveries per month
    'monthly',
    true,
    true, -- Popular plan
    2,
    '["Advanced analytics", "Priority support", "Flexible delivery slots", "Custom branding"]'::jsonb
),
-- Enterprise Plan
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Enterprise Plan',
    'Plano Empresarial',
    'Full-featured plan for large restaurant chains',
    'Plano completo para grandes cadeias de restaurantes',
    7999, -- €79.99
    4.0,
    150, -- 150 deliveries per month
    'monthly',
    true,
    false,
    3,
    '["Full analytics suite", "24/7 support", "Unlimited delivery slots", "Full custom branding", "API access", "Dedicated account manager"]'::jsonb
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscription_plans_new IS 'Subscription plans available for restaurants with MB WAY payment integration';
COMMENT ON TABLE restaurant_subscriptions IS 'Active subscriptions for restaurants with automatic renewal';
COMMENT ON TABLE subscription_payments IS 'Payment history with automatic platform fee calculation';
COMMENT ON TABLE scheduled_deliveries IS 'Automatically generated delivery schedule based on subscription plan';
COMMENT ON TABLE payment_audit_log IS 'Audit trail for all payment-related actions for compliance';

COMMENT ON FUNCTION calculate_payment_split() IS 'Automatically calculates platform fee and restaurant net amount';
COMMENT ON FUNCTION generate_scheduled_deliveries(UUID, INTEGER) IS 'Generates scheduled deliveries for a subscription period';
COMMENT ON FUNCTION confirm_subscription_payment(TEXT, TEXT, JSONB) IS 'Confirms payment and activates subscription with delivery generation'; 