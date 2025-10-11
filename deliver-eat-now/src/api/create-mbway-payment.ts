// 🇵🇹 API Handler para Pagamentos MB WAY via SIBS Pay
import { createMBWayPayment } from '@/lib/sibs-pay';

interface MBWayPaymentRequest {
  amount: number;
  currency?: string;
  reference: string;
  description?: string;
  phoneNumber: string;
  orderId: string;
}

export async function handleMBWayPayment(requestData: MBWayPaymentRequest) {
  try {
    const { amount, currency, reference, description, phoneNumber, orderId } = requestData;

    // Validar dados obrigatórios
    if (!amount || !phoneNumber || !reference) {
      throw new Error('Dados obrigatórios em falta: amount, phoneNumber, reference');
    }

    // Validar valor mínimo
    if (amount < 50) { // 0.50€ mínimo
      throw new Error('Valor mínimo de pagamento é €0.50');
    }

    // Criar pagamento MB WAY via SIBS
    const paymentResult = await createMBWayPayment({
      amount,
      currency: currency || 'EUR',
      reference,
      description: description || `Pedido ${orderId}`,
      phoneNumber,
      orderId
    });

    return {
      success: true,
      transactionId: paymentResult.transactionId,
      status: paymentResult.status,
      reference: paymentResult.reference,
      mbwayReference: paymentResult.mbwayReference,
    };

  } catch (error) {
    console.error('MB WAY Payment Error:', error);
    
    // Tratar diferentes tipos de erro
    let errorMessage = 'Erro interno do servidor';

    if (error instanceof Error) {
      if (error.message.includes('credentials not configured')) {
        errorMessage = 'Configuração SIBS Pay incompleta. Contacta o suporte.';
      } else if (error.message.includes('SIBS API Error')) {
        errorMessage = 'Erro na comunicação com SIBS Pay. Tenta novamente.';
      } else {
        errorMessage = error.message;
      }
    }

    throw new Error(errorMessage);
  }
}

export async function handleMBWayStatusCheck(transactionId: string) {
  try {
    // Esta função será implementada quando tiveres as credenciais SIBS
    // Por agora, retorna um mock para desenvolvimento
    
    if (!transactionId) {
      throw new Error('Transaction ID é obrigatório');
    }

    // Mock para desenvolvimento - remove quando tiveres SIBS configurado
    if (import.meta.env.DEV && !import.meta.env.VITE_SIBS_API_KEY) {
      // Simular resposta após 10 segundos
      const mockStatuses = ['pending', 'success', 'failed'];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
      
      return {
        transactionId,
        status: randomStatus,
        reference: `MOCK_${transactionId}`,
        amount: 1000 // mock amount
      };
    }

    // Implementação real quando tiveres SIBS configurado
    const { checkMBWayPaymentStatus } = await import('@/lib/sibs-pay');
    return await checkMBWayPaymentStatus(transactionId);

  } catch (error) {
    console.error('MB WAY Status Check Error:', error);
    throw error;
  }
} 