import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useAutoLogout } from '@/hooks/use-auto-logout';
import { AutoLogoutWarning } from '@/components/ui/auto-logout-warning';
import { toast } from '@/hooks/use-toast';

interface AutoLogoutProviderProps {
  children: React.ReactNode;
}

export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const { user, logout } = useUnifiedAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const { updateActivity, getTimeUntilLogout } = useAutoLogout({
    enabled: !!user, // Só ativar se usuário logado
    onWarning: () => {
      const remaining = getTimeUntilLogout();
      setTimeRemaining(remaining);
      setShowWarning(true);
      
      toast({
        title: "⚠️ Sessão Expirando",
        description: "Sua sessão será encerrada em 2 minutos por inatividade.",
        variant: "destructive",
      });
    },
    onLogout: () => {
      setShowWarning(false);
      toast({
        title: "🔒 Sessão Encerrada",
        description: "Sua sessão foi encerrada automaticamente por segurança.",
        variant: "destructive",
      });
    }
  });

  const handleExtendSession = () => {
    updateActivity();
    setShowWarning(false);
    
    toast({
      title: "✅ Sessão Estendida",
      description: "Sua sessão foi renovada com sucesso.",
      variant: "default",
    });
  };

  const handleLogoutNow = () => {
    setShowWarning(false);
    logout();
  };

  // Atualizar timeRemaining quando o warning está ativo
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      const remaining = getTimeUntilLogout();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, getTimeUntilLogout]);

  return (
    <>
      {children}
      <AutoLogoutWarning
        isOpen={showWarning}
        onExtendSession={handleExtendSession}
        onLogout={handleLogoutNow}
        timeRemaining={timeRemaining}
      />
    </>
  );
} 