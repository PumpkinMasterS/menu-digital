import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { driverAuth } from '@/config/supabase'
import { Driver } from '@/types'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AuthContextType {
  user: Driver | null
  loading: boolean
  needsOnboarding: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    // Verificar sessão existente
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const session = await driverAuth.getSession()
      if (session?.user) {
        const profile = await driverAuth.validateDriver(session.user.id)
        const driverUser = { ...session.user, ...profile } as Driver
        setUser(driverUser)
        
        // Verificar se o motorista precisa completar o onboarding
        if (driverUser.role === 'driver' && !driverUser.profile_completed) {
          setNeedsOnboarding(true)
        } else {
          setNeedsOnboarding(false)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { user: authUser, profile } = await driverAuth.signIn(email, password)
      if (authUser && profile) {
        const driverUser = { ...authUser, ...profile } as Driver
        setUser(driverUser)
        
        // Verificar se o motorista precisa completar o onboarding
        if (driverUser.role === 'driver' && !driverUser.profile_completed) {
          setNeedsOnboarding(true)
        } else {
          setNeedsOnboarding(false)
        }
        
        // Salvar dados básicos localmente
        await AsyncStorage.setItem('driver_profile', JSON.stringify(profile))
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await driverAuth.signOut()
      setUser(null)
      setNeedsOnboarding(false)
      await AsyncStorage.removeItem('driver_profile')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (user) {
      try {
        const profile = await driverAuth.validateDriver(user.id)
        const updatedUser = { ...user, ...profile } as Driver
        setUser(updatedUser)
        
        // Atualizar o status do onboarding se necessário
        if (updatedUser.role === 'driver' && !updatedUser.profile_completed) {
          setNeedsOnboarding(true)
        } else {
          setNeedsOnboarding(false)
        }
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, needsOnboarding, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}