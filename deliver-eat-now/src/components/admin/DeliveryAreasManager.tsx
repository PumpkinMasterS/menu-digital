import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Trash2, MapPin, Circle, Square, Edit, Save, X, Navigation, AlertTriangle, Settings, Palette, Plus, Store, Power, PowerOff } from "lucide-react"
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { loadGoogleMaps } from '@/utils/googleMapsLoader'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface DeliveryZone {
  id: string
  region_id?: string
  name: string
  polygon?: any
  center_lat?: number
  center_lng?: number
  radius_km?: number
  is_active?: boolean
  restaurant_id?: string
  delivery_fee?: number
  minimum_order?: number
  delivery_time_min?: number
  delivery_time_max?: number
  priority?: number
  zone_type?: string
  status?: string
  description?: string
  color?: string
}

interface Restaurant {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

interface DeliveryAreasManagerProps {
  restaurantId?: string
}

const ZONE_COLORS = [
  { name: 'Azul', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Verde', value: '#10B981', bg: 'bg-emerald-500' },
  { name: 'Vermelho', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Laranja', value: '#F59E0B', bg: 'bg-amber-500' },
  { name: 'Roxo', value: '#8B5CF6', bg: 'bg-violet-500' },
  { name: 'Rosa', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'Ciano', value: '#06B6D4', bg: 'bg-cyan-500' },
  { name: 'Lima', value: '#84CC16', bg: 'bg-lime-500' },
]

export function DeliveryAreasManager(props: DeliveryAreasManagerProps = {}) {
  const { restaurantId } = props
  
  // Estados para containers de mapas isolados
  const [mapContainerElement, setMapContainerElement] = useState<HTMLDivElement | null>(null)
  const [zonesMapContainerElement, setZonesMapContainerElement] = useState<HTMLDivElement | null>(null)
  
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [mapLoadingTimeout, setMapLoadingTimeout] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [zonesMap, setZonesMap] = useState<google.maps.Map | null>(null)
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null)
  const [selectedTool, setSelectedTool] = useState<'circle' | 'polygon' | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [restaurantMarker, setRestaurantMarker] = useState<google.maps.Marker | null>(null)
  const [zonesRestaurantMarker, setZonesRestaurantMarker] = useState<google.maps.Marker | null>(null)
  const [isUpdatingPosition, setIsUpdatingPosition] = useState(false)
  const [isLoadingZones, setIsLoadingZones] = useState(false)
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [zoneOverlays, setZoneOverlays] = useState<(google.maps.Circle | google.maps.Polygon)[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Estados para nova zona
  const [newZone, setNewZone] = useState({
    name: '',
    delivery_fee: '0',
    minimum_order: '0',
    delivery_time_min: '30',
    delivery_time_max: '60',
    description: '',
    color: ZONE_COLORS[0].value
  })

  // Estados para edição de zona
  const [editZoneForm, setEditZoneForm] = useState({
    name: '',
    delivery_fee: '0',
    minimum_order: '0',
    delivery_time_min: '30',
    delivery_time_max: '60',
    description: '',
    color: ZONE_COLORS[0].value,
    radius_km: '1.0'
  })
  
  const [activeTab, setActiveTab] = useState('restaurant')
  const [pendingShape, setPendingShape] = useState<google.maps.Circle | google.maps.Polygon | null>(null)

  // Refs para controle interno
  const cleanupFunctionsRef = useRef<(() => void)[]>([])
  const mapsInitializedRef = useRef(false)
  const { user, profile } = useAuth()

  // Criar containers de mapa isolados do React DOM
  useEffect(() => {
    // Criar container para mapa do restaurante
    const mapContainer = document.createElement('div')
    mapContainer.id = 'isolated-restaurant-map'
    mapContainer.style.width = '100%'
    mapContainer.style.height = '400px'
    mapContainer.style.borderRadius = '8px'
    setMapContainerElement(mapContainer)

    // Criar container para mapa das zonas
    const zonesMapContainer = document.createElement('div')
    zonesMapContainer.id = 'isolated-zones-map'
    zonesMapContainer.style.width = '100%'
    zonesMapContainer.style.height = '600px'
    zonesMapContainer.style.borderRadius = '8px'
    setZonesMapContainerElement(zonesMapContainer)

    // Cleanup: remover containers quando o componente for desmontado
    return () => {
      executeAllCleanups()
      if (mapContainer.parentNode) {
        mapContainer.parentNode.removeChild(mapContainer)
      }
      if (zonesMapContainer.parentNode) {
        zonesMapContainer.parentNode.removeChild(zonesMapContainer)
      }
    }
  }, [])

  // Função para adicionar função de cleanup
  const addCleanupFunction = (cleanup: () => void) => {
    cleanupFunctionsRef.current.push(cleanup)
  }

  // Função para executar todas as limpezas
  const executeAllCleanups = () => {
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.warn('Erro na limpeza:', error)
      }
    })
    cleanupFunctionsRef.current = []
  }

  // Verificar se o Google Maps está configurado
  useEffect(() => {
    if (mapsInitializedRef.current) return

    try {
      mapsInitializedRef.current = true
      
      // Aguardar containers estarem prontos
      if (mapContainerElement && zonesMapContainerElement) {
        requestAnimationFrame(() => {
          initializeMaps()
        })
      }

    } catch (error) {
      console.error('Erro na inicialização:', error)
      setMapsError('Erro na inicialização do componente')
    }

    return () => {
      mapsInitializedRef.current = false
      executeAllCleanups()
    }
  }, [mapContainerElement, zonesMapContainerElement])

  // Carregar dados ao inicializar
  useEffect(() => {
    if (user && (profile?.organization_id || restaurantId)) {
      loadRestaurants()
      loadZones()
    }
  }, [user, profile?.organization_id, restaurantId])

  // Auto-selecionar restaurante se restaurantId for fornecido
  useEffect(() => {
    if (restaurantId && restaurants.length > 0) {
      const restaurant = restaurants.find(r => r.id === restaurantId)
      if (restaurant) {
        setSelectedRestaurant(restaurant)
        setRestaurantAddress(restaurant.address)
      }
    }
  }, [restaurantId, restaurants])

  // Carregar mapa quando restaurante for selecionado
  useEffect(() => {
    if (selectedRestaurant && map) {
      createRestaurantMarker(selectedRestaurant)
      setRestaurantAddress(selectedRestaurant.address || '')
    }
  }, [selectedRestaurant, map])

  // Criar marker do restaurante no mapa das zonas
  useEffect(() => {
    if (selectedRestaurant && zonesMap) {
      createZonesRestaurantMarker(selectedRestaurant)
    }
  }, [selectedRestaurant, zonesMap])

  // Limpar overlays quando zonas mudarem
  useEffect(() => {
    if (!zonesMap || zones.length === 0) return
    
    try {
      // Limpar overlays existentes
      zoneOverlays.forEach(overlay => {
        try {
          overlay.setMap(null)
        } catch (error) {
          console.warn('Erro ao limpar overlay:', error)
        }
      })
      setZoneOverlays([])

      // Adicionar overlays das zonas salvas
      const newOverlays: (google.maps.Circle | google.maps.Polygon)[] = []
      
      zones.forEach(zone => {
        try {
          if (zone.zone_type === 'circle' && zone.center_lat && zone.center_lng && zone.radius_km) {
            const circle = new google.maps.Circle({
              center: { lat: zone.center_lat, lng: zone.center_lng },
              radius: zone.radius_km * 1000, // converter para metros
              fillColor: zone.color || ZONE_COLORS[0].value,
              fillOpacity: 0.35,
              strokeColor: zone.color || ZONE_COLORS[0].value,
              strokeOpacity: 0.8,
              strokeWeight: 2,
              map: zonesMap
            })
            newOverlays.push(circle)
          } else if (zone.zone_type === 'polygon' && zone.polygon) {
            const coordinates = zone.polygon.coordinates[0]
            const path = coordinates.map((coord: number[]) => ({
              lat: coord[1],
              lng: coord[0]
            }))
            
            const polygon = new google.maps.Polygon({
              paths: path,
              fillColor: zone.color || ZONE_COLORS[0].value,
              fillOpacity: 0.35,
              strokeColor: zone.color || ZONE_COLORS[0].value,
              strokeOpacity: 0.8,
              strokeWeight: 2,
              map: zonesMap
            })
            newOverlays.push(polygon)
          }
        } catch (error) {
          console.warn('Erro ao criar overlay para zona:', zone.id, error)
        }
      })
      
      setZoneOverlays(newOverlays)
    } catch (error) {
      console.warn('Erro ao atualizar overlays:', error)
    }
  }, [zones, zonesMap])

  // Carregar restaurantes disponíveis
  const loadRestaurants = async () => {
    if (!user) return
    
    setIsLoadingRestaurants(true)
    setLoadingMessage('Carregando restaurantes...')
    
    try {
      let query = supabase
        .from('restaurants')
        .select('id, name, address, latitude, longitude')
        .order('name')

      // Filtrar por restaurante específico se fornecido
      if (restaurantId) {
        query = query.eq('id', restaurantId)
      } else if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao carregar restaurantes:', error)
        setMapsError('Erro ao carregar restaurantes')
        return
      }

      setRestaurants(data || [])
      
    } catch (error) {
      console.error('Erro inesperado ao carregar restaurantes:', error)
      setMapsError('Erro inesperado ao carregar restaurantes')
    } finally {
      setIsLoadingRestaurants(false)
      setLoadingMessage('')
    }
  }

  // Carregar zonas de entrega
  const loadZones = async () => {
    if (!user || !restaurantId) return
    
    setIsLoadingZones(true)
    
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('is_active', { ascending: false })
        .order('name')

      if (error) {
        console.error('Erro ao carregar zonas:', error)
        return
      }

      setZones(data || [])
      
    } catch (error) {
      console.error('Erro inesperado ao carregar zonas:', error)
    } finally {
      setIsLoadingZones(false)
    }
  }

  // Inicializar mapas
  const initializeMaps = async () => {
    if (!mapContainerElement || !zonesMapContainerElement) return

    try {
      setLoadingMessage('🗺️ Conectando ao Google Maps...')
      
      // Carregamento otimizado com cache
      const startTime = Date.now()
      await loadGoogleMaps()
      const loadTime = Date.now() - startTime
      
      setLoadingMessage(`✅ Maps carregado em ${loadTime}ms - Criando interface...`)
      
      // Configurar mapa do restaurante
      const mapOptions = {
        zoom: 14,
        center: { lat: 38.7223, lng: -9.1393 }, // Lisboa como padrão
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        // @ts-ignore
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      }

      const mapInstance = new google.maps.Map(mapContainerElement, mapOptions)
      setMap(mapInstance)

      // Aguardar o mapa estar pronto
      google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', () => {
        setLoadingMessage('✅ Mapa do restaurante carregado!')
        setTimeout(() => setLoadingMessage(''), 2000)
      })

      // Timeout mais generoso para conexões lentas
      const mapTimeout = setTimeout(() => {
        if (!isGoogleMapsLoaded) {
          setMapLoadingTimeout(true)
          setMapsError('Mapa demorou muito a carregar. Verifique a configuração da API Key.')
        }
      }, 45000) // Aumentado para 45 segundos

      addCleanupFunction(() => clearTimeout(mapTimeout))

      setLoadingMessage('🎯 Criando mapa das zonas de entrega...')
      
      // Aguardar um pouco para o primeiro mapa estabilizar
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Configurar mapa das zonas
      const zonesMapOptions = {
        zoom: 13,
        center: { lat: 38.7223, lng: -9.1393 }, // Lisboa como padrão
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        // @ts-ignore
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      }

      const zonesMapInstance = new google.maps.Map(zonesMapContainerElement, zonesMapOptions)
      setZonesMap(zonesMapInstance)

      // Aguardar o mapa das zonas estar pronto
      google.maps.event.addListenerOnce(zonesMapInstance, 'tilesloaded', () => {
        setLoadingMessage('🎉 Sistema de mapas totalmente carregado!')
        setTimeout(() => setLoadingMessage(''), 3000)
      })

      // Inicializar ferramentas de desenho
      initializeDrawingManager(zonesMapInstance)

      setIsGoogleMapsLoaded(true)
      setMapsError(null)
      
    } catch (error) {
      console.error('Erro ao inicializar mapas:', error)
      setMapsError(`Erro ao carregar Google Maps: ${error}`)
      setLoadingMessage('')
    }
  }

  // Inicializar Drawing Manager
  const initializeDrawingManager = (mapInstance: google.maps.Map) => {
    if (!window.google?.maps?.drawing) {
      console.error('Google Maps Drawing Library não está disponível')
      return
    }

    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      circleOptions: {
        fillColor: '#3B82F6',
        fillOpacity: 0.35,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
        editable: false,
        zIndex: 1
      },
      polygonOptions: {
        fillColor: '#3B82F6',
        fillOpacity: 0.35,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
        editable: false,
        zIndex: 1
      }
    })

    drawingManager.setMap(mapInstance)

    // Listener para quando uma forma é completada
    google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
      const shape = event.overlay
      
      // Atualizar cor da forma com a cor selecionada
      shape.setOptions({
        fillColor: newZone.color,
        strokeColor: newZone.color
      })
      
      setPendingShape(shape)
      setIsDrawingMode(false)
      
      // Desabilitar modo de desenho
      drawingManager.setDrawingMode(null)
      setSelectedTool(null)
    })

    setDrawingManager(drawingManager)
  }

  // Criar marker do restaurante
  const createRestaurantMarker = (restaurant: Restaurant) => {
    if (!map) return

    try {
      // Remover marker anterior
      if (restaurantMarker) {
        restaurantMarker.setMap(null)
      }

      // Criar novo marker
      const position = {
        lat: restaurant.latitude || 38.7223,
        lng: restaurant.longitude || -9.1393
      }

      const marker = new google.maps.Marker({
        position,
        map,
        title: restaurant.name,
        draggable: true,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      })

      // Listener para quando o marker é arrastado
      google.maps.event.addListener(marker, 'dragend', async (event) => {
        const newPosition = event.latLng
        await updateRestaurantPosition(restaurant.id, newPosition.lat(), newPosition.lng())
      })

      // Centralizar mapa no restaurante
      map.setCenter(position)
      map.setZoom(15)

      setRestaurantMarker(marker)
      
    } catch (error) {
      console.error('Erro ao criar marker do restaurante:', error)
    }
  }

  // Atualizar posição do restaurante
  const updateRestaurantPosition = async (restaurantId: string, lat: number, lng: number) => {
    setIsUpdatingPosition(true)
    
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          latitude: lat,
          longitude: lng
        })
        .eq('id', restaurantId)

      if (error) throw error

      // Atualizar estado local
      setRestaurants(prev => prev.map(r => 
        r.id === restaurantId ? { ...r, latitude: lat, longitude: lng } : r
      ))

      // Atualizar também selectedRestaurant se for o mesmo
      if (selectedRestaurant?.id === restaurantId) {
        setSelectedRestaurant(prev => prev ? { ...prev, latitude: lat, longitude: lng } : null)
      }

      toast({
        title: "Posição atualizada",
        description: "A localização do restaurante foi atualizada com sucesso!"
      })

    } catch (error) {
      console.error('Erro ao atualizar posição:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar a posição do restaurante",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingPosition(false)
    }
  }

  // Criar marker do restaurante no mapa das zonas
  const createZonesRestaurantMarker = (restaurant: Restaurant) => {
    if (!zonesMap) return

    try {
      // Remover marker anterior
      if (zonesRestaurantMarker) {
        zonesRestaurantMarker.setMap(null)
      }

      // Criar novo marker
      const position = {
        lat: restaurant.latitude || 38.7223,
        lng: restaurant.longitude || -9.1393
      }

      const marker = new google.maps.Marker({
        position,
        map: zonesMap,
        title: restaurant.name,
        draggable: false,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      })

      // Centralizar mapa no restaurante
      zonesMap.setCenter(position)
      zonesMap.setZoom(14)

      setZonesRestaurantMarker(marker)
      
    } catch (error) {
      console.error('Erro ao criar marker do restaurante no mapa das zonas:', error)
    }
  }

  // Geocodificar endereço
  const geocodeAddress = async (address: string) => {
    if (!address || !selectedRestaurant) return

    try {
      const geocoder = new google.maps.Geocoder()
      
      geocoder.geocode({ address }, async (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location
          const lat = location.lat()
          const lng = location.lng()
          
          // Atualizar posição do restaurante
          await updateRestaurantPosition(selectedRestaurant.id, lat, lng)
          
          // Atualizar endereço formatado
          const formattedAddress = results[0].formatted_address
          setRestaurantAddress(formattedAddress)
          
          // Atualizar também no banco de dados
          await supabase
            .from('restaurants')
            .update({
              address: formattedAddress
            })
            .eq('id', selectedRestaurant.id)
          
          // Atualizar marker
          if (restaurantMarker) {
            restaurantMarker.setPosition(location)
          }
          
          // Centralizar mapa
          if (map) {
            map.setCenter(location)
            map.setZoom(15)
          }
          
          toast({
            title: "Endereço encontrado",
            description: "A localização foi atualizada com sucesso!"
          })
          
        } else {
          toast({
            title: "Endereço não encontrado",
            description: "Tente um endereço mais específico",
            variant: "destructive"
          })
        }
      })
    } catch (error) {
      console.error('Erro na geocodificação:', error)
      toast({
        title: "Erro",
        description: "Erro ao encontrar o endereço",
        variant: "destructive"
      })
    }
  }

  // Iniciar desenho
  const startDrawing = (tool: 'circle' | 'polygon') => {
    if (!drawingManager) return

    setSelectedTool(tool)
    setIsDrawingMode(true)
    
    const drawingMode = tool === 'circle' ? google.maps.drawing.OverlayType.CIRCLE : google.maps.drawing.OverlayType.POLYGON
    drawingManager.setDrawingMode(drawingMode)
  }

  // Salvar zona atual
  const saveCurrentZone = async () => {
    if (!pendingShape || !selectedRestaurant) return
    
    try {
      const zoneData = {
        name: newZone.name || `Nova Zona ${zones.length + 1}`,
        zone_type: pendingShape instanceof google.maps.Circle ? 'circle' : 'polygon',
        restaurant_id: selectedRestaurant.id,
        region_id: null, // Removido constraint para permitir zonas sem região específica
        is_active: true,
        status: 'active',
        delivery_fee: parseFloat(newZone.delivery_fee) || 0,
        minimum_order: parseFloat(newZone.minimum_order) || 0,
        delivery_time_min: parseInt(newZone.delivery_time_min) || 30,
        delivery_time_max: parseInt(newZone.delivery_time_max) || 60,
                  priority: 1,
          description: newZone.description || '',
          color: newZone.color || ZONE_COLORS[0].value
      }

      if (pendingShape instanceof google.maps.Circle) {
        const center = pendingShape.getCenter()
        const radius = pendingShape.getRadius()
        Object.assign(zoneData, {
          center_lat: center?.lat(),
          center_lng: center?.lng(),
          radius_km: radius / 1000
        })
      } else if (pendingShape instanceof google.maps.Polygon) {
        const path = pendingShape.getPath()
        const coordinates = []
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i)
          coordinates.push([point.lng(), point.lat()])
        }
        coordinates.push(coordinates[0]) // fechar o polígono
        Object.assign(zoneData, {
          polygon: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        })
      }

      // @ts-ignore
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert([zoneData])
        .select()

      if (error) throw error

      if (data && data[0]) {
        setZones(prev => [...prev, data[0]])
        
        // Atualizar cor do overlay existente
        pendingShape.setOptions({
          fillColor: newZone.color,
          strokeColor: newZone.color
        })
        
        toast({
          title: "Sucesso",
          description: `Zona "${zoneData.name}" criada com sucesso!`
        })

        // Resetar formulário
        setNewZone({
          name: '',
          delivery_fee: '0',
          minimum_order: '0',
          delivery_time_min: '30',
          delivery_time_max: '60',
          description: '',
          color: ZONE_COLORS[0].value
        })
        
        setPendingShape(null)
        setIsDrawingMode(false)
        setSelectedTool(null)
      }
    } catch (error) {
      console.error('Erro ao salvar zona:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar zona de entrega",
        variant: "destructive"
      })
    }
  }

  // Cancelar desenho
  const cancelDrawing = () => {
    if (drawingManager) {
      drawingManager.setDrawingMode(null)
    }
    setSelectedTool(null)
    setIsDrawingMode(false)
  }

  // Deletar zona
  const deleteZone = async (zoneId: string) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', zoneId)

      if (error) throw error

      // Atualizar estado local imediatamente
      setZones(prev => prev.filter(zone => zone.id !== zoneId))

      toast({
        title: "Sucesso",
        description: "Zona de entrega removida!"
      })

    } catch (error) {
      console.error('Erro ao deletar zona:', error)
      toast({
        title: "Erro",
        description: "Erro ao remover zona de entrega",
        variant: "destructive"
      })
    }
  }

  // Editar zona
  const editZone = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setEditZoneForm({
      name: zone.name || '',
      delivery_fee: zone.delivery_fee?.toString() || '0',
      minimum_order: zone.minimum_order?.toString() || '0',
      delivery_time_min: zone.delivery_time_min?.toString() || '30',
      delivery_time_max: zone.delivery_time_max?.toString() || '60',
      description: zone.description || '',
      color: zone.color || ZONE_COLORS[0].value,
      radius_km: zone.radius_km?.toString() || '1.0'
    })
    setEditDialogOpen(true)
  }

  // Salvar edição da zona
  const saveEditZone = async () => {
    if (!editingZone) return
    
    try {
      const updateData = {
        name: editZoneForm.name,
        delivery_fee: parseFloat(editZoneForm.delivery_fee) || 0,
        minimum_order: parseFloat(editZoneForm.minimum_order) || 0,
        delivery_time_min: parseInt(editZoneForm.delivery_time_min) || 30,
        delivery_time_max: parseInt(editZoneForm.delivery_time_max) || 60,
        description: editZoneForm.description,
        color: editZoneForm.color,
        ...(editingZone.zone_type === 'circle' && {
          radius_km: parseFloat(editZoneForm.radius_km) || 1.0
        })
      }

      // @ts-ignore
      const { error } = await supabase
        .from('delivery_zones')
        .update(updateData)
        .eq('id', editingZone.id)

      if (error) throw error

      // Atualizar estado local
      setZones(prev => prev.map(zone => 
        zone.id === editingZone.id ? { ...zone, ...updateData } : zone
      ))

      toast({
        title: "Sucesso",
        description: "Zona atualizada com sucesso!"
      })

      setEditDialogOpen(false)
      setEditingZone(null)
      
    } catch (error) {
      console.error('Erro ao atualizar zona:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar zona de entrega",
        variant: "destructive"
      })
    }
  }

  // Toggle ativo/inativo da zona
  const toggleZoneActive = async (zoneId: string, currentStatus: boolean) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active: !currentStatus })
        .eq('id', zoneId)

      if (error) throw error

      // Atualizar estado local
      setZones(prev => prev.map(zone => 
        zone.id === zoneId ? { ...zone, is_active: !currentStatus } : zone
      ))

      toast({
        title: "Status Atualizado",
        description: !currentStatus ? "Zona ativada com sucesso!" : "Zona desativada temporariamente!"
      })

    } catch (error) {
      console.error('Erro ao alterar status da zona:', error)
      toast({
        title: "Erro",
        description: "Erro ao alterar status da zona",
        variant: "destructive"
      })
    }
  }

  if (mapsError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{mapsError}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Áreas de Entrega</h2>
          <p className="text-muted-foreground">Configure as zonas de entrega para os restaurantes</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isGoogleMapsLoaded ? "default" : "secondary"} className={
            isGoogleMapsLoaded ? "bg-green-600 hover:bg-green-700" : ""
          }>
            {isGoogleMapsLoaded ? '✅ Maps Ativo' : '⏳ Carregando Maps...'}
          </Badge>
          {restaurantId && (
            <Badge variant="outline">
              Modo: Restaurante Específico
            </Badge>
          )}
          {loadingMessage && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              {loadingMessage}
            </Badge>
          )}
        </div>
      </div>

      {mapsError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold text-red-800">🗺️ Problema com Google Maps</div>
              <div className="text-sm text-red-700 whitespace-pre-line">{mapsError}</div>
              <div className="mt-3 p-3 bg-red-100 rounded border text-xs">
                <strong>💡 Soluções rápidas:</strong><br />
                • Verifique o console do navegador (F12) para mais detalhes<br />
                • Confirme que VITE_GOOGLE_MAPS_API_KEY está definida no .env.local<br />
                • A chave deve começar com "AIza..." (não terminar com "=")<br />
                • Verifique as APIs ativadas no Google Cloud Console<br />
                • Consulte GOOGLE_MAPS_SETUP.md para instruções completas
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="restaurant" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="restaurant">
            <MapPin className="w-4 h-4 mr-2" />
            Localização do Restaurante
          </TabsTrigger>
          <TabsTrigger value="zones">
            <Circle className="w-4 h-4 mr-2" />
            Áreas de Entrega
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Definir Localização do Restaurante</CardTitle>
              <CardDescription>
                1️⃣ Escolha o restaurante → 2️⃣ Escreva endereço → 3️⃣ Aparece pin → 4️⃣ Arraste para ajustar → 5️⃣ Guarda automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!restaurantId && (
                <div className="space-y-2">
                  <Label>Restaurante</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={selectedRestaurant?.id || ''}
                    onChange={(e) => {
                      const restaurant = restaurants.find(r => r.id === e.target.value)
                      setSelectedRestaurant(restaurant || null)
                    }}
                  >
                    <option value="">Selecione um restaurante</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {restaurantId && selectedRestaurant && (
                <div className="space-y-2">
                  <Label>Restaurante</Label>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                    <Store className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{selectedRestaurant.name}</p>
                      <p className="text-sm text-gray-600">{selectedRestaurant.address}</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedRestaurant || restaurantId) && (
                <>
                  <div className="space-y-2">
                    <Label>Endereço Completo</Label>
                    <div className="flex gap-2">
                      <Input
                        value={restaurantAddress}
                        onChange={(e) => setRestaurantAddress(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123, Lisboa"
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => geocodeAddress(restaurantAddress)}
                        disabled={!selectedRestaurant}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Localizar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mapa (arraste o pin vermelho para ajustar)</Label>
                    <div className="w-full h-[400px] border rounded-md bg-gray-100 relative">
                      {mapContainerElement && (
                        <div 
                          ref={(el) => {
                            if (el && mapContainerElement && !mapContainerElement.parentNode) {
                              el.appendChild(mapContainerElement)
                            }
                          }}
                          className="w-full h-full"
                        />
                      )}
                      {!isGoogleMapsLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                          <div className="text-center space-y-3">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                            <div>
                              <p className="text-sm text-gray-700 font-medium">
                                {loadingMessage || 'Inicializando Google Maps...'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Primeira vez pode demorar alguns segundos
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {isUpdatingPosition && (
                      <p className="text-sm text-blue-600">Atualizando posição...</p>
                    )}
                    {restaurantId && !selectedRestaurant && (
                      <p className="text-sm text-yellow-600">A carregar dados do restaurante...</p>
                    )}
                    {isGoogleMapsLoaded && !mapsError && !mapLoadingTimeout && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-sm">
                          ✅ <strong>Google Maps carregado!</strong> Pode agora geocodificar endereços e arrastar o pin vermelho.
                        </AlertDescription>
                      </Alert>
                    )}
                    {mapLoadingTimeout && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          ⚠️ <strong>Carregamento lento detectado</strong> - possíveis causas:
                          <div className="mt-3 space-y-2">
                            <div className="bg-white p-3 rounded border text-xs">
                              <strong>🔧 Diagnóstico rápido:</strong>
                              <ol className="mt-1 ml-4 list-decimal space-y-1">
                                <li>Abra o arquivo de teste: <code>test-google-maps.html</code></li>
                                <li>Se funcionar → problema no React/Vite</li>
                                <li>Se não funcionar → problema com API Key</li>
                                <li>Verifique o console (F12) para erros específicos</li>
                              </ol>
                            </div>
                            <div className="text-xs text-gray-600">
                              <strong>Causas comuns:</strong> API Key inválida, quotas excedidas, APIs não ativadas, rede lenta
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones" className="space-y-4">
          {!selectedRestaurant ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure primeiro a localização do restaurante na aba anterior
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Mapa Principal */}
              <div className="lg:col-span-3">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Mapa Interativo das Zonas de Entrega
                    </CardTitle>
                    <CardDescription>
                      Desenhe zonas coloridas no mapa para definir áreas de entrega
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
                      {zonesMapContainerElement && (
                        <div 
                          ref={(el) => {
                            if (el && zonesMapContainerElement && !zonesMapContainerElement.parentNode) {
                              el.appendChild(zonesMapContainerElement)
                            }
                          }}
                          className="w-full h-[600px]"
                        />
                      )}
                      {!isGoogleMapsLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Carregando Google Maps...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {pendingShape && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: newZone.color }}
                            ></div>
                            <span className="text-sm font-medium">
                              Nova zona criada! Configure os detalhes →
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={saveCurrentZone}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Salvar Zona
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Painel de Controles */}
              <div className="lg:col-span-1 space-y-4">
                {/* Criar Nova Zona */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Zona
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Nome da Zona</Label>
                      <Input
                        value={newZone.name}
                        onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                        placeholder="Ex: Centro"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">Taxa (€)</Label>
                        <Input
                          type="number"
                          step="0.50"
                          value={newZone.delivery_fee}
                          onChange={(e) => setNewZone({ ...newZone, delivery_fee: e.target.value })}
                          placeholder="2.50"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Mínimo (€)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={newZone.minimum_order}
                          onChange={(e) => setNewZone({ ...newZone, minimum_order: e.target.value })}
                          placeholder="15"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Tempo Entrega (min)</Label>
                      <Input
                        type="number"
                        value={newZone.delivery_time_min}
                        onChange={(e) => setNewZone({ ...newZone, delivery_time_min: e.target.value })}
                        placeholder="30"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Cor da Zona</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {ZONE_COLORS.map(color => (
                          <button
                            key={color.value}
                            onClick={() => setNewZone({ ...newZone, color: color.value })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              newZone.color === color.value 
                                ? 'border-gray-800 scale-110' 
                                : 'border-gray-300 hover:border-gray-500'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ferramentas de Desenho</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => startDrawing('circle')}
                          variant={selectedTool === 'circle' ? 'default' : 'outline'}
                          size="sm"
                          className="h-auto py-3 flex-col gap-1"
                        >
                          <Circle className="w-4 h-4" />
                          <span className="text-xs">Circular</span>
                        </Button>
                        <Button 
                          onClick={() => startDrawing('polygon')}
                          variant={selectedTool === 'polygon' ? 'default' : 'outline'}
                          size="sm"
                          className="h-auto py-3 flex-col gap-1"
                        >
                          <Square className="w-4 h-4" />
                          <span className="text-xs">Poligonal</span>
                        </Button>
                      </div>
                      
                      {isDrawingMode && (
                        <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-700 mb-2">
                            🖱️ Desenhe no mapa para criar a zona
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={cancelDrawing}
                            className="text-xs h-7"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Zonas Existentes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Zonas Ativas</CardTitle>
                    <CardDescription className="text-xs">
                      {zones.length} zona{zones.length !== 1 ? 's' : ''} configurada{zones.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingZones ? (
                      <div className="text-center py-4">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-xs text-gray-500">Carregando...</p>
                      </div>
                    ) : zones.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma zona criada</p>
                        <p className="text-xs">Use as ferramentas acima</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {zones.map(zone => (
                          <div key={zone.id} className={`p-3 border rounded-lg transition-colors ${
                            zone.is_active ? 'bg-gray-50 hover:bg-gray-100' : 'bg-red-50 hover:bg-red-100 border-red-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: zone.color || ZONE_COLORS[0].value }}
                                  ></div>
                                  <span className={`font-medium text-sm truncate ${
                                    zone.is_active ? 'text-gray-900' : 'text-gray-500'
                                  }`}>{zone.name}</span>
                                  {!zone.is_active && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                      Inativa
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>
                                    {zone.zone_type === 'circle' ? '⭕ Circular' : '⬜ Poligonal'}
                                    {zone.zone_type === 'circle' && zone.radius_km && (
                                      <span className="ml-1 text-blue-600">
                                        • {zone.radius_km.toFixed(1)} km
                                      </span>
                                    )}
                                  </div>
                                  <div>€{zone.delivery_fee} • Min: €{zone.minimum_order}</div>
                                  <div>⏱️ {zone.delivery_time_min}-{zone.delivery_time_max} min</div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleZoneActive(zone.id, zone.is_active || false)}
                                  className={`h-6 w-6 p-0 ${
                                    zone.is_active 
                                      ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                  }`}
                                  title={zone.is_active ? 'Desativar zona' : 'Ativar zona'}
                                >
                                  {zone.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => editZone(zone)}
                                  className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteZone(zone.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Zona de Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome da Zona</Label>
              <Input
                value={editZoneForm.name}
                onChange={(e) => setEditZoneForm({ ...editZoneForm, name: e.target.value })}
                placeholder="Ex: Centro"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Taxa (€)</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={editZoneForm.delivery_fee}
                  onChange={(e) => setEditZoneForm({ ...editZoneForm, delivery_fee: e.target.value })}
                  placeholder="2.50"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Mínimo (€)</Label>
                <Input
                  type="number"
                  step="1"
                  value={editZoneForm.minimum_order}
                  onChange={(e) => setEditZoneForm({ ...editZoneForm, minimum_order: e.target.value })}
                  placeholder="15"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Tempo Mín (min)</Label>
                <Input
                  type="number"
                  value={editZoneForm.delivery_time_min}
                  onChange={(e) => setEditZoneForm({ ...editZoneForm, delivery_time_min: e.target.value })}
                  placeholder="30"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Tempo Máx (min)</Label>
                <Input
                  type="number"
                  value={editZoneForm.delivery_time_max}
                  onChange={(e) => setEditZoneForm({ ...editZoneForm, delivery_time_max: e.target.value })}
                  placeholder="60"
                  className="mt-1"
                />
              </div>
            </div>

            {editingZone?.zone_type === 'circle' && (
              <div>
                <Label className="text-sm font-medium">Raio da Zona (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editZoneForm.radius_km}
                  onChange={(e) => setEditZoneForm({ ...editZoneForm, radius_km: e.target.value })}
                  placeholder="1.0"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Defina o raio em quilômetros para a zona circular
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block">Cor da Zona</Label>
              <div className="grid grid-cols-4 gap-2">
                {ZONE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setEditZoneForm({ ...editZoneForm, color: color.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editZoneForm.color === color.value 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <Textarea
                value={editZoneForm.description}
                onChange={(e) => setEditZoneForm({ ...editZoneForm, description: e.target.value })}
                placeholder="Descrição opcional da zona"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={saveEditZone}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 