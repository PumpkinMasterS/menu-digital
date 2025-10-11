import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Store, Users, ArrowRight, Star, MapPin, Phone, Mail, Globe } from "lucide-react";

const RegisterRestaurant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Dados do restaurante
    restaurantName: "",
    description: "",
    cuisineType: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    
    // Dados do proprietário
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    password: "",
    
    // Configurações
    deliveryRadius: 10,
    minimumOrder: 15,
    deliveryFee: 2.5,
    estimatedDeliveryTime: "30-45 min"
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const updateFormData = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call edge function to create organization + owner
      const response = await fetch("/functions/v1/create-organization-with-owner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Organization data
          organizationName: formData.restaurantName,
          organizationSlug: formData.restaurantName.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          
          // Restaurant data
          restaurant: {
            name: formData.restaurantName,
            description: formData.description,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            website: formData.website,
            cuisine_type: formData.cuisineType,
            delivery_radius_km: formData.deliveryRadius,
            minimum_order: formData.minimumOrder,
            delivery_fee: formData.deliveryFee,
            delivery_time: formData.estimatedDeliveryTime
          },
          
          // Owner data
          owner: {
            full_name: formData.ownerName,
            email: formData.ownerEmail,
            phone: formData.ownerPhone,
            password: formData.password
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar conta');
      }

      toast({
        title: "🎉 Conta criada com sucesso!",
        description: "Verifique o seu email para ativar a conta e começar a usar a plataforma."
      });

      // Redirect to success page
      navigate('/register-success', { 
        state: { 
          email: formData.ownerEmail,
          restaurantName: formData.restaurantName 
        } 
      });

    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return formData.restaurantName && formData.description && formData.cuisineType && formData.address;
      case 2:
        return formData.ownerName && formData.ownerEmail && formData.password.length >= 6;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900">SaborPortuguês</span>
            </div>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Já tenho conta
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Junte-se ao SaborPortuguês
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Transforme o seu restaurante numa experiência digital completa
          </p>
          
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <Store className="h-8 w-8 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Gestão Completa</h3>
              <p className="text-gray-600 text-sm">Dashboard completo para gerir pedidos, menu e entregas</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <Users className="h-8 w-8 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Mais Clientes</h3>
              <p className="text-gray-600 text-sm">Alcance milhares de clientes em toda a região</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <Star className="h-8 w-8 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">0% Comissão</h3>
              <p className="text-gray-600 text-sm">Primeiros 3 meses sem comissões sobre vendas</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step <= currentStep 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 ml-4 ${
                    step < currentStep ? 'bg-emerald-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 space-x-16">
            <span className={`text-sm ${currentStep >= 1 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
              Restaurante
            </span>
            <span className={`text-sm ${currentStep >= 2 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
              Proprietário
            </span>
            <span className={`text-sm ${currentStep >= 3 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
              Finalizar
            </span>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Dados do Restaurante"}
              {currentStep === 2 && "Dados do Proprietário"}
              {currentStep === 3 && "Configurações"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Informações básicas sobre o seu restaurante"}
              {currentStep === 2 && "Dados pessoais e credenciais de acesso"}
              {currentStep === 3 && "Configurações de entrega e preços"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
              {/* Step 1: Restaurant Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="restaurantName">Nome do Restaurante *</Label>
                      <Input
                        id="restaurantName"
                        value={formData.restaurantName}
                        onChange={(e) => updateFormData('restaurantName', e.target.value)}
                        placeholder="Restaurante do João"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cuisineType">Tipo de Cozinha *</Label>
                      <Input
                        id="cuisineType"
                        value={formData.cuisineType}
                        onChange={(e) => updateFormData('cuisineType', e.target.value)}
                        placeholder="Portuguesa Tradicional"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      placeholder="Descreva o seu restaurante, especialidades, ambiente..."
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Morada Completa *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateFormData('address', e.target.value)}
                        placeholder="Rua das Flores, 123, 1200-123 Lisboa"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => updateFormData('phone', e.target.value)}
                          placeholder="+351 91 234 5678"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email do Restaurante</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          placeholder="info@restaurante.pt"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website (opcional)</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => updateFormData('website', e.target.value)}
                          placeholder="www.restaurante.pt"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Owner Info */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Nome Completo *</Label>
                    <Input
                      id="ownerName"
                      value={formData.ownerName}
                      onChange={(e) => updateFormData('ownerName', e.target.value)}
                      placeholder="João Silva"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ownerEmail">Email de Acesso *</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => updateFormData('ownerEmail', e.target.value)}
                        placeholder="joao@gmail.com"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Será usado para aceder à plataforma
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerPhone">Telemóvel</Label>
                      <Input
                        id="ownerPhone"
                        value={formData.ownerPhone}
                        onChange={(e) => updateFormData('ownerPhone', e.target.value)}
                        placeholder="+351 91 234 5678"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <h4 className="font-semibold text-emerald-800 mb-2">
                      🎉 Oferta de Lançamento
                    </h4>
                    <ul className="text-sm text-emerald-700 space-y-1">
                      <li>• Primeiros 3 meses: 0% comissão</li>
                      <li>• Setup gratuito e suporte dedicado</li>
                      <li>• Acesso a todas as funcionalidades premium</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 3: Settings */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryRadius">Raio de Entrega (km)</Label>
                      <Input
                        id="deliveryRadius"
                        type="number"
                        value={formData.deliveryRadius}
                        onChange={(e) => updateFormData('deliveryRadius', parseInt(e.target.value))}
                        min="1"
                        max="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumOrder">Pedido Mínimo (€)</Label>
                      <Input
                        id="minimumOrder"
                        type="number"
                        step="0.50"
                        value={formData.minimumOrder}
                        onChange={(e) => updateFormData('minimumOrder', parseFloat(e.target.value))}
                        min="5"
                        max="50"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryFee">Taxa de Entrega (€)</Label>
                      <Input
                        id="deliveryFee"
                        type="number"
                        step="0.50"
                        value={formData.deliveryFee}
                        onChange={(e) => updateFormData('deliveryFee', parseFloat(e.target.value))}
                        min="0"
                        max="10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedDeliveryTime">Tempo de Entrega</Label>
                      <Input
                        id="estimatedDeliveryTime"
                        value={formData.estimatedDeliveryTime}
                        onChange={(e) => updateFormData('estimatedDeliveryTime', e.target.value)}
                        placeholder="30-45 min"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Resumo da Conta</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Restaurante:</span>
                        <span className="font-semibold">{formData.restaurantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Proprietário:</span>
                        <span>{formData.ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span>{formData.ownerEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipo de Cozinha:</span>
                        <span>{formData.cuisineType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      📧 Próximos Passos
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Receberá um email de confirmação</li>
                      <li>Acesso ao dashboard de gestão</li>
                      <li>Setup do menu e preços</li>
                      <li>Primeira entrega em 24h!</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Anterior
                </Button>
                
                <div className="flex gap-2">
                  {currentStep < 3 ? (
                    <Button 
                      type="submit"
                      disabled={!validateStep()}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={isLoading || !validateStep()}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isLoading ? "Criando conta..." : "Criar Conta"}
                      <ChefHat className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-sm text-gray-500">
            Ao criar uma conta, aceita os nossos{" "}
            <button className="text-emerald-600 hover:underline">
              Termos de Serviço
            </button>{" "}
            e{" "}
            <button className="text-emerald-600 hover:underline">
              Política de Privacidade
            </button>
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>Suporte: suporte@saborportugues.pt</span>
            <span>•</span>
            <span>+351 21 123 4567</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterRestaurant; 