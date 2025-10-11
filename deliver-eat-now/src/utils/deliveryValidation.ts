import { supabase } from '@/integrations/supabase/client'

interface DeliveryZone {
  id: string
  name: string
  zone_type: 'circle' | 'polygon'
  center_lat?: number
  center_lng?: number
  radius_km?: number
  polygon_coordinates?: number[][]
  delivery_fee: number
  minimum_order: number
  delivery_time_min: number
  delivery_time_max: number
  status: 'active' | 'inactive' | 'draft'
  priority: number
}

interface ValidationResult {
  isValid: boolean
  matchedZone?: DeliveryZone
  reason?: string
  deliveryFee?: number
  minimumOrder?: number
  estimatedTime?: string
}

interface Coordinates {
  lat: number
  lng: number
}

/**
 * Geocode an address to get coordinates
 */
export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  try {
    if (!window.google?.maps) {
      throw new Error('Google Maps API not loaded')
    }

    const geocoder = new google.maps.Geocoder()
    const result = await geocoder.geocode({ 
      address: `${address}, Portugal`,
      region: 'PT' // Bias results to Portugal
    })

    if (result.results && result.results.length > 0) {
      const location = result.results[0].geometry.location
      return {
        lat: location.lat(),
        lng: location.lng()
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180
  const dLng = (point2.lng - point1.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 */
export const pointInPolygon = (point: Coordinates, polygon: number[][]): boolean => {
  const x = point.lng
  const y = point.lat
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1] // longitude
    const yi = polygon[i][0] // latitude
    const xj = polygon[j][1] // longitude
    const yj = polygon[j][0] // latitude

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Check if coordinates are within a circular delivery zone
 */
export const isWithinCircle = (
  customerCoords: Coordinates,
  center: Coordinates,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(customerCoords, center)
  return distance <= radiusKm
}

/**
 * Fetch active delivery zones for a restaurant
 */
export const getRestaurantDeliveryZones = async (restaurantId: string): Promise<DeliveryZone[]> => {
  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .order('priority', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching delivery zones:', error)
    return []
  }
}

/**
 * Validate if an address is within delivery areas for a restaurant
 */
export const validateDeliveryAddress = async (
  restaurantId: string,
  address: string
): Promise<ValidationResult> => {
  try {
    // Step 1: Geocode the address
    const coordinates = await geocodeAddress(address)
    if (!coordinates) {
      return {
        isValid: false,
        reason: 'Não foi possível localizar o endereço fornecido. Verifique se está correto.'
      }
    }

    // Step 2: Get restaurant delivery zones
    const deliveryZones = await getRestaurantDeliveryZones(restaurantId)
    if (deliveryZones.length === 0) {
      return {
        isValid: false,
        reason: 'Este restaurante ainda não configurou áreas de entrega.'
      }
    }

    // Step 3: Check each zone (ordered by priority)
    for (const zone of deliveryZones) {
      let isInZone = false

      if (zone.zone_type === 'circle' && zone.center_lat && zone.center_lng && zone.radius_km) {
        isInZone = isWithinCircle(
          coordinates,
          { lat: zone.center_lat, lng: zone.center_lng },
          zone.radius_km
        )
      } else if (zone.zone_type === 'polygon' && zone.polygon_coordinates) {
        isInZone = pointInPolygon(coordinates, zone.polygon_coordinates)
      }

      if (isInZone) {
        return {
          isValid: true,
          matchedZone: zone,
          deliveryFee: zone.delivery_fee,
          minimumOrder: zone.minimum_order,
          estimatedTime: `${zone.delivery_time_min}-${zone.delivery_time_max} minutos`
        }
      }
    }

    // No zones matched
    return {
      isValid: false,
      reason: 'Este endereço está fora da nossa área de entrega.'
    }

  } catch (error) {
    console.error('Error validating delivery address:', error)
    return {
      isValid: false,
      reason: 'Erro ao validar endereço. Tente novamente.'
    }
  }
}

/**
 * Get delivery options for a specific address
 */
export const getDeliveryOptions = async (
  restaurantId: string,
  address: string
): Promise<{
  isAvailable: boolean
  fee: number
  minimumOrder: number
  estimatedTime: string
  zoneName?: string
} | null> => {
  const validation = await validateDeliveryAddress(restaurantId, address)
  
  if (validation.isValid && validation.matchedZone) {
    return {
      isAvailable: true,
      fee: validation.deliveryFee!,
      minimumOrder: validation.minimumOrder!,
      estimatedTime: validation.estimatedTime!,
      zoneName: validation.matchedZone.name
    }
  }

  return {
    isAvailable: false,
    fee: 0,
    minimumOrder: 0,
    estimatedTime: ''
  }
}

/**
 * Validate order total against minimum order for delivery zone
 */
export const validateOrderMinimum = async (
  restaurantId: string,
  address: string,
  orderTotal: number
): Promise<{
  isValid: boolean
  minimumRequired?: number
  shortfall?: number
}> => {
  const validation = await validateDeliveryAddress(restaurantId, address)
  
  if (!validation.isValid || !validation.minimumOrder) {
    return { isValid: false }
  }

  const isValid = orderTotal >= validation.minimumOrder
  
  return {
    isValid,
    minimumRequired: validation.minimumOrder,
    shortfall: isValid ? 0 : validation.minimumOrder - orderTotal
  }
} 