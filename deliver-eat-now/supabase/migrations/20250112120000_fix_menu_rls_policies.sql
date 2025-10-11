-- Migration: Fix Menu Digital RLS Policies
-- Adiciona políticas de segurança em falta para tables do menu digital

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;  
ALTER TABLE menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. MENU CATEGORIES POLICIES
-- ============================================================================

-- SELECT: Anyone can view active categories
CREATE POLICY "menu_categories_select_active" ON menu_categories
    FOR SELECT USING (is_active = true);

-- INSERT: Restaurant owners, super_admin, platform_owner can create categories
CREATE POLICY "menu_categories_insert_authorized" ON menu_categories
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                -- Restaurant admin: apenas para o seu restaurante
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                -- Super admin: apenas restaurantes da sua organização
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                -- Platform owner: todos os restaurantes
                profiles.role = 'platform_owner'
            )
        )
    );

-- UPDATE: Same as INSERT
CREATE POLICY "menu_categories_update_authorized" ON menu_categories
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- DELETE: Same as UPDATE
CREATE POLICY "menu_categories_delete_authorized" ON menu_categories
    FOR DELETE USING (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- ============================================================================
-- 3. MENU ITEMS POLICIES
-- ============================================================================

-- SELECT: Anyone can view available items
CREATE POLICY "menu_items_select_available" ON menu_items
    FOR SELECT USING (is_available = true);

-- INSERT: Restaurant owners, super_admin, platform_owner can create items
CREATE POLICY "menu_items_insert_authorized" ON menu_items
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- UPDATE: Same as INSERT
CREATE POLICY "menu_items_update_authorized" ON menu_items
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- DELETE: Same as UPDATE
CREATE POLICY "menu_items_delete_authorized" ON menu_items
    FOR DELETE USING (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- ============================================================================
-- 4. MENU MODIFIERS POLICIES
-- ============================================================================

-- SELECT: Anyone can view active modifiers
CREATE POLICY "menu_modifiers_select_active" ON menu_modifiers
    FOR SELECT USING (is_active = true);

-- INSERT: Restaurant owners, super_admin, platform_owner can create modifiers
CREATE POLICY "menu_modifiers_insert_authorized" ON menu_modifiers
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- UPDATE: Same as INSERT
CREATE POLICY "menu_modifiers_update_authorized" ON menu_modifiers
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- DELETE: Same as UPDATE
CREATE POLICY "menu_modifiers_delete_authorized" ON menu_modifiers
    FOR DELETE USING (
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
            AND (
                (profiles.role = 'restaurant_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.restaurant_admin_id = profiles.user_id
                ))
                OR
                (profiles.role = 'super_admin' AND EXISTS(
                    SELECT 1 FROM restaurants r 
                    WHERE r.id = restaurant_id 
                    AND r.organization_id = profiles.organization_id
                ))
                OR
                profiles.role = 'platform_owner'
            )
        )
    );

-- ============================================================================
-- 5. MENU MODIFIER OPTIONS POLICIES
-- ============================================================================

-- SELECT: Anyone can view available options
CREATE POLICY "menu_modifier_options_select_available" ON menu_modifier_options
    FOR SELECT USING (is_available = true);

-- INSERT: Based on modifier access
CREATE POLICY "menu_modifier_options_insert_authorized" ON menu_modifier_options
    FOR INSERT WITH CHECK (
        EXISTS(
            SELECT 1 FROM menu_modifiers mm
            WHERE mm.id = modifier_id
            AND auth.uid() IN (
                SELECT profiles.user_id 
                FROM profiles 
                WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
                AND (
                    (profiles.role = 'restaurant_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mm.restaurant_id 
                        AND r.restaurant_admin_id = profiles.user_id
                    ))
                    OR
                    (profiles.role = 'super_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mm.restaurant_id 
                        AND r.organization_id = profiles.organization_id
                    ))
                    OR
                    profiles.role = 'platform_owner'
                )
            )
        )
    );

-- UPDATE: Same as INSERT
CREATE POLICY "menu_modifier_options_update_authorized" ON menu_modifier_options
    FOR UPDATE USING (
        EXISTS(
            SELECT 1 FROM menu_modifiers mm
            WHERE mm.id = modifier_id
            AND auth.uid() IN (
                SELECT profiles.user_id 
                FROM profiles 
                WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
                AND (
                    (profiles.role = 'restaurant_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mm.restaurant_id 
                        AND r.restaurant_admin_id = profiles.user_id
                    ))
                    OR
                    (profiles.role = 'super_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mm.restaurant_id 
                        AND r.organization_id = profiles.organization_id
                    ))
                    OR
                    profiles.role = 'platform_owner'
                )
            )
        )
    );

-- DELETE: Same as UPDATE
CREATE POLICY "menu_modifier_options_delete_authorized" ON menu_modifier_options
    FOR DELETE USING (
        EXISTS(
            SELECT 1 FROM menu_modifiers mm
            WHERE mm.id = modifier_id
            AND auth.uid() IN (
                SELECT profiles.user_id 
                FROM profiles 
                WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
                AND (
                    (profiles.role = 'restaurant_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mm.restaurant_id 
                        AND r.restaurant_admin_id = profiles.user_id
                    ))
                    OR
                    (profiles.role = 'super_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mm.restaurant_id 
                        AND r.organization_id = profiles.organization_id
                    ))
                    OR
                    profiles.role = 'platform_owner'
                )
            )
        )
    );

-- ============================================================================
-- 6. MENU ITEM MODIFIERS POLICIES (Junction table)
-- ============================================================================

-- SELECT: Anyone can view relationships for available items
CREATE POLICY "menu_item_modifiers_select_available" ON menu_item_modifiers
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM menu_items mi WHERE mi.id = item_id AND mi.is_available = true)
    );

-- INSERT: Based on item access
CREATE POLICY "menu_item_modifiers_insert_authorized" ON menu_item_modifiers
    FOR INSERT WITH CHECK (
        EXISTS(
            SELECT 1 FROM menu_items mi
            WHERE mi.id = item_id
            AND auth.uid() IN (
                SELECT profiles.user_id 
                FROM profiles 
                WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
                AND (
                    (profiles.role = 'restaurant_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mi.restaurant_id 
                        AND r.restaurant_admin_id = profiles.user_id
                    ))
                    OR
                    (profiles.role = 'super_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mi.restaurant_id 
                        AND r.organization_id = profiles.organization_id
                    ))
                    OR
                    profiles.role = 'platform_owner'
                )
            )
        )
    );

-- UPDATE: Same as INSERT
CREATE POLICY "menu_item_modifiers_update_authorized" ON menu_item_modifiers
    FOR UPDATE USING (
        EXISTS(
            SELECT 1 FROM menu_items mi
            WHERE mi.id = item_id
            AND auth.uid() IN (
                SELECT profiles.user_id 
                FROM profiles 
                WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
                AND (
                    (profiles.role = 'restaurant_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mi.restaurant_id 
                        AND r.restaurant_admin_id = profiles.user_id
                    ))
                    OR
                    (profiles.role = 'super_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mi.restaurant_id 
                        AND r.organization_id = profiles.organization_id
                    ))
                    OR
                    profiles.role = 'platform_owner'
                )
            )
        )
    );

-- DELETE: Same as UPDATE
CREATE POLICY "menu_item_modifiers_delete_authorized" ON menu_item_modifiers
    FOR DELETE USING (
        EXISTS(
            SELECT 1 FROM menu_items mi
            WHERE mi.id = item_id
            AND auth.uid() IN (
                SELECT profiles.user_id 
                FROM profiles 
                WHERE profiles.role IN ('restaurant_admin', 'super_admin', 'platform_owner')
                AND (
                    (profiles.role = 'restaurant_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mi.restaurant_id 
                        AND r.restaurant_admin_id = profiles.user_id
                    ))
                    OR
                    (profiles.role = 'super_admin' AND EXISTS(
                        SELECT 1 FROM restaurants r 
                        WHERE r.id = mi.restaurant_id 
                        AND r.organization_id = profiles.organization_id
                    ))
                    OR
                    profiles.role = 'platform_owner'
                )
            )
        )
    );

-- ============================================================================
-- 7. ADMIN POLICIES (Platform Owner tem acesso total)
-- ============================================================================

-- Platform owners can view all menu data
CREATE POLICY "platform_owner_select_all_menu_categories" ON menu_categories
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'platform_owner'
        )
    );

CREATE POLICY "platform_owner_select_all_menu_items" ON menu_items
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'platform_owner'
        )
    );

CREATE POLICY "platform_owner_select_all_menu_modifiers" ON menu_modifiers
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'platform_owner'
        )
    );

CREATE POLICY "platform_owner_select_all_menu_modifier_options" ON menu_modifier_options
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'platform_owner'
        )
    );

CREATE POLICY "platform_owner_select_all_menu_item_modifiers" ON menu_item_modifiers
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'platform_owner'
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "menu_categories_select_active" ON menu_categories IS 'Allow public viewing of active menu categories';
COMMENT ON POLICY "menu_items_select_available" ON menu_items IS 'Allow public viewing of available menu items';
COMMENT ON POLICY "menu_modifiers_select_active" ON menu_modifiers IS 'Allow public viewing of active modifiers'; 