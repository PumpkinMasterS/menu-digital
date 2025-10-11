import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, Shield } from 'lucide-react';

interface AutoLogoutWarningProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onLogout: () => void;
  timeRemaining: number; // em milissegundos
}

export function AutoLogoutWarning({ 
  isOpen, 
  onExtendSession, 
  onLogout, 
  timeRemaining 
}: AutoLogoutWarningProps) {
  const [countdown, setCountdown] = useState(Math.ceil(timeRemaining / 1000));

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const newCountdown = Math.ceil(timeRemaining / 1000);
      setCountdown(newCountdown);
      
      if (newCountdown <= 0) {
        onLogout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemaining, onLogout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Sessão Expirando
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg font-bold">
                  {formatTime(countdown)}
                </span>
              </div>
              <p>
                Sua sessão será encerrada automaticamente por segurança. 
                Clique em "Continuar" para estender sua sessão.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            className="text-red-600 hover:text-red-700"
          >
            Sair Agora
          </Button>
          <AlertDialogAction
            onClick={onExtendSession}
            className="bg-green-600 hover:bg-green-700"
          >
            Continuar Sessão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}