-- ============================================================================
-- SABORPORTUGUES - ENHANCED DATABASE STRUCTURE
-- Version: 2.0.0
-- Date: 2025-01-05
-- Author: SaborPortugues Team
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUMS & CUSTOM TYPES
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('customer', 'restaurant_admin', 'driver', 'super_admin', 'platform_owner');

-- Order status enum  
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');

-- Payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- Payment method enum
CREATE TYPE payment_method AS ENUM ('stripe', 'mbway', 'multibanco', 'paypal');

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired');

-- Driver status enum
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'busy', 'unavailable');

-- ============================================================================
-- CORE TABLES WITH ENHANCED STRUCTURE
-- ============================================================================

-- Organizations table (for multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'PT',
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'customer',
    avatar_url TEXT,
    address TEXT,
    location GEOGRAPHY(POINT, 4326), -- PostGIS for geolocation
    preferences JSONB DEFAULT '{}',
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+[1-9]\d{1,14}$')
);

-- Enhanced restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    cover_image_url TEXT,
    address TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    phone TEXT,
    email TEXT,
    website_url TEXT,
    cuisine_type TEXT NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    delivery_time TEXT NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0.0,
    minimum_order DECIMAL(10,2) DEFAULT 0.0,
    is_open BOOLEAN DEFAULT true,
    opening_hours JSONB DEFAULT '{}',
    delivery_radius_km INTEGER DEFAULT 10,
    commission_rate DECIMAL(5,2) DEFAULT 15.0, -- Platform commission
    owner_id UUID REFERENCES profiles(id),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_rating CHECK (rating >= 0.0 AND rating <= 5.0),
    CONSTRAINT valid_commission CHECK (commission_rate >= 0.0 AND commission_rate <= 100.0)
);

-- Meal categories table
CREATE TABLE meal_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_pt TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced meals table
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES meal_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    allergens TEXT[] DEFAULT '{}',
    ingredients TEXT[] DEFAULT '{}',
    nutrition_info JSONB DEFAULT '{}',
    preparation_time INTEGER, -- minutes
    calories INTEGER,
    spice_level INTEGER DEFAULT 0, -- 0-5 scale
    sort_order INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_spice_level CHECK (spice_level >= 0 AND spice_level <= 5)
);

-- Enhanced orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    driver_id UUID REFERENCES profiles(id),
    
    -- Order details
    order_number TEXT UNIQUE NOT NULL,
    status order_status DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0.0,
    tax_amount DECIMAL(10,2) DEFAULT 0.0,
    tip_amount DECIMAL(10,2) DEFAULT 0.0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Delivery information
    delivery_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT, 4326),
    delivery_instructions TEXT,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- Payment information
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_intent_id TEXT, -- Stripe Payment Intent ID
    
    -- Timestamps
    accepted_at TIMESTAMP WITH TIME ZONE,
    prepared_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    -- Ratings and feedback
    customer_rating INTEGER,
    driver_rating INTEGER,
    customer_feedback TEXT,
    
    -- Metadata
    special_instructions TEXT,
    promo_code TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ratings CHECK (
        (customer_rating IS NULL OR (customer_rating >= 1 AND customer_rating <= 5)) AND
        (driver_rating IS NULL OR (driver_rating >= 1 AND driver_rating <= 5))
    ),
    CONSTRAINT valid_amounts CHECK (
        subtotal >= 0 AND delivery_fee >= 0 AND tax_amount >= 0 AND 
        tip_amount >= 0 AND total_amount >= 0 AND discount_amount >= 0
    )
);

-- Enhanced order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    customizations JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_quantity CHECK (quantity > 0),
    CONSTRAINT valid_prices CHECK (unit_price >= 0 AND total_price >= 0)
);

-- Enhanced drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    vehicle_model TEXT,
    vehicle_color TEXT,
    phone_number TEXT NOT NULL,
    emergency_contact TEXT,
    
    -- Status and availability
    status driver_status DEFAULT 'offline',
    current_location GEOGRAPHY(POINT, 4326),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Performance metrics
    total_deliveries INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_earnings DECIMAL(12,2) DEFAULT 0.0,
    
    -- Documents
    license_image_url TEXT,
    vehicle_registration_url TEXT,
    insurance_url TEXT,
    
    -- Dates
    license_expiry_date DATE,
    insurance_expiry_date DATE,
    verified_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_rating CHECK (average_rating >= 0.0 AND average_rating <= 5.0)
);

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_pt TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_interval TEXT NOT NULL, -- 'week', 'month'
    deliveries_per_week INTEGER NOT NULL,
    stripe_price_id TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    status subscription_status DEFAULT 'active',
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    trial_end DATE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery preferences
    delivery_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT, 4326),
    preferred_delivery_time TIME,
    delivery_instructions TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription deliveries table
CREATE TABLE subscription_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    delivery_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    meals JSONB NOT NULL, -- Array of meal selections
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(subscription_id, delivery_date)
);

-- Enhanced payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'EUR',
    payment_method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    
    -- External IDs
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    mbway_transaction_id TEXT,
    multibanco_reference TEXT,
    
    -- Metadata
    payment_metadata JSONB DEFAULT '{}',
    failure_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT order_or_subscription CHECK (
        (order_id IS NOT NULL AND subscription_id IS NULL) OR
        (order_id IS NULL AND subscription_id IS NOT NULL)
    )
);

-- Admin logs table
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core indexes
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_location ON profiles USING GIST(location);

CREATE INDEX idx_restaurants_organization_id ON restaurants(organization_id);
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurants_is_open ON restaurants(is_open);
CREATE INDEX idx_restaurants_cuisine_type ON restaurants(cuisine_type);

CREATE INDEX idx_meals_restaurant_id ON meals(restaurant_id);
CREATE INDEX idx_meals_category_id ON meals(category_id);
CREATE INDEX idx_meals_is_available ON meals(is_available);

CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_driver_id ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_meal_id ON order_items(meal_id);

CREATE INDEX idx_drivers_organization_id ON drivers(organization_id);
CREATE INDEX idx_drivers_profile_id ON drivers(profile_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_current_location ON drivers USING GIST(current_location);

CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'SP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_order_item_total BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION calculate_order_total();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'role',
        (SELECT role FROM profiles WHERE id = auth.uid())::TEXT,
        'customer'
    );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID,
        (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );
$$ LANGUAGE SQL STABLE;

-- Organizations policies
CREATE POLICY "Platform owners can manage organizations"
    ON organizations FOR ALL 
    USING (auth.user_role() = 'platform_owner');

CREATE POLICY "Users can view their organization"
    ON organizations FOR SELECT
    USING (id = auth.user_organization_id());

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization"
    ON profiles FOR SELECT
    USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their organization"
    ON profiles FOR ALL
    USING (
        organization_id = auth.user_organization_id() AND
        auth.user_role() IN ('super_admin', 'platform_owner')
    );

-- Restaurants policies
CREATE POLICY "Anyone can view active restaurants in their organization"
    ON restaurants FOR SELECT
    USING (
        organization_id = auth.user_organization_id() AND
        is_active = true
    );

CREATE POLICY "Restaurant owners can manage their restaurants"
    ON restaurants FOR ALL
    USING (
        organization_id = auth.user_organization_id() AND
        (owner_id = auth.uid() OR auth.user_role() IN ('super_admin', 'platform_owner'))
    );

-- Meals policies
CREATE POLICY "Anyone can view available meals"
    ON meals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id 
            AND r.organization_id = auth.user_organization_id()
            AND r.is_active = true
        )
    );

CREATE POLICY "Restaurant owners can manage their meals"
    ON meals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id 
            AND r.organization_id = auth.user_organization_id()
            AND (r.owner_id = auth.uid() OR auth.user_role() IN ('super_admin', 'platform_owner'))
        )
    );

-- Orders policies
CREATE POLICY "Customers can view their own orders"
    ON orders FOR SELECT
    USING (
        organization_id = auth.user_organization_id() AND
        customer_id = auth.uid()
    );

CREATE POLICY "Drivers can view assigned orders"
    ON orders FOR SELECT
    USING (
        organization_id = auth.user_organization_id() AND
        driver_id = auth.uid()
    );

CREATE POLICY "Restaurant owners can view orders for their restaurants"
    ON orders FOR SELECT
    USING (
        organization_id = auth.user_organization_id() AND
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
        )
    );

CREATE POLICY "Customers can create orders"
    ON orders FOR INSERT
    WITH CHECK (
        organization_id = auth.user_organization_id() AND
        customer_id = auth.uid()
    );

CREATE POLICY "Admins can manage all orders"
    ON orders FOR ALL
    USING (
        organization_id = auth.user_organization_id() AND
        auth.user_role() IN ('super_admin', 'platform_owner')
    );

-- Continue with other table policies...

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default organization
INSERT INTO organizations (id, name, slug, country_code) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'SaborPortuguês Portugal',
    'saborportugues-pt',
    'PT'
);

-- Insert meal categories
INSERT INTO meal_categories (organization_id, name, name_pt, icon, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Traditional Dishes', 'Pratos Tradicionais', '🍲', 1),
('550e8400-e29b-41d4-a716-446655440000', 'Meat', 'Carnes', '🥩', 2),
('550e8400-e29b-41d4-a716-446655440000', 'Fish & Seafood', 'Peixes e Mariscos', '🐟', 3),
('550e8400-e29b-41d4-a716-446655440000', 'Soups', 'Sopas', '🍜', 4),
('550e8400-e29b-41d4-a716-446655440000', 'Appetizers', 'Petiscos', '🧀', 5),
('550e8400-e29b-41d4-a716-446655440000', 'Desserts', 'Sobremesas', '🍮', 6);

-- Insert subscription plans
INSERT INTO subscription_plans (organization_id, name, name_pt, description, price, billing_interval, deliveries_per_week) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Detox Weekly', 'Detox Semanal', 'Refeições detox saudáveis entregues semanalmente', 29.99, 'week', 5),
('550e8400-e29b-41d4-a716-446655440000', 'Detox Monthly', 'Detox Mensal', 'Plano mensal de refeições detox', 99.99, 'month', 5),
('550e8400-e29b-41d4-a716-446655440000', 'Fitness Weekly', 'Fitness Semanal', 'Refeições fitness para atletas', 34.99, 'week', 7),
('550e8400-e29b-41d4-a716-446655440000', 'Fitness Monthly', 'Fitness Mensal', 'Plano mensal fitness completo', 119.99, 'month', 7);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations for SaaS deployment';
COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE restaurants IS 'Portuguese restaurants with geolocation';
COMMENT ON TABLE meals IS 'Traditional Portuguese meals with nutrition info';
COMMENT ON TABLE orders IS 'Customer orders with real-time tracking';
COMMENT ON TABLE drivers IS 'Delivery drivers with performance metrics';
COMMENT ON TABLE subscriptions IS 'Meal subscription plans';
COMMENT ON TABLE payments IS 'Payment processing for Stripe and MB WAY';
COMMENT ON TABLE admin_logs IS 'Audit trail for administrative actions'; 