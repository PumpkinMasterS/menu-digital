import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Edit, Eye, Loader2, Check, AlertCircle, User, Shield, Users } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useScoping } from '@/hooks/useScoping'
import { useAuth } from '@/hooks/useAuth'

interface UserManagementDialogProps {
  onUserUpdated: () => void
  user?: any
  mode: 'create' | 'edit' | 'view'
}

const UserManagementDialog: React.FC<UserManagementDialogProps> = ({ 
  onUserUpdated, 
  user, 
  mode = 'create' 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  
  // Use auth context to get current user profile
  const { profile } = useAuth()
  
  // Use hierarchical scoping
  const { getCreatableRoles, getDefaultUserValues, isRestaurantLevel } = useScoping()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'driver', // Definindo driver como padrão
    organization_id: '',
    restaurant_id: '',
    is_active: true
  })

  // Get available roles based on current user's permissions
  const availableRoles = getCreatableRoles()

  const roles = [
    { value: 'customer', label: 'Cliente', description: 'Usuário padrão que faz pedidos' },
    { value: 'driver', label: 'Motorista', description: 'Motorista de entregas' },
    { value: 'kitchen', label: 'Cozinha', description: 'Staff da cozinha (apenas operacional)' },
    { value: 'restaurant_admin', label: 'Admin Restaurante', description: 'Dono/Administrador do restaurante' },
    { value: 'super_admin', label: 'Super Admin', description: 'Administrador regional' },
    { value: 'platform_owner', label: 'Platform Owner', description: 'Controlo total da plataforma' }
  ]

  useEffect(() => {
    if (isOpen) {
      fetchOrganizations()
      fetchRestaurants()
      
      if (user && mode !== 'create') {
        setFormData({
          full_name: user.full_name || '',
          email: user.email || '',
          password: '',
          phone: user.phone || '',
          role: user.role || 'driver',
          organization_id: user.organization_id || 'none',
          restaurant_id: user.restaurant_id || 'none',
          is_active: user.is_active !== false
        })
      } else if (mode === 'create') {
        // Set default values from current user's context
        const defaults = getDefaultUserValues()
        setFormData(prev => ({
          ...prev,
          ...defaults,
          // Ensure select fields have valid values
          organization_id: defaults.organization_id || 'none',
          restaurant_id: defaults.restaurant_id || 'none'
        }))
      }
    }
  }, [isOpen, user, mode])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Error fetching restaurants:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'driver', // Definindo driver como padrão
      organization_id: 'none',
      restaurant_id: 'none',
      is_active: true
    })
  }

  const validateForm = () => {
    console.log('Validating form with data:', formData)
    
    if (!formData.full_name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome completo é obrigatório",
        variant: "destructive"
      })
      return false
    }

    if (!formData.email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Email é obrigatório",
        variant: "destructive"
      })
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor insira um email válido",
        variant: "destructive"
      })
      return false
    }

    if (mode === 'create' && (!formData.password || formData.password.length < 6)) {
      console.log('Password validation failed:', { password: formData.password, length: formData.password?.length })
      toast({
        title: "Password inválida",
        description: "Password deve ter pelo menos 6 caracteres",
        variant: "destructive"
      })
      return false
    }

    if (!formData.role) {
      toast({
        title: "Campo obrigatório",
        description: "Role é obrigatório",
        variant: "destructive"
      })
      return false
    }

    console.log('Form validation passed')
    return true
  }

  const handleCreateUser = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('🔐 Session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      })
      
      if (!session) {
        throw new Error('Não autenticado - sessão não encontrada')
      }
      
      if (!session.access_token) {
        throw new Error('Não autenticado - token de acesso não encontrado')
      }

      // Clean up form data - convert 'none' values to null
      const cleanedFormData = {
        ...formData,
        organization_id: formData.organization_id === 'none' ? null : formData.organization_id,
        restaurant_id: formData.restaurant_id === 'none' ? null : formData.restaurant_id
      }

      console.log('Creating user with data:', {
        email: cleanedFormData.email,
        full_name: cleanedFormData.full_name,
        role: cleanedFormData.role,
        organization_id: cleanedFormData.organization_id,
        restaurant_id: cleanedFormData.restaurant_id
      })

      // Prepare the payload - only include non-null values
      const payload: any = {
        email: cleanedFormData.email,
        password: cleanedFormData.password,
        full_name: cleanedFormData.full_name,
        role: cleanedFormData.role,
        is_active: cleanedFormData.is_active
      }

      // Only add optional fields if they have values and are not null
      if (cleanedFormData.phone && cleanedFormData.phone.trim()) {
        payload.phone = cleanedFormData.phone
      }

      if (cleanedFormData.organization_id) {
        payload.organization_id = cleanedFormData.organization_id
      }

      if (cleanedFormData.restaurant_id) {
        payload.restaurant_id = cleanedFormData.restaurant_id
      }

      console.log('Final payload being sent to Edge Function:', payload)

      // Call the admin-create-user edge function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload
      })

      if (error) {
        console.error('Edge function error:', error)
        throw new Error(error.message || 'Erro ao criar usuário')
      }

      if (!data.success) {
        console.error('Edge function returned error:', data)
        console.error('Error details:', data.details)
        console.error('Error code:', data.code)
        
        // Handle specific error cases from Edge Function
        if (data.code === 'email_exists') {
          throw new Error(data.error || `O email ${formData.email} já está registrado no sistema. Por favor, use um email diferente.`)
        }
        
        throw new Error(data.error || data.details || 'Erro ao criar usuário')
      }

      // Show success message
      if (formData.role === 'driver') {
        toast({
          title: "✅ Motorista criado com sucesso!",
          description: `${formData.full_name} foi criado e receberá um email para ativar sua conta.`,
        })
      } else {
        toast({
          title: "✅ Usuário criado com sucesso!",
          description: `${formData.full_name} foi criado com role ${formData.role}`,
        })
      }

      resetForm()
      setIsOpen(false)
      onUserUpdated()

    } catch (error: any) {
      console.error('Error creating user:', error)
      
      // Handle specific error cases
      let errorTitle = "Erro ao criar usuário"
      let errorDescription = error.message || 'Erro interno do servidor'
      
      // Check for specific error types
      if (error.message?.includes('already been registered') || error.message?.includes('email_exists') || error.message?.includes('já está registrado')) {
        errorTitle = "Email já registrado"
        errorDescription = `O email ${formData.email} já está registrado no sistema. Por favor, use um email diferente.`
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role,
          organization_id: formData.organization_id || null,
          restaurant_id: formData.restaurant_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update password if provided
      if (formData.password && formData.password.length >= 6) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: formData.password }
        )
        if (passwordError) throw passwordError
      }

      toast({
        title: "✅ Usuário atualizado com sucesso!",
        description: `${formData.full_name} foi atualizado`,
      })

      setIsOpen(false)
      onUserUpdated()

    } catch (error: any) {
      console.error('Error updating user:', error)
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || 'Erro interno do servidor',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called, mode:', mode);
    console.log('📝 Current form data:', formData);

    if (mode === 'create') {
      console.log('🆕 Calling handleCreateUser...');
      await handleCreateUser()
    } else if (mode === 'edit') {
      console.log('✏️ Calling handleUpdateUser...');
      await handleUpdateUser()
    }
  }

  const handleInputChange = (field: string, value: any) => {
    // Convert 'none' values to null for database storage
    const processedValue = value === 'none' ? null : value
    
    setFormData(prev => ({
      ...prev, 
      [field]: processedValue
    }))
  }

  const getDialogTitle = () => {
    switch (mode) {
      case 'create': return 'Criar Novo Usuário'
      case 'edit': return 'Editar Usuário'
      case 'view': return 'Detalhes do Usuário'
      default: return 'Gestão de Usuário'
    }
  }

  const getDialogDescription = () => {
    switch (mode) {
      case 'create': return 'Criar um novo usuário na plataforma'
      case 'edit': return 'Editar informações e role do usuário'
      case 'view': return 'Visualizar detalhes do usuário'
      default: return ''
    }
  }

  const getTriggerButton = () => {
    switch (mode) {
      case 'create':
        return (
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Usuário
          </Button>
        )
      case 'edit':
        return (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )
      case 'view':
        return (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        )
      default:
        return null
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'platform_owner': return 'bg-purple-600 text-white'
      case 'super_admin': return 'bg-red-600 text-white'
      case 'restaurant_admin': return 'bg-blue-600 text-white'
      case 'kitchen': return 'bg-orange-600 text-white'
      case 'driver': return 'bg-green-600 text-white'
      case 'customer': return 'bg-gray-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {getTriggerButton()}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
  </DialogHeader>
  <Card className="mt-4 bg-yellow-50 border-yellow-200">
    <CardHeader>
      <CardTitle className="text-sm text-yellow-800">DEBUG: User Information</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-xs text-yellow-700">Current user role: <span className="font-bold">{profile?.role || 'Not found'}</span></p>
    </CardContent>
  </Card>

        <form onSubmit={(e) => { 
          console.log('📋 Form onSubmit triggered'); 
          console.log('🎯 Event:', e); 
          e.preventDefault(); 
          console.log('⏳ About to call handleSubmit...'); 
          handleSubmit(); 
        }} className="space-y-6">
          {mode === 'view' ? (
            // View Mode - Read Only
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Informações Pessoais
                    <Badge className={getRoleBadgeColor(formData.role)}>
                      {roles.find(r => r.value === formData.role)?.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nome Completo</Label>
                      <p className="text-base">{formData.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p className="text-base">{formData.email || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                      <p className="text-base">{formData.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <Badge variant={formData.is_active ? 'default' : 'secondary'}>
                        {formData.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Descrição do Role</Label>
                    <p className="text-sm text-gray-600">
                      {roles.find(r => r.value === formData.role)?.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-500">ID do Usuário</Label>
                        <p className="font-mono text-xs">{user.id}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Criado em</Label>
                        <p>{new Date(user.created_at).toLocaleDateString('pt-PT')}</p>
                      </div>
                    </div>
                    
                    {user.updated_at && (
                      <div>
                        <Label className="text-gray-500">Última atualização</Label>
                        <p className="text-sm">{new Date(user.updated_at).toLocaleString('pt-PT')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Create/Edit Mode - Form
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                  Informações Básicas
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      placeholder="Ex: João Silva"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="joao@exemplo.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={isLoading || mode === 'edit'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password {mode === 'create' ? '*' : '(deixar vazio para não alterar)'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="+351 9XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Configurações Avançadas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                  Configurações Avançadas
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => handleInputChange('role', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{role.label}</span>
                              <span className="text-xs text-gray-500">{role.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization">Organização</Label>
                    <Select 
                      value={formData.organization_id} 
                      onValueChange={(value) => handleInputChange('organization_id', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar organização (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma organização</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      disabled={isLoading}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className="text-sm">
                      Conta ativa (permite login e acesso ao sistema)
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode !== 'view' && (
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UserManagementDialog