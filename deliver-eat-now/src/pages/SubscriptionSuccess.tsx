import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Calendar, Truck } from 'lucide-react';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<object | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      handleSuccessfulSubscription(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const handleSuccessfulSubscription = async (sessionId: string) => {
    try {
      // Here you would typically verify the session with Stripe
      // and update the subscription in your database
      
      // For now, we'll simulate the process
      setLoading(false);
      
      // You could fetch the subscription details from your database
      // based on the session_id stored during the checkout process
      
    } catch (error) {
      console.error('Error handling subscription success:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">A processar a tua subscrição...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Subscrição Ativada com Sucesso!
          </h1>
          <p className="text-lg text-gray-600">
            Bem-vindo ao SaborPortuguês Premium. A tua jornada para uma alimentação mais saudável começa agora.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center border-b border-emerald-200 bg-emerald-50">
            <CardTitle className="flex items-center justify-center gap-2 text-emerald-700">
              <Crown className="h-6 w-6" />
              A Tua Subscrição
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-1">Refeições Diárias</h3>
                <p className="text-sm text-gray-600">1 refeição saudável por dia</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-1">Entrega Gratuita</h3>
                <p className="text-sm text-gray-600">Todos os dias úteis</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Check className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1">Qualidade Premium</h3>
                <p className="text-sm text-gray-600">Ingredientes selecionados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
            <CardDescription>
              O que acontece a seguir com a tua subscrição
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 mt-0.5">
                <span className="text-xs font-medium text-emerald-600">1</span>
              </div>
              <div>
                <h4 className="font-medium">Preparação das Refeições</h4>
                <p className="text-sm text-gray-600">
                  As tuas refeições serão preparadas fresquinhas todos os dias pela nossa equipa de chefs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 mt-0.5">
                <span className="text-xs font-medium text-emerald-600">2</span>
              </div>
              <div>
                <h4 className="font-medium">Primeira Entrega</h4>
                <p className="text-sm text-gray-600">
                  A tua primeira refeição será entregue amanhã durante o horário que selecionaste.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 mt-0.5">
                <span className="text-xs font-medium text-emerald-600">3</span>
              </div>
              <div>
                <h4 className="font-medium">Acompanhamento</h4>
                <p className="text-sm text-gray-600">
                  Podes acompanhar todas as tuas entregas e gerir a subscrição na tua conta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <Button 
            onClick={() => navigate('/customer')} 
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Ver Minha Conta
          </Button>
          <br />
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
          >
            Voltar ao Início
          </Button>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">Precisas de Ajuda?</h3>
          <p className="text-gray-600 mb-4">
            A nossa equipa está sempre disponível para te ajudar.
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="mailto:apoio@saborportugues.pt" className="text-emerald-600 hover:text-emerald-700">
              apoio@saborportugues.pt
            </a>
            <a href="tel:+351210000000" className="text-emerald-600 hover:text-emerald-700">
              +351 21 000 0000
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess; 