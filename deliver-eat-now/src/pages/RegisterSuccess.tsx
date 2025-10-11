import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Mail, 
  Settings, 
  Store, 
  Users, 
  ChefHat,
  ArrowRight,
  Phone,
  MessageCircle
} from "lucide-react";

const RegisterSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, restaurantName } = location.state || {};

  useEffect(() => {
    // If no data, redirect to home
    if (!email || !restaurantName) {
      navigate('/');
    }
  }, [email, restaurantName, navigate]);

  const nextSteps = [
    {
      icon: Mail,
      title: "Verifique o seu Email",
      description: "Enviámos instruções de acesso para " + email,
      status: "pending",
      action: "Abrir Email"
    },
    {
      icon: Settings,
      title: "Configure o Dashboard",
      description: "Aceda ao painel de gestão e personalize as definições",
      status: "upcoming",
      action: "Aceder Agora"
    },
    {
      icon: Store,
      title: "Adicione o Menu",
      description: "Carregue pratos, preços e imagens do seu restaurante",
      status: "upcoming",
      action: "Criar Menu"
    },
    {
      icon: Users,
      title: "Primeiros Clientes",
      description: "Abra o restaurante e receba os primeiros pedidos",
      status: "upcoming",
      action: "Abrir Restaurante"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-emerald-600" />
            <span className="text-xl font-bold text-gray-900">SaborPortuguês</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Conta Criada com Sucesso!
          </h1>
          
          <p className="text-xl text-gray-600 mb-2">
            Bem-vindo ao SaborPortuguês, <strong>{restaurantName}</strong>!
          </p>
          
          <p className="text-gray-500">
            A sua jornada digital começa agora
          </p>
        </div>

        {/* Promotional Banner */}
        <Card className="mb-8 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">🚀 Oferta de Lançamento Ativa</h3>
                <p className="opacity-90">Primeiros 3 meses com 0% comissão + Setup gratuito</p>
              </div>
              <Badge className="bg-white text-emerald-600 font-semibold px-4 py-2">
                Válido até 31 Mar
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-emerald-600" />
              Próximos Passos
            </CardTitle>
            <CardDescription>
              Siga estes passos para começar a receber pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.status === 'pending' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  
                  <Badge variant={step.status === 'pending' ? 'default' : 'secondary'}>
                    {step.status === 'pending' ? 'Agora' : 'Em Breve'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📧 Verificar Email</CardTitle>
              <CardDescription>
                Enviámos instruções de acesso para <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.open('https://gmail.com', '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Abrir Gmail
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🏪 Aceder ao Dashboard</CardTitle>
              <CardDescription>
                Comece a configurar o seu restaurante agora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <MessageCircle className="h-5 w-5" />
              Precisa de Ajuda?
            </CardTitle>
            <CardDescription className="text-blue-600">
              A nossa equipa está aqui para o ajudar a começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Phone className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold text-blue-800">Telefone</p>
                <p className="text-sm text-blue-600">+351 21 123 4567</p>
                <p className="text-xs text-blue-500">Seg-Sex 9h-18h</p>
              </div>
              
              <div className="text-center">
                <Mail className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold text-blue-800">Email</p>
                <p className="text-sm text-blue-600">suporte@saborportugues.pt</p>
                <p className="text-xs text-blue-500">Resposta em 2h</p>
              </div>
              
              <div className="text-center">
                <MessageCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold text-blue-800">Chat ao Vivo</p>
                <p className="text-sm text-blue-600">Disponível no dashboard</p>
                <p className="text-xs text-blue-500">Seg-Sex 9h-18h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Included */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            O que está incluído na sua conta
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Store className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Dashboard Completo</h4>
              <p className="text-sm text-gray-600">Gestão de pedidos, menu e estatísticas em tempo real</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Base de Clientes</h4>
              <p className="text-sm text-gray-600">Acesso a milhares de clientes na sua área</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Marketing Automático</h4>
              <p className="text-sm text-gray-600">Promoções e campanhas para aumentar vendas</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Settings className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Suporte Premium</h4>
              <p className="text-sm text-gray-600">Setup gratuito e suporte dedicado</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="text-center mt-12 space-y-4">
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => navigate('/auth')}
          >
            <ChefHat className="h-5 w-5 mr-2" />
            Começar Agora
          </Button>
          
          <p className="text-sm text-gray-500">
            Já tem acesso? <button 
              onClick={() => navigate('/auth')} 
              className="text-emerald-600 hover:underline font-semibold"
            >
              Fazer Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterSuccess; 