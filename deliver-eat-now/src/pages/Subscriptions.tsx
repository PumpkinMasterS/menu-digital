import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Clock, 
  Check, 
  Star, 
  Zap, 
  Heart,
  Truck,
  Calendar,
  Euro
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';

interface UserSubscription {
  id: string;
  plan_id: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
  subscription_plans: {
    name: string;
    price_per_week: number;
    price_per_month: number;
    meals_per_day: number;
    delivery_days: string[];
  };
}

const Subscriptions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserSubscriptions();
      fetchAvailablePlans();
    }
  }, [user]);

  const fetchUserSubscriptions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            price_per_week,
            price_per_month,
            meals_per_day,
            delivery_days
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      if (error) throw error;
      setUserSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setAvailablePlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubscribe = async (planId: string, interval: 'week' | 'month') => {
    if (!user) return;

    setLoading(true);
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('Plano não encontrado');

      const priceId = plan.stripe_price_id;
      
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          user_id: user.id,
          plan_id: planId,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Erro ao criar sessão de pagamento');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Erro ao criar subscrição",
        description: "Ocorreu um erro. Tenta novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionIcon = (planName: string) => {
    if (planName.toLowerCase().includes('detox')) return <Heart className="h-5 w-5 text-green-500" />;
    if (planName.toLowerCase().includes('fitness')) return <Zap className="h-5 w-5 text-blue-500" />;
    return <Star className="h-5 w-5 text-yellow-500" />;
  };

  const getSubscriptionColor = (planName: string) => {
    if (planName.toLowerCase().includes('detox')) return 'bg-green-50 border-green-200';
    if (planName.toLowerCase().includes('fitness')) return 'bg-blue-50 border-blue-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const formatDeliveryDays = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      'monday': 'Seg',
      'tuesday': 'Ter',
      'wednesday': 'Qua',
      'thursday': 'Qui',
      'friday': 'Sex',
      'saturday': 'Sáb',
      'sunday': 'Dom'
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  const hasActiveSubscription = userSubscriptions.some(sub => sub.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Subscrições SaborPortuguês
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Desfruta de refeições saudáveis e deliciosas entregues diariamente. 
            Escolhe o plano que melhor se adapta ao teu estilo de vida.
          </p>
        </div>

        {/* Active Subscriptions */}
        {userSubscriptions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              As Tuas Subscrições
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {userSubscriptions.map((subscription) => (
                <Card key={subscription.id} className="border-2 border-emerald-200 bg-emerald-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getSubscriptionIcon(subscription.subscription_plans.name)}
                        {subscription.subscription_plans.name}
                      </CardTitle>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status === 'active' ? 'Ativa' : 'Pausada'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{subscription.subscription_plans.meals_per_day} refeições/dia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-500" />
                        <span>{formatDeliveryDays(subscription.subscription_plans.delivery_days)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Próxima faturação: {subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Planos Disponíveis
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card key={plan.id} className={`relative ${getSubscriptionColor(plan.name)} border-2 transition-all hover:shadow-lg`}>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    {getSubscriptionIcon(plan.name)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-1">
                      <Euro className="h-6 w-6" />
                      {plan.price.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600">
                      por {plan.interval === 'week' ? 'semana' : 'mês'}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>7 refeições saudáveis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Entrega gratuita</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Cancelamento flexível</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Nutrição balanceada</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleSubscribe(plan.id, plan.interval)}
                    disabled={loading || hasActiveSubscription}
                  >
                    {hasActiveSubscription ? 'Já tens uma subscrição ativa' : 'Subscrever'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg p-8 shadow-sm">
          <h3 className="text-xl font-semibold mb-6 text-center">Porquê Subscrever?</h3>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold mb-2">Saúde em Primeiro</h4>
              <p className="text-sm text-gray-600">
                Refeições nutritivas e equilibradas preparadas por nutricionistas especializados.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-2">Conveniência Total</h4>
              <p className="text-sm text-gray-600">
                Sem planeamento de refeições. Recebe tudo pronto para consumir.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Euro className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-2">Melhor Preço</h4>
              <p className="text-sm text-gray-600">
                Economiza até 30% comparado com pedidos individuais.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions; 