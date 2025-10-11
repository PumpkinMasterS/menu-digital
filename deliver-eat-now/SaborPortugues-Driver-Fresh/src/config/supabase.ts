import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Database } from '@/types/database'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://misswwtaysshbnnsjhtv.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pc3N3d3RheXNzaGJubnNqaHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MTczMjYsImV4cCI6MjA2NzI5MzMyNn0.fm4pHr65zETB3zcQE--faMicdWr7pSDCatTKfMy0suE'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Driver-specific helper functions
export const driverAuth = {
  // Login específico para drivers
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    // Verificar se o usuário é um driver
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('id', data.user.id)
        .eq('role', 'driver')
        .single()
      
      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error('Acesso negado. Esta conta não é de um driver.')
      }
      
      return { user: data.user, profile }
    }
    
    return { user: null, profile: null }
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Obter sessão atual
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Verificar se é driver válido
  async validateDriver(userId: string) {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        id,
        user_id,
        organization_id,
        profile_completed,
        documents_verified,
        status,
        background_check_status,
        profiles!inner (
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    
    // Combinar dados do driver com dados do perfil
    const driverData = {
      id: data.profiles.id,
      email: data.profiles.email,
      full_name: data.profiles.full_name,
      role: data.profiles.role,
      organization_id: data.organization_id,
      profile_completed: data.profile_completed,
      documents_verified: data.documents_verified,
      status: data.status,
      background_check_status: data.background_check_status
    }
    
    return driverData
  }
}

// Driver-specific queries
export const driverQueries = {
  // Buscar entregas disponíveis para o driver
  async getAvailableDeliveries(organizationId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants (
          name,
          address,
          phone
        ),
        customers:customer_id (
          name,
          phone,
          delivery_address
        )
      `)
      .eq('status', 'confirmed')
      .eq('restaurants.organization_id', organizationId)
      .is('driver_id', null)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Buscar entregas ativas do driver
  async getActiveDeliveries(driverId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants (
          name,
          address,
          phone
        ),
        customers:customer_id (
          name,
          phone,
          delivery_address
        )
      `)
      .eq('driver_id', driverId)
      .in('status', ['picked_up', 'in_transit'])
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Aceitar entrega
  async acceptDelivery(orderId: string, driverId: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        status: 'picked_up',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .is('driver_id', null) // Garantir que não foi aceita por outro driver
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Atualizar status da entrega
  async updateDeliveryStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Histórico de entregas do driver
  async getDeliveryHistory(driverId: string, limit = 50) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants (
          name
        )
      `)
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  // Estatísticas do driver
  async getDriverStats(driverId: string) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('created_at', today)
    
    if (error) throw error
    
    const todayDeliveries = data?.length || 0
    const todayEarnings = data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    
    return {
      todayDeliveries,
      todayEarnings
    }
  },

  // Completar onboarding do driver
  async completeOnboarding(onboardingData: any) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No active session')

    const { data, error } = await supabase.functions.invoke('complete-driver-onboarding', {
      body: { onboardingData },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) throw error
    return data
  }
}

// Real-time subscriptions para drivers
export const driverSubscriptions = {
  // Escutar novas entregas disponíveis
  subscribeToNewDeliveries(organizationId: string, callback: (payload: any) => void) {
    return supabase
      .channel('new-deliveries')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `status=eq.confirmed`
        },
        callback
      )
      .subscribe()
  },

  // Escutar atualizações nas entregas do driver
  subscribeToDriverDeliveries(driverId: string, callback: (payload: any) => void) {
    return supabase
      .channel('driver-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driverId}`
        },
        callback
      )
      .subscribe()
  }
}