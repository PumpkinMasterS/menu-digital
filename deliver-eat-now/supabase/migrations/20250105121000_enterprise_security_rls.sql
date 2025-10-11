-- ============================================================================
-- ENTERPRISE SECURITY: RLS POLICIES & JWT CLAIMS
-- Migração para implementar segurança de nível enterprise
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS FOR ENHANCED SECURITY
-- ============================================================================

-- Function to get user role from JWT or database
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'role',
        (SELECT role FROM profiles WHERE id = auth.uid())::TEXT,
        'customer'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user organization from JWT or database
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID,
        (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is admin in their organization
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.user_role() IN ('super_admin', 'platform_owner');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is restaurant owner
CREATE OR REPLACE FUNCTION auth.is_restaurant_owner(restaurant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM restaurants r 
        WHERE r.id = restaurant_id 
        AND r.owner_id = auth.uid()
        AND r.organization_id = auth.user_organization_id()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to validate same organization access
CREATE OR REPLACE FUNCTION auth.same_organization(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN target_org_id = auth.user_organization_id() OR auth.user_role() = 'platform_owner';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ENHANCED RLS POLICIES
-- ============================================================================

-- Drop existing policies to recreate them with enhanced security
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow public read access to restaurants" ON restaurants;
DROP POLICY IF EXISTS "Allow authenticated users to insert restaurants" ON restaurants;

-- Profiles table policies
CREATE POLICY "profiles_select_own_organization" ON profiles
    FOR SELECT USING (
        auth.same_organization(organization_id) AND (
            id = auth.uid() OR 
            auth.is_admin() OR
            auth.user_role() IN ('restaurant_admin', 'driver')
        )
    );

CREATE POLICY "profiles_insert_with_verification" ON profiles
    FOR INSERT WITH CHECK (
        id = auth.uid() AND
        organization_id = auth.user_organization_id() AND
        role IN ('customer', 'driver', 'restaurant_admin') -- Only admins can create admin users
    );

CREATE POLICY "profiles_update_own_or_admin" ON profiles
    FOR UPDATE USING (
        auth.same_organization(organization_id) AND (
            id = auth.uid() OR auth.is_admin()
        )
    ) WITH CHECK (
        auth.same_organization(organization_id) AND (
            id = auth.uid() OR auth.is_admin()
        )
    );

CREATE POLICY "profiles_delete_admin_only" ON profiles
    FOR DELETE USING (
        auth.same_organization(organization_id) AND auth.is_admin()
    );

-- Restaurants table policies
CREATE POLICY "restaurants_select_active_in_org" ON restaurants
    FOR SELECT USING (
        auth.same_organization(organization_id) AND (
            is_active = true OR 
            owner_id = auth.uid() OR 
            auth.is_admin()
        )
    );

CREATE POLICY "restaurants_insert_admin_or_owner" ON restaurants
    FOR INSERT WITH CHECK (
        auth.same_organization(organization_id) AND (
            auth.is_admin() OR 
            (auth.user_role() = 'restaurant_admin' AND owner_id = auth.uid())
        )
    );

CREATE POLICY "restaurants_update_owner_or_admin" ON restaurants
    FOR UPDATE USING (
        auth.same_organization(organization_id) AND (
            owner_id = auth.uid() OR auth.is_admin()
        )
    ) WITH CHECK (
        auth.same_organization(organization_id) AND (
            owner_id = auth.uid() OR auth.is_admin()
        )
    );

CREATE POLICY "restaurants_delete_admin_only" ON restaurants
    FOR DELETE USING (
        auth.same_organization(organization_id) AND auth.is_admin()
    );

-- Meals table policies
CREATE POLICY "meals_select_available_or_owner" ON meals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id 
            AND auth.same_organization(r.organization_id)
            AND (r.is_active = true OR r.owner_id = auth.uid() OR auth.is_admin())
        )
    );

CREATE POLICY "meals_modify_restaurant_owner_or_admin" ON meals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id 
            AND auth.same_organization(r.organization_id)
            AND (r.owner_id = auth.uid() OR auth.is_admin())
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id 
            AND auth.same_organization(r.organization_id)
            AND (r.owner_id = auth.uid() OR auth.is_admin())
        )
    );

-- Orders table policies with role-based access
CREATE POLICY "orders_customer_own_orders" ON orders
    FOR SELECT USING (
        auth.same_organization(organization_id) AND
        customer_id = auth.uid() AND
        auth.user_role() = 'customer'
    );

CREATE POLICY "orders_driver_assigned_orders" ON orders
    FOR SELECT USING (
        auth.same_organization(organization_id) AND
        driver_id = auth.uid() AND
        auth.user_role() = 'driver'
    );

CREATE POLICY "orders_restaurant_owner_orders" ON orders
    FOR SELECT USING (
        auth.same_organization(organization_id) AND
        auth.is_restaurant_owner(restaurant_id) AND
        auth.user_role() = 'restaurant_admin'
    );

CREATE POLICY "orders_admin_all_orders" ON orders
    FOR ALL USING (
        auth.same_organization(organization_id) AND auth.is_admin()
    );

CREATE POLICY "orders_customer_create" ON orders
    FOR INSERT WITH CHECK (
        auth.same_organization(organization_id) AND
        customer_id = auth.uid() AND
        auth.user_role() = 'customer'
    );

CREATE POLICY "orders_update_status_authorized" ON orders
    FOR UPDATE USING (
        auth.same_organization(organization_id) AND (
            (customer_id = auth.uid() AND auth.user_role() = 'customer') OR
            (driver_id = auth.uid() AND auth.user_role() = 'driver') OR
            (auth.is_restaurant_owner(restaurant_id) AND auth.user_role() = 'restaurant_admin') OR
            auth.is_admin()
        )
    ) WITH CHECK (
        auth.same_organization(organization_id) AND (
            (customer_id = auth.uid() AND auth.user_role() = 'customer') OR
            (driver_id = auth.uid() AND auth.user_role() = 'driver') OR
            (auth.is_restaurant_owner(restaurant_id) AND auth.user_role() = 'restaurant_admin') OR
            auth.is_admin()
        )
    );

-- Order items policies
CREATE POLICY "order_items_access_via_order" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_id 
            AND (
                (o.customer_id = auth.uid() AND auth.user_role() = 'customer') OR
                (o.driver_id = auth.uid() AND auth.user_role() = 'driver') OR
                (auth.is_restaurant_owner(o.restaurant_id) AND auth.user_role() = 'restaurant_admin') OR
                auth.is_admin()
            )
        )
    );

-- Drivers table policies
CREATE POLICY "drivers_select_in_organization" ON drivers
    FOR SELECT USING (
        auth.same_organization(organization_id) AND (
            profile_id = auth.uid() OR auth.is_admin()
        )
    );

CREATE POLICY "drivers_modify_own_or_admin" ON drivers
    FOR ALL USING (
        auth.same_organization(organization_id) AND (
            profile_id = auth.uid() OR auth.is_admin()
        )
    ) WITH CHECK (
        auth.same_organization(organization_id) AND (
            profile_id = auth.uid() OR auth.is_admin()
        )
    );

-- Subscriptions policies
CREATE POLICY "subscriptions_customer_own" ON subscriptions
    FOR SELECT USING (
        auth.same_organization(organization_id) AND (
            customer_id = auth.uid() OR auth.is_admin()
        )
    );

CREATE POLICY "subscriptions_customer_manage_own" ON subscriptions
    FOR ALL USING (
        auth.same_organization(organization_id) AND (
            customer_id = auth.uid() OR auth.is_admin()
        )
    ) WITH CHECK (
        auth.same_organization(organization_id) AND (
            customer_id = auth.uid() OR auth.is_admin()
        )
    );

-- Payments policies
CREATE POLICY "payments_access_via_relationship" ON payments
    FOR SELECT USING (
        auth.same_organization(organization_id) AND (
            EXISTS (
                SELECT 1 FROM orders o 
                WHERE o.id = order_id AND o.customer_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM subscriptions s 
                WHERE s.id = subscription_id AND s.customer_id = auth.uid()
            ) OR
            auth.is_admin()
        )
    );

CREATE POLICY "payments_create_authorized" ON payments
    FOR INSERT WITH CHECK (
        auth.same_organization(organization_id) AND (
            EXISTS (
                SELECT 1 FROM orders o 
                WHERE o.id = order_id AND o.customer_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM subscriptions s 
                WHERE s.id = subscription_id AND s.customer_id = auth.uid()
            ) OR
            auth.is_admin()
        )
    );

-- Admin logs policies
CREATE POLICY "admin_logs_admin_only" ON admin_logs
    FOR ALL USING (
        auth.same_organization(organization_id) AND auth.is_admin()
    );

-- ============================================================================
-- SECURITY FUNCTIONS FOR APPLICATION LAYER
-- ============================================================================

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    action_type TEXT,
    entity_type TEXT,
    entity_id UUID DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_logs (
        organization_id,
        admin_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        auth.user_organization_id(),
        auth.uid(),
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate order access
CREATE OR REPLACE FUNCTION can_access_order(order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM orders o 
        WHERE o.id = order_id 
        AND auth.same_organization(o.organization_id)
        AND (
            (o.customer_id = auth.uid() AND auth.user_role() = 'customer') OR
            (o.driver_id = auth.uid() AND auth.user_role() = 'driver') OR
            (auth.is_restaurant_owner(o.restaurant_id) AND auth.user_role() = 'restaurant_admin') OR
            auth.is_admin()
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to validate restaurant access
CREATE OR REPLACE FUNCTION can_modify_restaurant(restaurant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM restaurants r 
        WHERE r.id = restaurant_id 
        AND auth.same_organization(r.organization_id)
        AND (r.owner_id = auth.uid() OR auth.is_admin())
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- RATE LIMITING & SECURITY TRIGGERS
-- ============================================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_own_only" ON rate_limits
    FOR ALL USING (user_id = auth.uid());

-- Function for rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
    action_name TEXT,
    max_requests INTEGER DEFAULT 100,
    window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate window start time
    window_start := DATE_TRUNC('minute', NOW()) - (EXTRACT(MINUTE FROM NOW())::INTEGER % window_minutes) * INTERVAL '1 minute';
    
    -- Get or create rate limit record
    INSERT INTO rate_limits (user_id, action, window_start, count)
    VALUES (auth.uid(), action_name, window_start, 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO current_count;
    
    -- Check if limit exceeded
    RETURN current_count <= max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT TRAIL TRIGGERS
-- ============================================================================

-- Function to create audit trail
CREATE OR REPLACE FUNCTION create_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    -- Only audit for non-admin operations or critical tables
    IF TG_TABLE_NAME IN ('orders', 'payments', 'restaurants', 'profiles') THEN
        PERFORM log_admin_action(
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

CREATE TRIGGER audit_restaurants AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION auth.user_role() IS 'Gets user role from JWT claims or database fallback';
COMMENT ON FUNCTION auth.user_organization_id() IS 'Gets user organization from JWT claims or database fallback';
COMMENT ON FUNCTION auth.is_admin() IS 'Checks if user has admin privileges';
COMMENT ON FUNCTION auth.same_organization() IS 'Validates organization-level access';
COMMENT ON FUNCTION check_rate_limit() IS 'Implements sliding window rate limiting';
COMMENT ON FUNCTION log_admin_action() IS 'Creates audit trail for administrative actions';

-- Create indexes for performance on security-related queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_window 
    ON rate_limits(user_id, action, window_start);

CREATE INDEX IF NOT EXISTS idx_admin_logs_organization_admin 
    ON admin_logs(organization_id, admin_id, created_at);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.same_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated; 