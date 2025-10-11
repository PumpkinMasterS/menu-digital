import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, X, Settings } from 'lucide-react';
import { useTOTPStatus } from '@/hooks/useTOTPStatus';
import { useNavigate } from 'react-router-dom';

export function TOTPAlert() {
  const { hasVerifiedTOTP, isRequired, isLoading } = useTOTPStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  // Não mostrar se não é obrigatório, já tem TOTP, está carregando ou foi dismissed
  if (!isRequired || hasVerifiedTOTP || isLoading || isDismissed) {
    return null;
  }

  const handleConfigureTOTP = () => {
    navigate('/admin/settings?tab=security');
  };

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md">
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <Shield className="h-4 w-4 text-amber-600" />
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Segurança Obrigatória:</strong> Como Super Admin, você deve configurar 
              a autenticação de dois fatores (TOTP) para garantir máxima segurança.
            </AlertDescription>
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={handleConfigureTOTP}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Settings className="h-3 w-3 mr-1" />
                Configurar Agora
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsDismissed(true)}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Lembrar Depois
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="p-1 h-auto text-amber-600 hover:text-amber-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Alert>
    </div>
  );
} 