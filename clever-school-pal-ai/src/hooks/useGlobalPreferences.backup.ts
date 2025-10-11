import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useGlobalPreferences = () => {
  const [preferences, setPreferences] = useState<Record<string, any>>(() => {
    // Carregar do localStorage na inicialização
    try {
      const stored = localStorage.getItem('clever_school_global_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.active_personality ? parsed : { active_personality: 'default-assistant', ...parsed };
      }
    } catch (error) {
      console.error('Erro ao carregar localStorage:', error);
    }
    return { active_personality: 'default-assistant' };
  });
  
  const preferencesRef = useRef(preferences);
  
  // Manter a ref atualizada
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Salvar no localStorage
  const saveToLocalStorage = useCallback((prefs: Record<string, any>) => {
    try {
      localStorage.setItem('clever_school_global_preferences', JSON.stringify(prefs));
      return true;
    } catch (error) {
      console.error('Erro ao salvar localStorage:', error);
      return false;
    }
  }, []);

  // Função para definir preferência
  const setPreference = useCallback((key: string, value: any) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

  // Função para obter preferência
  const getPreference = useCallback((key: string, defaultValue: any = null) => {
    return preferencesRef.current[key] || defaultValue;
  }, []);

  // Funções específicas para personalidade
  const getPersonality = useCallback(() => {
    return preferencesRef.current.active_personality || 'default-assistant';
  }, []);

  const setPersonality = useCallback(async (personalityId: string) => {
    setIsSaving(true);
    try {
      setPreference('active_personality', personalityId);
      toast.success('Personalidade salva!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar personalidade:', error);
      toast.error('Erro ao salvar personalidade');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [setPreference]);

  // Função para resetar preferências
  const resetPreferences = useCallback(async () => {
    try {
      const defaultPrefs = { active_personality: 'default-assistant' };
      setPreferences(defaultPrefs);
      saveToLocalStorage(defaultPrefs);
      toast.success('Preferências resetadas');
      return true;
    } catch (error) {
      console.error('Erro ao resetar:', error);
      toast.error('Erro ao resetar preferências');
      return false;
    }
  }, [saveToLocalStorage]);

  // Função de diagnóstico simples
  const runFullDiagnostic = useCallback(async () => {
    console.log('🔧 Diagnóstico simplificado:');
    console.log('Preferências atuais:', preferences);
    toast.info('Diagnóstico concluído - verifique o console');
    return { localStorage: preferences };
  }, [preferences]);

  // Função vazia para compatibilidade
  const autoSyncWithSupabase = useCallback(() => {
    // Função vazia para compatibilidade
  }, []);

  // Função de recarregamento
  const refetch = useCallback(() => {
    // Recarregar do localStorage
    try {
      const stored = localStorage.getItem('clever_school_global_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed.active_personality ? parsed : { active_personality: 'default-assistant', ...parsed });
      }
    } catch (error) {
      console.error('Erro ao recarregar:', error);
    }
  }, []);

  return {
    // Data
    preferences,
    isLoading,
    isSaving,
    
    // Personality functions
    getPersonality,
    setPersonality,
    
    // Generic preference functions
    getPreference,
    setPreference,
    getPreferenceMetadata: async () => null, // Função vazia para compatibilidade
    
    // Utilities
    resetPreferences,
    refetch,
    runFullDiagnostic,
    autoSyncWithSupabase,
  };
};