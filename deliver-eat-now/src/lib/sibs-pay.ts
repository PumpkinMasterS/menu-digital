// 🇵🇹 SIBS Pay / MB WAY Configuration
// Baseado em: https://www.pay.sibs.com/parceiros/#integrar

interface SIBSConfig {
  merchantId: string;
  apiKey: string;
  secretKey: string;
  entity: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
}

interface MBWayPaymentRequest {
  amount: number; // em cêntimos (ex: 1000 = 10.00€)
  currency: string; // 'EUR'
  reference: string; // referência única do pedido
  description: string;
  phoneNumber: string; // número de telemóvel para MB WAY
  orderId?: string;
}

interface SIBSPaymentResponse {
  transactionId: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  reference: string;
  amount: number;
  paymentUrl?: string;
  mbwayReference?: string;
}

// Configuração SIBS Pay
const getSIBSConfig = (): SIBSConfig => {
  const environment = (import.meta.env.VITE_SIBS_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  
  return {
    merchantId: import.meta.env.VITE_SIBS_MERCHANT_ID || '',
    apiKey: import.meta.env.VITE_SIBS_API_KEY || '',
    secretKey: import.meta.env.VITE_SIBS_SECRET_KEY || '',
    entity: import.meta.env.VITE_SIBS_ENTITY || '',
    baseUrl: environment === 'sandbox' 
      ? import.meta.env.VITE_SIBS_SANDBOX_URL || 'https://api-test.sibs.pt'
      : import.meta.env.VITE_SIBS_PRODUCTION_URL || 'https://api.sibs.pt',
    environment
  };
};

// Função para criar pagamento MB WAY
export async function createMBWayPayment(paymentData: MBWayPaymentRequest): Promise<SIBSPaymentResponse> {
  const config = getSIBSConfig();
  
  // Validar configuração
  if (!config.merchantId || !config.apiKey || !config.secretKey) {
    throw new Error('SIBS Pay credentials not configured. Check your .env.local file.');
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/payments/mbway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Merchant-ID': config.merchantId,
      },
      body: JSON.stringify({
        amount: paymentData.amount,
        currency: paymentData.currency,
        reference: paymentData.reference,
        description: paymentData.description,
        phoneNumber: paymentData.phoneNumber,
        callbackUrl: `${import.meta.env.VITE_BASE_URL}/api/sibs-webhook`,
        returnUrl: `${import.meta.env.VITE_BASE_URL}/payment/success`,
        cancelUrl: `${import.meta.env.VITE_BASE_URL}/payment/cancel`,
      }),
    });

    if (!response.ok) {
      throw new Error(`SIBS API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      transactionId: result.transactionId,
      status: result.status,
      reference: result.reference,
      amount: result.amount,
      mbwayReference: result.mbwayReference,
    };

  } catch (error) {
    console.error('SIBS Pay Error:', error);
    throw new Error('Erro ao processar pagamento MB WAY. Tenta novamente.');
  }
}

// Função para verificar status de pagamento
export async function checkMBWayPaymentStatus(transactionId: string): Promise<SIBSPaymentResponse> {
  const config = getSIBSConfig();

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/payments/${transactionId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Merchant-ID': config.merchantId,
      },
    });

    if (!response.ok) {
      throw new Error(`SIBS API Error: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      transactionId: result.transactionId,
      status: result.status,
      reference: result.reference,
      amount: result.amount,
    };

  } catch (error) {
    console.error('SIBS Status Check Error:', error);
    throw error;
  }
}

// Função para criar referência Multibanco
export async function createMultibancoReference(paymentData: Omit<MBWayPaymentRequest, 'phoneNumber'>): Promise<SIBSPaymentResponse> {
  const config = getSIBSConfig();

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/payments/multibanco`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Merchant-ID': config.merchantId,
      },
      body: JSON.stringify({
        amount: paymentData.amount,
        currency: paymentData.currency,
        reference: paymentData.reference,
        description: paymentData.description,
        entity: config.entity,
        callbackUrl: `${import.meta.env.VITE_BASE_URL}/api/sibs-webhook`,
      }),
    });

    if (!response.ok) {
      throw new Error(`SIBS API Error: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      transactionId: result.transactionId,
      status: result.status,
      reference: result.reference,
      amount: result.amount,
    };

  } catch (error) {
    console.error('SIBS Multibanco Error:', error);
    throw error;
  }
}

// Validar número de telemóvel português
export function validatePortuguesePhoneNumber(phone: string): boolean {
  // Remove espaços e caracteres especiais
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Validar formato português: +351XXXXXXXXX ou 9XXXXXXXX
  const portugalMobileRegex = /^(\+351|0351|351)?9[1-9]\d{7}$/;
  
  return portugalMobileRegex.test(cleanPhone);
}

// Formatar número para envio à SIBS
export function formatPhoneNumberForSIBS(phone: string): string {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remover +351 ou 351 se existir e adicionar +351
  if (cleanPhone.startsWith('+351')) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('351')) {
    return '+' + cleanPhone;
  } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    return '+351' + cleanPhone;
  }
  
  return '+351' + cleanPhone;
}

// Constantes úteis
export const SIBS_PAYMENT_METHODS = {
  MBWAY: 'mbway',
  MULTIBANCO: 'multibanco',
  CARD: 'card'
} as const;

export const SIBS_PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success', 
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type PaymentMethod = typeof SIBS_PAYMENT_METHODS[keyof typeof SIBS_PAYMENT_METHODS];
export type PaymentStatus = typeof SIBS_PAYMENT_STATUS[keyof typeof SIBS_PAYMENT_STATUS]; 