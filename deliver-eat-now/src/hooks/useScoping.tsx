import { useAuth } from '@/hooks/useAuth'
import { useViewScope } from '@/hooks/useViewScope'
import { supabase } from '@/integrations/supabase/client'

export const useScoping = () => {
  const { profile } = useAuth()
  const { activeViewScope, isViewingAs } = useViewScope()

  // Get effective role (real role or viewing as role)
  const getEffectiveRole = () => {
    if (isViewingAs && activeViewScope?.viewingAsRole) {
      return activeViewScope.viewingAsRole
    }
    return profile?.role
  }

  // Get effective scope IDs based on view context
  const getEffectiveScope = () => {
    if (isViewingAs && activeViewScope) {
      return {
        organizationId: activeViewScope.organizationId,
        regionId: activeViewScope.regionId,
        restaurantId: activeViewScope.restaurantId
      }
    }
    
    // Use real user scope
    return {
      organizationId: profile?.organization_id,
      regionId: profile?.region_id,
      restaurantId: profile?.restaurant_id
    }
  }

  // Check if user can see all data (platform_owner not viewing as someone else)
  const canSeeAll = () => {
    return profile?.role === 'platform_owner' && !isViewingAs
  }

  // Check if user can only see regional data (super_admin or viewing as super_admin)
  const isRegionalAdmin = () => {
    const effectiveRole = getEffectiveRole()
    const scope = getEffectiveScope()
    return effectiveRole === 'super_admin' && scope.regionId
  }

  // Check if user can only see restaurant data (restaurant_admin, kitchen or viewing as such)
  const isRestaurantLevel = () => {
    const effectiveRole = getEffectiveRole()
    const scope = getEffectiveScope()
    return ['restaurant_admin', 'kitchen'].includes(effectiveRole) && scope.restaurantId
  }

  // Get the appropriate query filter for restaurants
  const getRestaurantFilter = (query: any) => {
    const scope = getEffectiveScope()
    
    if (canSeeAll()) {
      return query // No filter for platform_owner when not viewing as someone else
    }
    
    if (isRegionalAdmin()) {
      return query.eq('region_id', scope.regionId)
    }
    
    if (isRestaurantLevel()) {
      return query.eq('id', scope.restaurantId)
    }
    
    return query.eq('id', null) // No access for other roles
  }

  // Get the appropriate query filter for users
  const getUserFilter = (query: any) => {
    const scope = getEffectiveScope()
    
    if (canSeeAll()) {
      return query // No filter for platform_owner when not viewing as someone else
    }
    
    if (isRegionalAdmin()) {
      return query.eq('region_id', scope.regionId)
    }
    
    if (isRestaurantLevel()) {
      return query.eq('restaurant_id', scope.restaurantId)
    }
    
    return query.eq('id', null) // No access for other roles
  }

  // Get the appropriate query filter for orders
  const getOrderFilter = (query: any) => {
    const scope = getEffectiveScope()
    
    if (canSeeAll()) {
      return query // No filter for platform_owner when not viewing as someone else
    }
    
    if (isRegionalAdmin()) {
      // For regional admins, we'll need to filter by region
      // This will be handled at the component level to avoid deep type instantiation
      return query.filter('restaurants.region_id', 'eq', scope.regionId)
    }
    
    if (isRestaurantLevel()) {
      return query.eq('restaurant_id', scope.restaurantId)
    }
    
    return query.eq('id', null) // No access for other roles
  }

  // Get available roles that current user can create
  const getCreatableRoles = () => {
    switch (profile?.role) {
      case 'platform_owner':
        return [
          { value: 'super_admin', label: 'Super Admin Regional' }
        ]
      
      case 'super_admin':
        return [
          { value: 'restaurant_admin', label: 'Admin Restaurante' },
          { value: 'kitchen', label: 'Cozinha' },
          { value: 'driver', label: 'Motorista' }
        ]
      
      case 'restaurant_admin':
        return [
          { value: 'kitchen', label: 'Cozinha' }
        ]
      
      default:
        return []
    }
  }

  // Get the default values for creating new users
  const getDefaultUserValues = () => {
    const defaults: any = {
      created_by: profile?.id
    }

    if (isRegionalAdmin()) {
      defaults.region_id = profile.region_id
    }

    if (isRestaurantLevel()) {
      defaults.restaurant_id = profile.restaurant_id
    }

    return defaults
  }

  return {
    canSeeAll,
    isRegionalAdmin,
    isRestaurantLevel,
    getRestaurantFilter,
    getUserFilter,
    getOrderFilter,
    getCreatableRoles,
    getDefaultUserValues,
    getEffectiveRole,
    getEffectiveScope,
    currentRole: profile?.role,
    currentRegion: profile?.region,
    currentRestaurant: profile?.restaurant,
    isViewingAs
  }
} 