import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Eye, EyeOff, CheckCircle, AlertCircle, Truck } from 'lucide-react'

const DriverActivation = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [driverData, setDriverData] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    vehicleType: '',
    licensePlate: ''
  })

  const token = searchParams.get('token')
  const userId = searchParams.get('user_id')

  useEffect(() => {
    if (token && userId) {
      validateToken()
    } else {
      setValidating(false)
      setIsValidToken(false)
    }
  }, [token, userId])

  const validateToken = async () => {
    try {
      setValidating(true)
      
      // Verificar se o token é válido e buscar dados do motorista
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          organizations (name)
        `)
        .eq('id', userId)
        .eq('role', 'driver')
        .eq('account_activated', false)
        .single()

      if (error || !profile) {
        setIsValidToken(false)
        toast({
          title: "Token inválido",
          description: "O link de ativação é inválido ou expirou.",
          variant: "destructive"
        })
        return
      }

      // Verificar se o email de ativação foi enviado
      if (!profile.activation_email_sent) {
        setIsValidToken(false)
        toast({
          title: "Ativação não autorizada",
          description: "Esta conta não foi configurada para ativação.",
          variant: "destructive"
        })
        return
      }

      setDriverData(profile)
      setIsValidToken(true)
      
      // Pré-preencher dados se existirem
      setFormData(prev => ({
        ...prev,
        phone: profile.phone || '',
        address: profile.address || ''
      }))

    } catch (error) {
      console.error('Error validating token:', error)
      setIsValidToken(false)
      toast({
        title: "Erro de validação",
        description: "Ocorreu um erro ao validar o token de ativação.",
        variant: "destructive"
      })
    } finally {
      setValidating(false)
    }
  }

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive"
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      // Atualizar senha do usuário
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId!,
        { password: formData.password }
      )

      if (passwordError) {
        throw passwordError
      }

      // Atualizar perfil do motorista
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          account_activated: true,
          account_activated_at: new Date().toISOString(),
          phone: formData.phone,
          address: formData.address,
          temp_password_hash: null // Limpar senha temporária
        })
        .eq('id', userId)

      if (profileError) {
        throw profileError
      }

      // Atualizar dados do motorista
      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          vehicle_type: formData.vehicleType,
          license_plate: formData.licensePlate,
          profile_completed: true
        })
        .eq('user_id', userId)

      if (driverError) {
        console.warn('Driver update error (may not exist yet):', driverError)
      }

      toast({
        title: "Conta ativada com sucesso!",
        description: "Sua conta foi ativada. Você pode fazer login agora.",
      })

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/auth?tab=login')
      }, 2000)

    } catch (error: any) {
      console.error('Error activating account:', error)
      toast({
        title: "Erro na ativação",
        description: error.message || "Ocorreu um erro ao ativar a conta.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-slate-600">Validando token de ativação...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Token Inválido</h2>
            <p className="text-slate-600 text-center mb-6">
              O link de ativação é inválido ou expirou. Entre em contato com o administrador.
            </p>
            <Button onClick={() => navigate('/auth')} variant="outline">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Truck className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            Ativar Conta de Motorista
          </CardTitle>
          <CardDescription>
            Bem-vindo, {driverData?.full_name}! Complete sua ativação para começar a trabalhar com {driverData?.organizations?.name}.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleActivateAccount} className="space-y-6">
            {/* Informações da conta */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Definir Senha</h3>
              
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Digite sua nova senha"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme sua nova senha"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Informações pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Informações Pessoais</h3>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ex: +351 912 345 678"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Seu endereço completo"
                  required
                />
              </div>
            </div>

            {/* Informações do veículo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Informações do Veículo</h3>
              
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                <select
                  id="vehicleType"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Selecione o tipo de veículo</option>
                  <option value="bicycle">Bicicleta</option>
                  <option value="motorcycle">Motocicleta</option>
                  <option value="car">Carro</option>
                  <option value="van">Carrinha</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="licensePlate">Matrícula do Veículo</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                  placeholder="Ex: 12-AB-34"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Ativando conta...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ativar Conta
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default DriverActivation