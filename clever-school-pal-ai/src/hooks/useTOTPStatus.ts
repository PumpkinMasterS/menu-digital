import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TOTPStatus {
  hasVerifiedTOTP: boolean;
  isRequired: boolean;
  isLoading: boolean;
  factors: any[];
}

export function useTOTPStatus(): TOTPStatus {
  const { user } = useUnifiedAuth();
  const [status, setStatus] = useState<TOTPStatus>({
    hasVerifiedTOTP: false,
    isRequired: false,
    isLoading: true,
    factors: []
  });

  useEffect(() => {
    const checkTOTPStatus = async () => {
      if (!user) {
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Verificar se é super admin
        const isSuperAdmin = user.role === 'super_admin';
        
        // Carregar fatores MFA
        const { data, error } = await supabase.auth.mfa.listFactors();
        
        if (error) {
          if (import.meta.env.DEV) console.error('Erro ao carregar fatores MFA:', error);
          setStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const totpFactors = (data.totp || []).filter(factor => factor.factor_type === 'totp');
        const hasVerifiedTOTP = totpFactors.some(f => f.status === 'verified');

        setStatus({
          hasVerifiedTOTP,
          isRequired: isSuperAdmin, // Super admins precisam de TOTP
          isLoading: false,
          factors: totpFactors
        });

      } catch (err) {
        if (import.meta.env.DEV) console.error('Erro ao verificar status TOTP:', err);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkTOTPStatus();
  }, [user]);

  return status;
} 