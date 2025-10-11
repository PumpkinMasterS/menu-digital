import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useGlobalPreferences = () => {
  // Estado inicial carregado do localStorage
  const [preferences, setPreferences] = useState<Record<string, any>>(() => {
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
  
  // Ref para evitar dependências circulares
  const preferencesRef = useRef(preferences);
  
  // Manter a ref atualizada sem causar re-renders
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

  // Função para obter preferência (sem dependências para evitar loops)
  const getPreference = useCallback((key: string, defaultValue: any = null) => {
    return preferencesRef.current[key] || defaultValue;
  }, []);

  // Funções específicas para personalidade (sem dependências para evitar loops)
  const getPersonality = useCallback(() => {
    return preferencesRef.current.active_personality || 'default-assistant';
  }, []);

  const setPersonality = useCallback(async (personalityId: string) => {
    try {
      setIsSaving(true);
      setPreference('active_personality', personalityId);
      toast.success('Personalidade atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao definir personalidade:', error);
      toast.error('Erro ao atualizar personalidade');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [setPreference]);

  // Função para resetar preferências
  const resetPreferences = useCallback(() => {
    const defaultPrefs = { active_personality: 'default-assistant' };
    setPreferences(defaultPrefs);
    saveToLocalStorage(defaultPrefs);
    toast.success('Preferências resetadas!');
  }, [saveToLocalStorage]);

  // Função de diagnóstico simplificada
  const runFullDiagnostic = useCallback(async () => {
    try {
      const result = {
        localStorage: !!localStorage.getItem('clever_school_global_preferences'),
        preferences: preferencesRef.current,
        success: true
      };
      console.log('Diagnóstico completo:', result);
      return result;
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    preferences,
    isLoading,
    isSaving,
    getPersonality,
    setPersonality,
    getPreference,
    setPreference,
    resetPreferences,
    runFullDiagnostic
  };
};