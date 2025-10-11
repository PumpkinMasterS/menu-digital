import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: any | null
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any | null>(null)

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch user profile
          const fetchProfile = async () => {
            try {
              const response = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (response.error) {
                // If profile doesn't exist, create it
                if (response.error.code === 'PGRST116') {
                  const createResponse = await supabase
                    .from('profiles')
                    .insert({
                      id: session.user.id,
                      email: session.user.email || '',
                      full_name: session.user.user_metadata?.full_name || '',
                      role: session.user.user_metadata?.role || 'customer'
                    })
                    .select()
                    .single()
                  
                  if (createResponse.data) {
                    setProfile(createResponse.data)
                  }
                }
              } else if (response.data) {
                // Load basic profile first
                let profileData = response.data

                // Check if profile role matches user metadata role and update if needed
                const metadataRole = session.user.user_metadata?.role
                if (metadataRole && profileData.role !== metadataRole) {
                  console.log(`🔄 Updating profile role from '${profileData.role}' to '${metadataRole}'`)
                  const updateResponse = await supabase
                    .from('profiles')
                    .update({ role: metadataRole })
                    .eq('id', session.user.id)
                    .select()
                    .single()
                  
                  if (updateResponse.data) {
                    profileData = updateResponse.data
                  }
                }

                // Then load hierarchical relationships if they exist
                if (profileData.created_by || profileData.region_id || profileData.restaurant_id) {
                  try {
                    const hierarchyPromises = []
                    
                    // Load creator info
                    if (profileData.created_by) {
                      hierarchyPromises.push(
                        supabase
                          .from('profiles')
                          .select('id, full_name, role')
                          .eq('id', profileData.created_by)
                          .single()
                          .then(result => ({ type: 'created_by', data: result.data }))
                      )
                    }
                    
                    // Load region info  
                    if (profileData.region_id) {
                      hierarchyPromises.push(
                        supabase
                          .from('regions')
                          .select('id, name, country_code')
                          .eq('id', profileData.region_id)
                          .single()
                          .then(result => ({ type: 'region', data: result.data }))
                      )
                    }
                    
                    // Load restaurant info
                    if (profileData.restaurant_id) {
                      hierarchyPromises.push(
                        supabase
                          .from('restaurants')
                          .select('id, name')
                          .eq('id', profileData.restaurant_id)
                          .single()
                          .then(result => ({ type: 'restaurant', data: result.data }))
                      )
                    }

                    const hierarchyResults = await Promise.all(hierarchyPromises)
                    
                    // Merge hierarchical data into profile
                    hierarchyResults.forEach(result => {
                      if (result.data) {
                        profileData[result.type] = result.data
                      }
                    })
                  } catch (hierarchyError) {
                    console.warn('Could not load hierarchical data:', hierarchyError)
                  }
                }

                setProfile(profileData)
              }
            } catch (error) {
              console.error('Profile fetch failed:', error)
            }
          }
          
          fetchProfile()
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string, role: string = 'customer') => {
    const redirectUrl = `${window.location.origin}/`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    })
    
    if (error) {
      toast({
        title: "Erro no registo",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Registo realizado!",
        description: "Verifique o seu email para confirmar a conta."
      })
    }
    
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive"
      })
    }
    
    return { error }
  }

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8082/auth/callback'
        : 'https://comituga.eu/auth/callback'
        
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      })

      if (error) throw error
      
      // The redirect will happen automatically
      return { data, error: null }
    } catch (error) {
      console.error('Erro no login com Google:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive"
        })
      } else {
        // Clear local state immediately
        setUser(null)
        setSession(null)
        setProfile(null)
        
        toast({
          title: "Sessão terminada",
          description: "Até breve!"
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      signUp,
      signIn,
      signInWithGoogle,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}
