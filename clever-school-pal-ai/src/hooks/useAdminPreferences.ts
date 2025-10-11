import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { toast } from 'sonner';

export const useAdminPreferences = () => {
  const { user } = useUnifiedAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // ID único do admin (pode ser auth.uid() ou fallback)
  const adminId = user?.id || 'global_admin';

  // Função para obter chave específica do admin
  const getStorageKey = (key: string): string => {
    return `admin_pref_${adminId}_${key}`;
  };

  // Função para obter preferência do localStorage
  const getPreference = (key: string, defaultValue: any = null): any => {
    try {
      const storageKey = getStorageKey(key);
      const value = localStorage.getItem(storageKey);
      
      if (value) {
        const parsed = JSON.parse(value);
        return parsed.value || parsed; // Suporta ambos os formatos
      }

      return defaultValue;
    } catch (error) {
      console.error(`Erro ao obter preferência '${key}':`, error);
      return defaultValue;
    }
  };

  // Função para salvar preferência no localStorage
  const setPreference = (key: string, value: any) => {
    try {
      const storageKey = getStorageKey(key);
      const preferenceData = {
        value,
        timestamp: new Date().toISOString(),
        adminId,
      };

      localStorage.setItem(storageKey, JSON.stringify(preferenceData));
      console.log(`✅ Preferência '${key}' salva para admin ${adminId}`);
    } catch (error) {
      console.error(`❌ Erro ao salvar preferência '${key}':`, error);
    }
  };

  // Funções específicas para personalidade
  const getSelectedPersonality = (): string => {
    return getPreference('selected_personality', 'original');
  };

  const setSelectedPersonality = (personalityId: string) => {
    setPreference('selected_personality', personalityId);
    
    // Feedback visual apenas para personalidades não-originais
    if (personalityId !== 'original') {
      toast.success('🎭 Personalidade salva!', {
        description: `Salva para este dispositivo e admin`,
      });
    }
  };

  // Função para migrar da chave antiga se existir
  const migrateOldPersonality = () => {
    try {
      const oldKey = 'selectedPersonality';
      const oldValue = localStorage.getItem(oldKey);
      
      if (oldValue && oldValue !== 'original') {
        console.log('🔄 Migrando personalidade da chave antiga:', oldValue);
        setSelectedPersonality(oldValue);
        localStorage.removeItem(oldKey); // Limpar chave antiga
        
        toast.info('📦 Personalidade migrada!', {
          description: 'Agora é específica por admin',
        });
      }
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  };

  // Função para limpar todas as preferências do admin atual
  const clearAllPreferences = () => {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`admin_pref_${adminId}_`)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
      
      toast.success('🗑️ Preferências do admin limpas');
      console.log(`🧹 Limpas ${keys.length} preferências do admin ${adminId}`);
    } catch (error) {
      console.error('Erro ao limpar preferências:', error);
      toast.error('❌ Erro ao limpar preferências');
    }
  };

  // Inicialização quando componente monta ou usuário muda
  useEffect(() => {
    if (!isInitialized) {
      console.log(`🔧 Inicializando preferências para admin: ${adminId}`);
      
      // Migrar personalidade antiga se existir
      migrateOldPersonality();
      
      setIsInitialized(true);
    }
  }, [adminId, isInitialized]);

  return {
    // Estado
    isInitialized,
    adminId,

    // Funções gerais
    getPreference,
    setPreference,
    clearAllPreferences,

    // Funções específicas para personalidade
    getSelectedPersonality,
    setSelectedPersonality,

    // Utilitários
    getStorageKey,
  };
}; 