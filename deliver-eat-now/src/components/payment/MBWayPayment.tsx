import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Check, Clock, X, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { validatePortuguesePhoneNumber, formatPhoneNumberForSIBS } from '@/lib/sibs-pay';

interface MBWayPaymentProps {
  amount: number;
  orderId: string;
  description: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const MBWayPayment: React.FC<MBWayPaymentProps> = ({
  amount,
  orderId,
  description,
  onSuccess,
  onError,
  onCancel
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handlePhoneChange = (value: string) => {
    // Permitir apenas números, espaços, +, (, ), -
    const cleaned = value.replace(/[^\d\s\+\(\)\-]/g, '');
    setPhoneNumber(cleaned);
    
    // Limpar erro se o número se tornar válido
    if (validatePortuguesePhoneNumber(cleaned)) {
      setError('');
    }
  };

  const initiatePayment = async () => {
    // Validar número de telemóvel
    if (!validatePortuguesePhoneNumber(phoneNumber)) {
      setError('Por favor introduz um número de telemóvel português válido (ex: 91 234 5678)');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumberForSIBS(phoneNumber);
      
      const response = await fetch('/api/create-mbway-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Converter para cêntimos
          currency: 'EUR',
          reference: `ORDER_${orderId}`,
          description,
          phoneNumber: formattedPhone,
          orderId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      setTransactionId(data.transactionId);
      setPaymentStatus('pending');
      
      toast({
        title: "Pagamento MB WAY Iniciado",
        description: "Verifica o teu telemóvel e autoriza o pagamento na app MB WAY",
      });

      // Polling do status do pagamento
      pollPaymentStatus(data.transactionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      onError?.(errorMessage);
      
      toast({
        title: "Erro no Pagamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (txId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutos (10 segundos * 30)

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/check-mbway-status/${txId}`);
        const data = await response.json();

        if (data.status === 'success') {
          setPaymentStatus('success');
          onSuccess?.(txId);
          toast({
            title: "Pagamento Confirmado!",
            description: "O teu pagamento MB WAY foi processado com sucesso.",
          });
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentStatus('failed');
          setError('Pagamento cancelado ou rejeitado na app MB WAY');
          return;
        }

        // Continuar polling se ainda estiver pending
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check a cada 10 segundos
        } else {
          setPaymentStatus('failed');
          setError('Timeout: Pagamento não foi confirmado dentro do tempo limite');
        }

      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus('failed');
        setError('Erro ao verificar status do pagamento');
      }
    };

    // Primeira verificação após 5 segundos
    setTimeout(checkStatus, 5000);
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setTransactionId('');
    setError('');
    setPhoneNumber('');
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
            O teu pagamento MB WAY foi processado com sucesso.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          Pagamento MB WAY
        </CardTitle>
        <CardDescription>
          Paga com o teu telemóvel de forma rápida e segura
        </CardDescription>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-lg font-bold">€{amount.toFixed(2)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {paymentStatus === 'idle' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telemóvel</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="91 234 5678"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={error ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500">
                Introduce o número associado à tua conta MB WAY
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={initiatePayment}
                disabled={!phoneNumber || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Pagar com MB WAY
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

        {paymentStatus === 'pending' && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">À espera da confirmação</h3>
              <p className="text-sm text-gray-600">
                Verifica a tua app MB WAY e autoriza o pagamento de <strong>€{amount.toFixed(2)}</strong>
              </p>
              <Badge variant="secondary" className="text-xs">
                Telemóvel: {phoneNumber}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetPayment} className="flex-1">
                Alterar Número
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
              <X className="h-8 w-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-red-700">Pagamento Falhhou</h3>
              <p className="text-sm text-gray-600">{error}</p>
            </div>

            <Button onClick={resetPayment} className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDA3Q0ZGIi8+Cjwvc3ZnPgo="
              alt="MB WAY"
              className="w-4 h-4"
            />
            Pagamento seguro via SIBS Pay
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MBWayPayment; 