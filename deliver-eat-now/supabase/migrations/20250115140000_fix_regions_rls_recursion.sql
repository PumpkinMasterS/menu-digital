-- ============================================================================
-- FIX REGIONS RLS RECURSION - MIGRATION
-- Version: 1.0.0
-- Date: 2025-01-15
-- Description: Fixes infinite recursion in regions RLS policies
-- Author: SaborPortugues Team
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can view their region" ON regions;
DROP POLICY IF EXISTS "Users can view regions for context" ON regions;
DROP POLICY IF EXISTS "Platform owners can manage all regions" ON regions;

-- Create simplified, non-recursive policies for regions
CREATE POLICY "Platform owners can manage all regions" ON regions
    FOR ALL USING (
        (auth.jwt()::jsonb ->> 'role') = 'platform_owner'
        OR 
        (auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'platform_owner'
    );

-- Allow all authenticated users to view active regions (no recursion)
CREATE POLICY "Authenticated users can view active regions" ON regions
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND is_active = true
    );

-- Allow super admins to view all regions in their context
CREATE POLICY "Super admins can view regions" ON regions
    FOR SELECT USING (
        (auth.jwt()::jsonb ->> 'role') = 'super_admin'
        OR 
        (auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- Add comment for documentation
COMMENT ON POLICY "Authenticated users can view active regions" ON regions IS 'Allows all authenticated users to view active regions without recursion';
COMMENT ON POLICY "Super admins can view regions" ON regions IS 'Allows super admins to view regions without recursion';
COMMENT ON POLICY "Platform owners can manage all regions" ON regions IS 'Allows platform owners full access to regions without recursion';

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Fixed regions RLS recursion policies successfully!';
    RAISE NOTICE 'Regions table now has non-recursive policies for better performance';
END $$;