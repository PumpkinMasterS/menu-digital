import { Platform, Linking } from 'react-native'

export interface NavigationDestination {
  latitude: number
  longitude: number
  address?: string
}

export interface RouteInfo {
  distance: string
  duration: string
  coordinates: Array<{ latitude: number; longitude: number }>
}

class NavigationService {
  private googleMapsApiKey: string | null = null

  setGoogleMapsApiKey(apiKey: string) {
    this.googleMapsApiKey = apiKey
  }

  /**
   * Abre o aplicativo de navegação nativo do dispositivo
   */
  async openNativeNavigation(destination: NavigationDestination): Promise<boolean> {
    try {
      const { latitude, longitude } = destination
      
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}`,
      })

      if (url && await Linking.canOpenURL(url)) {
        await Linking.openURL(url)
        return true
      }

      // Fallback para Google Maps web
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      if (await Linking.canOpenURL(webUrl)) {
        await Linking.openURL(webUrl)
        return true
      }

      return false
    } catch (error) {
      console.error('Erro ao abrir navegação:', error)
      return false
    }
  }

  /**
   * Abre o Google Maps com navegação
   */
  async openGoogleMaps(destination: NavigationDestination): Promise<boolean> {
    try {
      const { latitude, longitude } = destination
      
      // Tentar abrir o app do Google Maps
      const appUrl = Platform.select({
        ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
        android: `google.navigation:q=${latitude},${longitude}`,
      })

      if (appUrl && await Linking.canOpenURL(appUrl)) {
        await Linking.openURL(appUrl)
        return true
      }

      // Fallback para web
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
      if (await Linking.canOpenURL(webUrl)) {
        await Linking.openURL(webUrl)
        return true
      }

      return false
    } catch (error) {
      console.error('Erro ao abrir Google Maps:', error)
      return false
    }
  }

  /**
   * Abre o Waze com navegação
   */
  async openWaze(destination: NavigationDestination): Promise<boolean> {
    try {
      const { latitude, longitude } = destination
      const wazeUrl = `waze://?ll=${latitude},${longitude}&navigate=yes`

      if (await Linking.canOpenURL(wazeUrl)) {
        await Linking.openURL(wazeUrl)
        return true
      }

      // Fallback para web
      const webUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
      if (await Linking.canOpenURL(webUrl)) {
        await Linking.openURL(webUrl)
        return true
      }

      return false
    } catch (error) {
      console.error('Erro ao abrir Waze:', error)
      return false
    }
  }

  /**
   * Obtém informações de rota usando Google Directions API
   */
  async getRouteInfo(
    origin: { latitude: number; longitude: number },
    destination: NavigationDestination
  ): Promise<RouteInfo | null> {
    if (!this.googleMapsApiKey) {
      console.warn('Google Maps API Key não configurada')
      return null
    }

    try {
      const originStr = `${origin.latitude},${origin.longitude}`
      const destinationStr = `${destination.latitude},${destination.longitude}`
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${this.googleMapsApiKey}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0]
        const leg = route.legs[0]

        // Decodificar polyline para obter coordenadas
        const coordinates = this.decodePolyline(route.overview_polyline.points)

        return {
          distance: leg.distance.text,
          duration: leg.duration.text,
          coordinates,
        }
      }

      return null
    } catch (error) {
      console.error('Erro ao obter informações de rota:', error)
      return null
    }
  }

  /**
   * Calcula distância aproximada entre dois pontos (em metros)
   */
  calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3 // Raio da Terra em metros
    const φ1 = (point1.latitude * Math.PI) / 180
    const φ2 = (point2.latitude * Math.PI) / 180
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Formata distância para exibição
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    } else {
      return `${(meters / 1000).toFixed(1)}km`
    }
  }

  /**
   * Decodifica polyline do Google Maps
   */
  private decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    const coordinates: Array<{ latitude: number; longitude: number }> = []
    let index = 0
    let lat = 0
    let lng = 0

    while (index < encoded.length) {
      let b
      let shift = 0
      let result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
      lat += dlat

      shift = 0
      result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
      lng += dlng

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      })
    }

    return coordinates
  }
}

export const navigationService = new NavigationService()
export default navigationService