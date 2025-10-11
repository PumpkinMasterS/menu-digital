import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { useLocation } from '@/hooks/useLocation'
import { useDeliveries } from '@/hooks/useDeliveries'
import { LoadingSpinner } from '@/components/ui'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { navigationService } from '@/services/NavigationService'
import NavigationSelector from '@/components/common/NavigationSelector'

const { width, height } = Dimensions.get('window')
const ASPECT_RATIO = width / height
const LATITUDE_DELTA = 0.0922
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO

interface MapScreenProps {
  route?: {
    params?: {
      orderId?: string
      destination?: {
        latitude: number
        longitude: number
        address: string
      }
    }
  }
}

export default function MapScreen({ route }: MapScreenProps) {
  const mapRef = useRef<MapView>(null)
  const { 
    location, 
    loading: locationLoading, 
    error: locationError,
    hasPermission,
    requestPermission,
    getCurrentLocation,
    startTracking,
    stopTracking
  } = useLocation()
  
  const { activeDelivery } = useDeliveries()
  
  const [isTracking, setIsTracking] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([])
  const [routeDistance, setRouteDistance] = useState<string>('')
  const [routeDuration, setRouteDuration] = useState<string>('')
  const [showNavigationSelector, setShowNavigationSelector] = useState(false)
  const [destination, setDestination] = useState<any>(null)

  useEffect(() => {
    initializeMap()
    return () => {
      stopTracking()
    }
  }, [])

  useEffect(() => {
    // Se há uma entrega ativa, definir o destino
    if (activeDelivery) {
      const dest = {
        latitude: activeDelivery.delivery_address?.latitude || 0,
        longitude: activeDelivery.delivery_address?.longitude || 0,
        address: activeDelivery.delivery_address?.full_address || 'Endereço não disponível'
      }
      setDestination(dest)
    } else if (route?.params?.destination) {
      setDestination(route.params.destination)
    }
  }, [activeDelivery, route?.params])

  useEffect(() => {
    // Atualizar rota quando localização ou destino mudar
    if (location && destination) {
      updateRoute()
    }
  }, [location, destination])

  const initializeMap = async () => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) {
        Alert.alert(
          'Permissão Necessária',
          'É necessário permitir o acesso à localização para usar o mapa.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tentar Novamente', onPress: requestPermission }
          ]
        )
        return
      }
    }
    
    await getCurrentLocation()
  }

  const updateRoute = () => {
    if (!location || !destination) return

    // Simular rota (em produção, usar Google Directions API)
    const route = [
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    ]
    setRouteCoordinates(route)

    // Ajustar o mapa para mostrar toda a rota
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      })
    }
  }

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking()
      setIsTracking(false)
    } else {
      startTracking()
      setIsTracking(true)
    }
  }

  const handleCenterOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      })
    }
  }

  const handleNavigate = () => {
    if (!destination) {
      Alert.alert('Erro', 'Destino não encontrado')
      return
    }
    setShowNavigationSelector(true)
  }

  if (locationLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Obtendo localização...</Text>
      </SafeAreaView>
    )
  }

  if (locationError || !hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="location-off" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Localização Indisponível</Text>
          <Text style={styles.errorText}>
            {locationError || 'Permissão de localização necessária'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeMap}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isTracking}
        initialRegion={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        } : undefined}
      >
        {/* Marcador da localização atual */}
        {location && (
          <Marker
            coordinate={location}
            title="Sua Localização"
            description="Você está aqui"
            pinColor="blue"
          />
        )}

        {/* Marcador do destino */}
        {destination && (
          <Marker
            coordinate={destination}
            title="Destino"
            description={destination.address}
            pinColor="red"
          />
        )}

        {/* Rota */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3B82F6"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Controles do mapa */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCenterOnLocation}
        >
          <Icon name="my-location" size={24} color="#3B82F6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isTracking && styles.activeButton]}
          onPress={handleToggleTracking}
        >
          <Icon 
            name={isTracking ? "gps-fixed" : "gps-not-fixed"} 
            size={24} 
            color={isTracking ? "#FFFFFF" : "#3B82F6"} 
          />
        </TouchableOpacity>

        {destination && (
          <TouchableOpacity
            style={styles.navigationButton}
            onPress={handleNavigate}
          >
            <Icon name="navigation" size={24} color="#FFFFFF" />
            <Text style={styles.navigationButtonText}>Navegar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Informações da entrega */}
      {activeDelivery && (
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryTitle}>Entrega Ativa</Text>
          <Text style={styles.deliveryAddress}>
            {activeDelivery.delivery_address?.full_address}
          </Text>
          <Text style={styles.deliveryCustomer}>
            Cliente: {activeDelivery.customer_name}
          </Text>
        </View>
      )}

      {/* Navigation Selector Modal */}
      <NavigationSelector
        visible={showNavigationSelector}
        destination={destination}
        onClose={() => setShowNavigationSelector(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  map: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    right: 16,
    top: 100,
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeButton: {
    backgroundColor: '#3B82F6',
  },
  navigationButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 8,
  },
  navigationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  deliveryCustomer: {
    fontSize: 14,
    color: '#6B7280',
  },
})