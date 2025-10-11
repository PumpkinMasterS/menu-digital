import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, CreditCard, Check, Clock, Info, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createMultibancoReference } from '@/lib/sibs-pay';

interface MultibancoPaymentProps {
  amount: number;
  orderId: string;
  description: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const MultibancoPayment: React.FC<MultibancoPaymentProps> = ({
  amount,
  orderId,
  description,
  onSuccess,
  onError,
  onCancel
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'generated' | 'pending' | 'success' | 'failed'>('idle');
  const [paymentData, setPaymentData] = useState<{
    entity: string;
    reference: string;
    amount: number;
    transactionId: string;
  } | null>(null);

  const generateReference = async () => {
    setIsGenerating(true);
    
    try {
      const response = await createMultibancoReference({
        amount: Math.round(amount * 100), // Converter para cêntimos
        currency: 'EUR',
        reference: `ORDER_${orderId}`,
        description,
        orderId
      });

      // Mock data para desenvolvimento
      const mockData = {
        entity: '12345',
        reference: `123 456 789`,
        amount: Math.round(amount * 100),
        transactionId: response.transactionId
      };

      setPaymentData(mockData);
      setPaymentStatus('generated');
      
      toast({
        title: "Referência Multibanco Gerada",
        description: "Podes agora pagar em qualquer ATM ou Homebanking",
      });

      // Iniciar polling para verificar pagamento
      pollPaymentStatus(response.transactionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar referência';
      setPaymentStatus('failed');
      onError?.(errorMessage);
      
      toast({
        title: "Erro ao Gerar Referência",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const pollPaymentStatus = async (transactionId: string) => {
    let attempts = 0;
    const maxAttempts = 180; // 30 minutos (10 segundos * 180)

    const checkStatus = async () => {
      try {
        // Mock para desenvolvimento
        if (import.meta.env.DEV && !import.meta.env.VITE_SIBS_API_KEY) {
          // Simular pagamento após 30 segundos para teste
          if (attempts > 3) {
            setPaymentStatus('success');
            onSuccess?.(transactionId);
            toast({
              title: "Pagamento Confirmado!",
              description: "O teu pagamento Multibanco foi processado com sucesso.",
            });
            return;
          }
        }

        // Implementação real quando tiveres SIBS configurado
        const response = await fetch(`/api/check-multibanco-status/${transactionId}`);
        const data = await response.json();

        if (data.status === 'success') {
          setPaymentStatus('success');
          onSuccess?.(transactionId);
          toast({
            title: "Pagamento Confirmado!",
            description: "O teu pagamento Multibanco foi processado com sucesso.",
          });
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentStatus('failed');
          return;
        }

        // Continuar polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check a cada 10 segundos
        } else {
          setPaymentStatus('failed');
          toast({
            title: "Timeout",
            description: "Não conseguimos confirmar o pagamento. Se pagaste, contacta o suporte.",
            variant: "destructive"
          });
        }

      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        }
      }
    };

    // Primeira verificação após 10 segundos
    setTimeout(checkStatus, 10000);
    setPaymentStatus('pending');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copiado!`,
        description: `${label} foi copiado para a área de transferência.`,
      });
    });
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setPaymentData(null);
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-700">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            O teu pagamento Multibanco foi processado com sucesso.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-red-600" />
          Pagamento Multibanco
        </CardTitle>
        <CardDescription>
          Paga em qualquer ATM ou Homebanking
        </CardDescription>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-lg font-bold">€{amount.toFixed(2)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {paymentStatus === 'idle' && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Será gerada uma referência Multibanco válida por 3 dias para pagares em ATM ou Homebanking.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={generateReference}
                disabled={isGenerating}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    A gerar referência...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Gerar Referência Multibanco
                  </>
                )}
              </Button>

              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="w-full">
                  Cancelar
                </Button>
              )}
            </div>
          </>
        )}

        {paymentStatus === 'generated' && paymentData && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Referência gerada com sucesso!</strong> Podes pagar em qualquer ATM ou Homebanking.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Entidade:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg">{paymentData.entity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(paymentData.entity, 'Entidade')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Referência:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg">{paymentData.reference}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(paymentData.reference.replace(/\s/g, ''), 'Referência')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valor:</span>
                <span className="font-mono text-lg font-bold">€{amount.toFixed(2)}</span>
              </div>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Prazo:</strong> Esta referência é válida por 3 dias. 
                Após o pagamento, a confirmação pode demorar até 10 minutos.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetPayment} className="flex-1">
                Gerar Nova Referência
              </Button>
              {onCancel && (
                <Button variant="destructive" onClick={onCancel} className="flex-1">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">À espera do pagamento</h3>
              <p className="text-sm text-gray-600">
                Assim que efetuares o pagamento, iremos processar o teu pedido automaticamente.
              </p>
              
              {paymentData && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Entidade: <span className="font-mono">{paymentData.entity}</span></p>
                  <p>Referência: <span className="font-mono">{paymentData.reference}</span></p>
                  <p>Valor: <span className="font-mono">€{amount.toFixed(2)}</span></p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetPayment} className="flex-1">
                Gerar Nova Referência
              </Button>
              {onCancel && (
                <Button variant="destructive" onClick={onCancel} className="flex-1">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-red-700">Erro na Referência</h3>
              <p className="text-sm text-gray-600">
                Não foi possível gerar a referência Multibanco. Tenta novamente.
              </p>
            </div>

            <Button onClick={resetPayment} className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkYwMDAwIi8+Cjwvc3ZnPgo="
              alt="Multibanco"
              className="w-4 h-4"
            />
            Pagamento seguro via SIBS Pay
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MultibancoPayment; 