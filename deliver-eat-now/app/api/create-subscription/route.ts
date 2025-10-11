import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { priceId, customerId, user_id, plan_id } = await request.json();

    // Validar dados
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verificar se o usuário já tem uma subscrição ativa
    if (user_id) {
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .single();

      if (existingSubscription) {
        return NextResponse.json(
          { error: 'Já tem uma subscrição ativa' },
          { status: 400 }
        );
      }
    }

    // Criar sessão de checkout para subscrição
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscriptions/cancel`,
      customer: customerId,
      metadata: {
        user_id: user_id || '',
        plan_id: plan_id || '',
      },
    });

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Erro ao criar subscrição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 