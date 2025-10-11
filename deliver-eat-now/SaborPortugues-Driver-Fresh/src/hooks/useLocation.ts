import { useState, useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { Location as LocationType } from '@/types'

export function useLocation() {
  const [location, setLocation] = useState<LocationType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const watchSubscription = useRef<Location.LocationSubscription | null>(null)

  useEffect(() => {
    checkPermissions()
    return () => {
      stopTracking()
    }
  }, [])

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      setHasPermission(status === 'granted')
      
      if (status === 'granted') {
        getCurrentLocation()
      }
    } catch (err) {
      setError('Erro ao verificar permissões de localização')
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      const granted = status === 'granted'
      setHasPermission(granted)
      
      if (granted) {
        getCurrentLocation()
      } else {
        setError('Permissão de localização negada')
      }
      
      return granted
    } catch (err) {
      setError('Erro ao solicitar permissão de localização')
      return false
    }
  }

  const getCurrentLocation = async () => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) return
    }

    try {
      setLoading(true)
      setError(null)
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      })
    } catch (err) {
      setError('Erro ao obter localização atual')
    } finally {
      setLoading(false)
    }
  }

  const startTracking = async () => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) return
    }

    try {
      // Solicitar permissão de background se necessário
      const { status } = await Location.requestBackgroundPermissionsAsync()
      
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 segundos
          distanceInterval: 10, // 10 metros
        },
        (newLocation) => {
          setLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          })
        }
      )
    } catch (err) {
      setError('Erro ao iniciar rastreamento de localização')
    }
  }

  const stopTracking = () => {
    if (watchSubscription.current) {
      watchSubscription.current.remove()
      watchSubscription.current = null
    }
  }

  return {
    location,
    loading,
    error,
    hasPermission,
    requestPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
  }
}