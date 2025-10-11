import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Loader2, Check, AlertCircle, User, Building, Settings } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface CreateRestaurantDialogProps {
  onRestaurantCreated: () => void
}

const CreateRestaurantDialog: React.FC<CreateRestaurantDialogProps> = ({ onRestaurantCreated }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const [formData, setFormData] = useState({
    // Restaurant info
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    cuisine_type: '',
    
    // Business settings
    delivery_radius_km: 10,
    minimum_order_value: 15,
    delivery_fee: 2.5,
    estimated_delivery_time: '30-45 min',
    
    // Owner info
    owner: {
      full_name: '',
      email: '',
      password: '',
      phone: ''
    }
  })

  const cuisineTypes = [
    'Portuguesa',
    'Italiana',
    'Chinesa',
    'Indiana',
    'Japonesa',
    'Mexicana',
    'Francesa',
    'Mediterrânea',
    'Vegetariana',
    'Vegan',
    'Fast Food',
    'Pizza',
    'Sushi',
    'Grelhados',
    'Tradicional',
    'Internacional',
    'Outra'
  ]

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      cuisine_type: '',
      delivery_radius_km: 10,
      minimum_order_value: 15,
      delivery_fee: 2.5,
      estimated_delivery_time: '30-45 min',
      owner: {
        full_name: '',
        email: '',
        password: '',
        phone: ''
      }
    })
    setCurrentStep(1)
  }

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome do restaurante é obrigatório",
        variant: "destructive"
      })
      return false
    }
    if (!formData.address.trim()) {
      toast({
        title: "Campo obrigatório", 
        description: "Morada é obrigatória",
        variant: "destructive"
      })
      return false
    }
    if (!formData.cuisine_type) {
      toast({
        title: "Campo obrigatório",
        description: "Tipo de cozinha é obrigatório",
        variant: "destructive"
      })
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.owner.full_name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome do proprietário é obrigatório",
        variant: "destructive"
      })
      return false
    }
    if (!formData.owner.email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Email do proprietário é obrigatório", 
        variant: "destructive"
      })
      return false
    }
    if (!formData.owner.password || formData.owner.password.length < 6) {
      toast({
        title: "Password inválida",
        description: "Password deve ter pelo menos 6 caracteres",
        variant: "destructive"
      })
      return false
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.owner.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor insira um email válido",
        variant: "destructive"
      })
      return false
    }
    
    return true
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsLoading(true)
    
    try {
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Não autenticado')
      }

      // Call the admin create restaurant edge function
      const { data, error } = await supabase.functions.invoke('admin-create-restaurant', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        throw error
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar restaurante')
      }

      toast({
        title: "✅ Restaurante criado com sucesso!",
        description: `${formData.name} foi criado e está pronto para configurar o menu`,
      })

      // Reset and close
      resetForm()
      setIsOpen(false)
      onRestaurantCreated()

    } catch (error: any) {
      console.error('Error creating restaurant:', error)
      toast({
        title: "Erro ao criar restaurante",
        description: error.message || 'Erro interno do servidor',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any, section?: string) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Criar Restaurante
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Criar Novo Restaurante
          </DialogTitle>
          <DialogDescription>
            Crie um restaurante completo com proprietário e configurações iniciais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="font-medium">Restaurante</span>
            </div>
            
            <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className="font-medium">Proprietário</span>
            </div>
            
            <div className={`w-8 h-0.5 ${currentStep >= 3 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
                '3'
              </div>
              <span className="font-medium">Confirmação</span>
            </div>
          </div>

          {/* Step 1: Restaurant Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Informações do Restaurante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Restaurante *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="ex: Adega da Tia Maria"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cuisine_type">Tipo de Cozinha *</Label>
                    <Select
                      value={formData.cuisine_type}
                      onValueChange={(value) => handleInputChange('cuisine_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {cuisineTypes.map((cuisine) => (
                          <SelectItem key={cuisine} value={cuisine}>
                            {cuisine}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descreva o restaurante e suas especialidades..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Morada *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Rua, número, código postal, cidade"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+351 xxx xxx xxx"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contacto@restaurante.pt"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.restaurante.pt"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Owner Info */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Proprietário do Restaurante
                </CardTitle>
                <CardDescription>
                  Estas credenciais serão usadas pelo proprietário para aceder ao painel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="owner_name">Nome Completo *</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value, 'owner')}
                    placeholder="João Silva"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="owner_email">Email *</Label>
                    <Input
                      id="owner_email"
                      type="email"
                      value={formData.owner.email}
                      onChange={(e) => handleInputChange('email', e.target.value, 'owner')}
                      placeholder="joao@restaurante.pt"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="owner_phone">Telefone</Label>
                    <Input
                      id="owner_phone"
                      value={formData.owner.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value, 'owner')}
                      placeholder="+351 xxx xxx xxx"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="owner_password">Password *</Label>
                  <Input
                    id="owner_password"
                    type="password"
                    value={formData.owner.password}
                    onChange={(e) => handleInputChange('password', e.target.value, 'owner')}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    O proprietário poderá alterar a password depois do primeiro login
                  </p>
                </div>

                {/* Business Settings */}
                <div className="border-t pt-4 mt-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configurações de Negócio
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery_radius">Raio de Entrega (km)</Label>
                      <Input
                        id="delivery_radius"
                        type="number"
                        min="1"
                        max="50"
                        value={formData.delivery_radius_km}
                        onChange={(e) => handleInputChange('delivery_radius_km', parseInt(e.target.value) || 10)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="minimum_order">Pedido Mínimo (€)</Label>
                      <Input
                        id="minimum_order"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.minimum_order_value}
                        onChange={(e) => handleInputChange('minimum_order_value', parseFloat(e.target.value) || 15)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="delivery_fee">Taxa de Entrega (€)</Label>
                      <Input
                        id="delivery_fee"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.delivery_fee}
                        onChange={(e) => handleInputChange('delivery_fee', parseFloat(e.target.value) || 2.5)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="delivery_time">Tempo de Entrega</Label>
                      <Input
                        id="delivery_time"
                        value={formData.estimated_delivery_time}
                        onChange={(e) => handleInputChange('estimated_delivery_time', e.target.value)}
                        placeholder="30-45 min"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Confirmação
                </CardTitle>
                <CardDescription>
                  Revise as informações antes de criar o restaurante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Restaurante</h4>
                  <p><strong>Nome:</strong> {formData.name}</p>
                  <p><strong>Tipo:</strong> {formData.cuisine_type}</p>
                  <p><strong>Morada:</strong> {formData.address}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Proprietário</h4>
                  <p><strong>Nome:</strong> {formData.owner.full_name}</p>
                  <p><strong>Email:</strong> {formData.owner.email}</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Próximos passos após criação:</p>
                      <ul className="text-sm text-blue-800 mt-1 space-y-1">
                        <li>• O proprietário receberá as credenciais por email</li>
                        <li>• Poderá configurar o menu e horários</li>
                        <li>• O restaurante ficará inativo até estar configurado</li>
                        <li>• Seções de menu padrão serão criadas automaticamente</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Anterior
            </Button>
            
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              
              {currentStep < 3 ? (
                <Button onClick={handleNext}>
                  Próximo
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Criar Restaurante
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateRestaurantDialog 