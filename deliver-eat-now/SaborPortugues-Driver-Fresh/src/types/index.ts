import { Database } from './database'

// Tipos derivados da base de dados
export type User = Database['public']['Tables']['users']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Order = Database['public']['Tables']['orders']['Row']

// Tipos específicos para drivers
export interface Driver extends User {
  role: 'driver'
  organization_id: string
  profile_completed: boolean
  documents_verified: boolean
  status: 'pending' | 'active' | 'inactive' | 'suspended'
  background_check_status: 'pending' | 'approved' | 'rejected'
}

export interface DeliveryOrder extends Order {
  restaurants: Restaurant
  customers: {
    name: string | null
    phone: string | null
    delivery_address: string
  }
}

export interface DriverStats {
  todayDeliveries: number
  todayEarnings: number
  totalDeliveries?: number
  averageRating?: number
}

// Estados da aplicação
export type OrderStatus = 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'

export interface Location {
  latitude: number
  longitude: number
}

export interface DeliveryLocation extends Location {
  address: string
  name?: string
}

// Navegação
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Login: undefined
  Activation: { token?: string; email?: string }
  Home: undefined
  DeliveryDetails: { orderId: string }
  ActiveDelivery: { orderId: string }
  Map: { orderId?: string }
  Profile: undefined
  History: undefined
}

export type BottomTabParamList = {
  Home: undefined
  Active: undefined
  Map: undefined
  Profile: undefined
}

// Contextos
export interface AuthContextType {
  user: Driver | null
  loading: boolean
  needsOnboarding: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export interface LocationContextType {
  location: Location | null
  loading: boolean
  error: string | null
  requestPermission: () => Promise<boolean>
  startTracking: () => Promise<void>
  stopTracking: () => void
}

// Notificações
export interface PushNotification {
  title: string
  body: string
  data?: {
    orderId?: string
    type?: 'new_delivery' | 'order_update' | 'general'
  }
}

// API Responses
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// Formulários
export interface LoginForm {
  email: string
  password: string
}

// Configurações
export interface AppConfig {
  mapApiKey: string
  notificationSettings: {
    newDeliveries: boolean
    orderUpdates: boolean
    general: boolean
  }
  locationSettings: {
    trackingEnabled: boolean
    backgroundTracking: boolean
  }
}