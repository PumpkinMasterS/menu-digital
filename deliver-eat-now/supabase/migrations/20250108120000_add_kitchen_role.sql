-- ============================================================================
-- ADD KITCHEN ROLE TO SYSTEM
-- Migration to add 'kitchen' role for restaurant kitchen staff
-- ============================================================================

-- Add 'kitchen' to the app_role enum
ALTER TYPE app_role ADD VALUE 'kitchen';

-- Add 'platform_owner' if not exists (ensure all roles are present)
DO $$
BEGIN
    BEGIN
        ALTER TYPE app_role ADD VALUE 'platform_owner';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Value already exists, ignore
            NULL;
    END;
END $$;

-- Update the handle_new_user function to handle kitchen role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for kitchen staff
-- Kitchen staff can view and update orders from their restaurant
CREATE POLICY "Kitchen staff can view restaurant orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.restaurants r ON r.owner_id = p.id 
      WHERE p.id = auth.uid() 
      AND p.role IN ('restaurant_admin', 'kitchen')
      AND r.id = orders.restaurant_id
    )
  );

CREATE POLICY "Kitchen staff can update restaurant orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.restaurants r ON r.owner_id = p.id 
      WHERE p.id = auth.uid() 
      AND p.role IN ('restaurant_admin', 'kitchen')
      AND r.id = orders.restaurant_id
    )
  );

-- Kitchen staff can view order items for their restaurant's orders
CREATE POLICY "Kitchen staff can view restaurant order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.restaurants r ON r.owner_id = p.id 
      JOIN public.orders o ON o.restaurant_id = r.id
      WHERE p.id = auth.uid() 
      AND p.role IN ('restaurant_admin', 'kitchen')
      AND o.id = order_items.order_id
    )
  );

-- Kitchen staff can view meals from their restaurant
CREATE POLICY "Kitchen staff can view restaurant meals" ON public.meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.restaurants r ON r.owner_id = p.id 
      WHERE p.id = auth.uid() 
      AND p.role IN ('restaurant_admin', 'kitchen')
      AND r.id = meals.restaurant_id
    )
  );

-- Add index for better performance on role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_restaurant ON profiles(role) WHERE role IN ('restaurant_admin', 'kitchen');

-- Add comment explaining kitchen role
COMMENT ON TYPE app_role IS 'User roles: customer (default), driver, restaurant_admin (owner), kitchen (staff), super_admin, platform_owner';

-- Create function to check if user has kitchen access to restaurant
CREATE OR REPLACE FUNCTION public.has_kitchen_access(restaurant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.restaurants r ON r.owner_id = p.id 
    WHERE p.id = auth.uid() 
    AND p.role IN ('restaurant_admin', 'kitchen')
    AND r.id = restaurant_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER; 