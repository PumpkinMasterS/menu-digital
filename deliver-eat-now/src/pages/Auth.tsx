import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { GoogleSignInButton } from '@/components/ui/google-signin-button'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const Auth = () => {
  const { user, profile, loading, signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  })

  // Automatic redirect based on role after login
  useEffect(() => {
    const handleRedirect = async () => {
      if (user && profile && !loading) {
        console.log('Auth - User logged in with profile:', profile)
        
        // Redirect based on role
        switch (profile.role) {
          case 'platform_owner':
            console.log('Auth - Redirecting platform_owner to /platform-owner')
            navigate('/platform-owner')
            break
          case 'super_admin':
            console.log('Auth - Redirecting super_admin to /organization-dashboard')
            navigate('/organization-dashboard')
            break
          case 'restaurant_admin':
            if (profile.restaurant_id) {
              console.log('Auth - Redirecting restaurant_admin to restaurant dashboard')
              // Buscar slug do restaurante para URL amigável
              try {
                const { data: restaurant } = await supabase
                  .from('restaurants')
                  .select('slug')
                  .eq('id', profile.restaurant_id)
                  .single()
                
                const restaurantIdentifier = restaurant?.slug || profile.restaurant_id
                navigate(`/restaurant/${restaurantIdentifier}/dashboard`)
              } catch (error) {
                // Fallback para ID se erro
                navigate(`/restaurant/${profile.restaurant_id}/dashboard`)
              }
            } else {
              console.log('Auth - restaurant_admin without restaurant_id, redirecting to /admin')
              navigate('/admin')
            }
            break
          case 'kitchen':
            if (profile.restaurant_id) {
              console.log('Auth - Redirecting kitchen to restaurant dashboard')
              // Buscar slug do restaurante para URL amigável
              try {
                const { data: restaurant } = await supabase
                  .from('restaurants')
                  .select('slug')
                  .eq('id', profile.restaurant_id)
                  .single()
                
                const restaurantIdentifier = restaurant?.slug || profile.restaurant_id
                navigate(`/restaurant/${restaurantIdentifier}/dashboard`)
              } catch (error) {
                // Fallback para ID se erro
                navigate(`/restaurant/${profile.restaurant_id}/dashboard`)
              }
            } else {
              console.log('Auth - kitchen without restaurant_id, redirecting to /admin')
              navigate('/admin')
            }
            break
          case 'driver':
            console.log('Auth - Redirecting driver to driver dashboard')
            navigate('/driver-dashboard')
            break
          case 'customer':
            console.log('Auth - Redirecting customer to home page')
            navigate('/')
            break
          default:
            console.log('Auth - Unknown role, redirecting to home page')
            navigate('/')
        }
      }
    }

    handleRedirect()
  }, [user, profile, loading, navigate])

  // If already authenticated, don't show auth form
  if (!loading && user && profile) {
    return null // Redirect is handled by useEffect above
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    const { error } = await signIn(formData.email, formData.password)
    
    if (!error) {
      // Redirect will be handled by useEffect once profile is loaded
    }
    
    setIsLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      return
    }
    
    setIsLoading(true)
    
    const { error } = await signUp(formData.email, formData.password, formData.fullName)
    
    setIsLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg 
                  className="h-8 w-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
              SaborPortuguês
            </CardTitle>
            <CardDescription className="text-gray-600 text-base mt-2">
              A melhor comida tradicional portuguesa na sua mesa
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="signin" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                >
                  Registar
                </TabsTrigger>
              </TabsList>
            
            <TabsContent value="signin">
              <div className="space-y-6">
                {/* Google Sign-In */}
                <GoogleSignInButton 
                  onSignIn={signInWithGoogle}
                  disabled={isLoading}
                />
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-gray-500 font-medium">
                      ou continue com email
                    </span>
                  </div>
                </div>

                {/* Email Sign-In Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email" 
                      name="email" 
                      type="email" 
                      required 
                      placeholder="seu@email.com"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input 
                      id="signin-password" 
                      name="password" 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                    {isLoading ? "A entrar..." : "Entrar"}
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="space-y-6">
                {/* Google Sign-In */}
                <GoogleSignInButton 
                  onSignIn={signInWithGoogle}
                  disabled={isLoading}
                />
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-gray-500 font-medium">
                      ou registe-se com email
                    </span>
                  </div>
                </div>

                {/* Email Sign-Up Form */}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input 
                      id="signup-name" 
                      name="fullName" 
                      type="text" 
                      required 
                      placeholder="João Silva"
                      autoComplete="name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      name="email" 
                      type="email" 
                      required 
                      placeholder="seu@email.com"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      name="password" 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={6}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input 
                      id="signup-confirm-password" 
                      name="confirmPassword" 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={6}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                    {isLoading ? "A registar..." : "Registar"}
                  </Button>
                </form>
               </div>
             </TabsContent>
           </Tabs>
         </CardContent>
       </Card>
     </div>
   </div>
 )
}

export default Auth
