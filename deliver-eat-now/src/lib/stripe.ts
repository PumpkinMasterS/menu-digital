import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe com a chave pública (apenas se a chave existir)
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : Promise.resolve(null);

export default stripePromise;

// Tipos para pagamentos
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'week' | 'month';
  stripe_price_id: string;
}

// Função para criar Payment Intent
export async function createPaymentIntent(amount: number, currency: string = 'eur') {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Converter para centavos
        currency,
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao criar payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar payment intent:', error);
    throw error;
  }
}

// Função para criar subscrição
export async function createSubscription(priceId: string, customerId?: string) {
  try {
    const response = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        customerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao criar subscrição');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar subscrição:', error);
    throw error;
  }
}

// Função para cancelar subscrição
export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao cancelar subscrição');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao cancelar subscrição:', error);
    throw error;
  }
}

// Planos de subscrição predefinidos
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'detox-weekly',
    name: 'Detox Semanal',
    description: '7 refeições saudáveis por semana',
    price: 49.99,
    interval: 'week',
    stripe_price_id: 'price_detox_weekly', // Configurar no Stripe
  },
  {
    id: 'detox-monthly',
    name: 'Detox Mensal',
    description: '30 refeições saudáveis por mês',
    price: 179.99,
    interval: 'month',
    stripe_price_id: 'price_detox_monthly', // Configurar no Stripe
  },
  {
    id: 'fitness-weekly',
    name: 'Fitness Semanal',
    description: '7 refeições fitness por semana',
    price: 59.99,
    interval: 'week',
    stripe_price_id: 'price_fitness_weekly', // Configurar no Stripe
  },
  {
    id: 'fitness-monthly',
    name: 'Fitness Mensal',
    description: '30 refeições fitness por mês',
    price: 199.99,
    interval: 'month',
    stripe_price_id: 'price_fitness_monthly', // Configurar no Stripe
  },
]; 