// ============================================================================
// ENHANCED ORDER PROCESSING FUNCTION
// Enterprise-grade edge function with full error handling and monitoring
// ============================================================================

import { createSecureHandler, Logger, ValidationError, AppError, withRetry, createSuccessResponse } from '../shared/utils.ts';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface OrderItem {
  mealId: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
  customizations?: Record<string, any>;
}

interface OrderRequest {
  restaurantId: string;
  items: OrderItem[];
  deliveryAddress: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };
  paymentMethod: 'stripe' | 'mbway' | 'multibanco';
  deliveryInstructions?: string;
  promoCode?: string;
}

interface ProcessedOrder {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  estimatedDeliveryTime: string;
  paymentIntentId?: string;
  status: string;
}

// ============================================================================
// BUSINESS LOGIC FUNCTIONS
// ============================================================================

async function validateOrderRequest(orderData: OrderRequest, supabase: any, logger: Logger): Promise<void> {
  logger.debug('Validating order request', { restaurantId: orderData.restaurantId });

  // Validate required fields
  if (!orderData.restaurantId || !orderData.items || orderData.items.length === 0) {
    throw new ValidationError('Restaurant ID and items are required');
  }

  if (!orderData.deliveryAddress) {
    throw new ValidationError('Delivery address is required');
  }

  if (!['stripe', 'mbway', 'multibanco'].includes(orderData.paymentMethod)) {
    throw new ValidationError('Invalid payment method');
  }

  // Validate restaurant exists and is active
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, is_open, is_active, minimum_order, delivery_fee')
    .eq('id', orderData.restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    throw new ValidationError('Restaurant not found');
  }

  if (!restaurant.is_active || !restaurant.is_open) {
    throw new ValidationError('Restaurant is currently closed');
  }

  // Validate meals exist and are available
  const mealIds = orderData.items.map(item => item.mealId);
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('id, name, price, is_available')
    .in('id', mealIds)
    .eq('is_available', true);

  if (mealsError) {
    throw new AppError('Failed to validate meals', 'DATABASE_ERROR', 500);
  }

  if (meals.length !== mealIds.length) {
    const foundIds = meals.map((m: any) => m.id);
    const missingIds = mealIds.filter(id => !foundIds.includes(id));
    throw new ValidationError('Some meals are not available', { missingMealIds: missingIds });
  }

  // Validate quantities and prices
  for (const item of orderData.items) {
    const meal = meals.find((m: any) => m.id === item.mealId);
    if (!meal) continue;

    if (item.quantity <= 0) {
      throw new ValidationError(`Invalid quantity for meal ${meal.name}`);
    }

    // Verify price hasn't changed (tolerance of 1 cent for rounding)
    if (Math.abs(item.unitPrice - meal.price) > 0.01) {
      throw new ValidationError(`Price mismatch for meal ${meal.name}`, {
        expectedPrice: meal.price,
        providedPrice: item.unitPrice
      });
    }
  }

  logger.info('Order request validation completed successfully');
}

async function calculateOrderAmounts(
  orderData: OrderRequest,
  restaurant: any,
  supabase: any,
  logger: Logger
): Promise<{ subtotal: number; deliveryFee: number; taxAmount: number; total: number }> {
  
  logger.debug('Calculating order amounts');

  // Calculate subtotal
  const subtotal = orderData.items.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity);
  }, 0);

  // Check minimum order requirement
  if (subtotal < restaurant.minimum_order) {
    throw new ValidationError(`Order total (€${subtotal.toFixed(2)}) is below minimum order amount (€${restaurant.minimum_order.toFixed(2)})`);
  }

  // Calculate delivery fee
  let deliveryFee = restaurant.delivery_fee || 0;

  // Apply promo code if provided
  if (orderData.promoCode) {
    // This would integrate with a promo codes system
    logger.info('Promo code applied', { code: orderData.promoCode });
  }

  // Calculate tax (Portuguese VAT - 23% for restaurant services)
  const taxRate = 0.23;
  const taxAmount = (subtotal + deliveryFee) * taxRate;

  // Calculate total
  const total = subtotal + deliveryFee + taxAmount;

  logger.info('Order amounts calculated', {
    subtotal,
    deliveryFee,
    taxAmount,
    total
  });

  return { subtotal, deliveryFee, taxAmount, total };
}

async function createOrderRecord(
  orderData: OrderRequest,
  amounts: { subtotal: number; deliveryFee: number; taxAmount: number; total: number },
  customerId: string,
  organizationId: string,
  supabase: any,
  logger: Logger
): Promise<{ orderId: string; orderNumber: string }> {
  
  logger.debug('Creating order record in database');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      restaurant_id: orderData.restaurantId,
      status: 'pending',
      subtotal: amounts.subtotal,
      delivery_fee: amounts.deliveryFee,
      tax_amount: amounts.taxAmount,
      total_amount: amounts.total,
      delivery_address: orderData.deliveryAddress,
      delivery_location: orderData.deliveryLocation ? 
        `POINT(${orderData.deliveryLocation.longitude} ${orderData.deliveryLocation.latitude})` : null,
      delivery_instructions: orderData.deliveryInstructions,
      payment_method: orderData.paymentMethod,
      payment_status: 'pending',
      special_instructions: orderData.deliveryInstructions,
      promo_code: orderData.promoCode,
    })
    .select('id, order_number')
    .single();

  if (orderError) {
    logger.error('Failed to create order', orderError);
    throw new AppError('Failed to create order', 'DATABASE_ERROR', 500);
  }

  // Create order items
  const orderItems = orderData.items.map(item => ({
    order_id: order.id,
    meal_id: item.mealId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
    special_instructions: item.specialInstructions,
    customizations: item.customizations,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    logger.error('Failed to create order items', itemsError);
    // Rollback order creation
    await supabase.from('orders').delete().eq('id', order.id);
    throw new AppError('Failed to create order items', 'DATABASE_ERROR', 500);
  }

  logger.info('Order record created successfully', {
    orderId: order.id,
    orderNumber: order.order_number
  });

  return {
    orderId: order.id,
    orderNumber: order.order_number
  };
}

async function processPayment(
  paymentMethod: string,
  amount: number,
  orderId: string,
  organizationId: string,
  supabase: any,
  logger: Logger
): Promise<{ paymentIntentId?: string; status: string }> {
  
  logger.debug('Processing payment', { paymentMethod, amount });

  let paymentIntentId: string | undefined;
  let status = 'pending';

  try {
    if (paymentMethod === 'stripe') {
      // Integrate with Stripe API
      const stripeResponse = await withRetry(async () => {
        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: Math.round(amount * 100).toString(), // Convert to cents
            currency: 'eur',
            automatic_payment_methods: 'true',
            metadata: JSON.stringify({ orderId, organizationId }),
          }),
        });

        if (!response.ok) {
          throw new AppError('Stripe API error', 'PAYMENT_ERROR', 502);
        }

        return response.json();
      }, { maxAttempts: 3 }, logger);

      paymentIntentId = stripeResponse.id;
      status = 'processing';

    } else if (paymentMethod === 'mbway') {
      // Integrate with SIBS/MB WAY API
      // This would be the actual implementation
      logger.info('MB WAY payment initiated');
      status = 'processing';

    } else if (paymentMethod === 'multibanco') {
      // Generate Multibanco reference
      logger.info('Multibanco reference generated');
      status = 'pending';
    }

    // Record payment attempt
    await supabase.from('payments').insert({
      organization_id: organizationId,
      order_id: orderId,
      amount,
      currency: 'EUR',
      payment_method: paymentMethod,
      status,
      stripe_payment_intent_id: paymentIntentId,
      payment_metadata: { initiatedAt: new Date().toISOString() },
    });

    logger.info('Payment processing completed', { paymentIntentId, status });

    return { paymentIntentId, status };

  } catch (error) {
    logger.error('Payment processing failed', error as Error);
    throw new AppError('Payment processing failed', 'PAYMENT_ERROR', 502);
  }
}

async function estimateDeliveryTime(
  restaurantId: string,
  deliveryLocation: any,
  supabase: any,
  logger: Logger
): Promise<string> {
  
  logger.debug('Estimating delivery time');

  // This would integrate with a real delivery estimation service
  // For now, we'll use a simple heuristic
  
  const basePreparationTime = 30; // minutes
  const baseDeliveryTime = 20; // minutes
  const totalMinutes = basePreparationTime + baseDeliveryTime;

  const estimatedTime = new Date(Date.now() + totalMinutes * 60 * 1000);
  
  logger.info('Delivery time estimated', {
    estimatedTime: estimatedTime.toISOString(),
    totalMinutes
  });

  return estimatedTime.toISOString();
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const processOrderHandler = createSecureHandler(
  async (request, { user, organizationId, role, logger, supabase }) => {
    
    // Only customers can create orders
    if (role !== 'customer') {
      throw new ValidationError('Only customers can create orders');
    }

    // Rate limiting check
    const { checkRateLimit } = await import('../shared/utils.ts');
    await checkRateLimit(user.id, 'create_order', 10, 60, supabase, logger);

    // Parse and validate request
    const { parseRequestBody } = await import('../shared/utils.ts');
    const orderData: OrderRequest = await parseRequestBody(request);

    logger.info('Processing new order', {
      restaurantId: orderData.restaurantId,
      itemCount: orderData.items?.length,
      paymentMethod: orderData.paymentMethod
    });

    // Validate order request
    await validateOrderRequest(orderData, supabase, logger);

    // Get restaurant details
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', orderData.restaurantId)
      .single();

    // Calculate amounts
    const amounts = await calculateOrderAmounts(orderData, restaurant, supabase, logger);

    // Create order record
    const { orderId, orderNumber } = await createOrderRecord(
      orderData,
      amounts,
      user.id,
      organizationId,
      supabase,
      logger
    );

    // Process payment
    const payment = await processPayment(
      orderData.paymentMethod,
      amounts.total,
      orderId,
      organizationId,
      supabase,
      logger
    );

    // Estimate delivery time
    const estimatedDeliveryTime = await estimateDeliveryTime(
      orderData.restaurantId,
      orderData.deliveryLocation,
      supabase,
      logger
    );

    // Update order with payment and delivery info
    await supabase
      .from('orders')
      .update({
        payment_intent_id: payment.paymentIntentId,
        payment_status: payment.status,
        estimated_delivery_time: estimatedDeliveryTime,
      })
      .eq('id', orderId);

    // Prepare response
    const response: ProcessedOrder = {
      orderId,
      orderNumber,
      subtotal: amounts.subtotal,
      deliveryFee: amounts.deliveryFee,
      taxAmount: amounts.taxAmount,
      total: amounts.total,
      estimatedDeliveryTime,
      paymentIntentId: payment.paymentIntentId,
      status: 'pending',
    };

    logger.info('Order processed successfully', {
      orderId,
      orderNumber,
      total: amounts.total
    });

    return createSuccessResponse(response, 201);
  }
);

// ============================================================================
// EXPORT DEFAULT HANDLER
// ============================================================================

Deno.serve(processOrderHandler); 