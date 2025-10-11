import { useState, useEffect, startTransition } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

export interface BrandingData {
  school_id: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  dark_primary_color: string;
  dark_secondary_color: string;
  dark_accent_color: string;
  font_family: string;
  theme_mode: 'light' | 'dark' | 'auto';
  custom_css?: string;
}

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export const useBranding = () => {
  const { user } = useUnifiedAuth();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados de branding
  const loadBranding = async (schoolId?: string) => {
    try {
      startTransition(() => {
        setLoading(true);
        setError(null);
      });

      const targetSchoolId = schoolId || user?.school_id;
      if (!targetSchoolId) {
        throw new Error('ID da escola não fornecido');
      }

      const { data, error: fetchError } = await (supabase as any)
        .from('school_branding')
        .select('*')
        .eq('school_id', targetSchoolId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      startTransition(() => {
        setBranding(data as BrandingData);
      });
      return data as BrandingData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar branding';
      startTransition(() => {
        setError(errorMessage);
      });
      console.error('Erro ao carregar branding:', err);
      return null;
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  // Atualizar dados de branding
  const updateBranding = async (updates: Partial<BrandingData>) => {
    try {
      startTransition(() => {
        setError(null);
      });

      if (!user?.school_id) {
        throw new Error('Usuário não está associado a uma escola');
      }

      const { data, error: updateError } = await (supabase as any)
        .from('school_branding')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('school_id', user.school_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      startTransition(() => {
        setBranding(data);
      });
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar branding';
      startTransition(() => {
        setError(errorMessage);
      });
      console.error('Erro ao atualizar branding:', err);
      throw err;
    }
  };

  // Upload de logo
  const uploadLogo = async (file: File, type: 'logo' | 'favicon' = 'logo') => {
    try {
      setError(null);

      if (!user?.school_id) {
        throw new Error('Usuário não está associado a uma escola');
      }

      // Validar arquivo
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Máximo 5MB.');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou SVG.');
      }

      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.school_id}/${type}-${Date.now()}.${fileExtension}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('school-branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('school-branding')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Atualizar branding com nova URL
      const updateField = type === 'logo' ? 'logo_url' : 'favicon_url';
      await updateBranding({ [updateField]: publicUrl });

      return publicUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(errorMessage);
      console.error('Erro no upload:', err);
      throw err;
    }
  };

  // Remover logo
  const removeLogo = async (type: 'logo' | 'favicon' = 'logo') => {
    try {
      setError(null);

      if (!user?.school_id) {
        throw new Error('Usuário não está associado a uma escola');
      }

      const updateField = type === 'logo' ? 'logo_url' : 'favicon_url';
      await updateBranding({ [updateField]: null });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover logo';
      setError(errorMessage);
      console.error('Erro ao remover logo:', err);
      throw err;
    }
  };

  // Aplicar branding no DOM
  const applyBranding = (brandingData: BrandingData) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Aplicar cores CSS custom properties
    root.style.setProperty('--brand-primary', brandingData.primary_color);
    root.style.setProperty('--brand-secondary', brandingData.secondary_color);
    root.style.setProperty('--brand-accent', brandingData.accent_color);
    root.style.setProperty('--brand-background', brandingData.background_color);
    root.style.setProperty('--brand-text', brandingData.text_color);
    
    // Cores para modo escuro
    root.style.setProperty('--brand-dark-primary', brandingData.dark_primary_color);
    root.style.setProperty('--brand-dark-secondary', brandingData.dark_secondary_color);
    root.style.setProperty('--brand-dark-accent', brandingData.dark_accent_color);

    // Fonte
    root.style.setProperty('--brand-font-family', brandingData.font_family);

    // CSS customizado
    if (brandingData.custom_css) {
      let customStyleElement = document.getElementById('custom-branding-css');
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-branding-css';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = brandingData.custom_css;
    }
  };

  // Obter cores atuais
  const getCurrentColors = (): BrandingColors => {
    if (!branding) {
      return {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937'
      };
    }

    return {
      primary: branding.primary_color,
      secondary: branding.secondary_color,
      accent: branding.accent_color,
      background: branding.background_color,
      text: branding.text_color
    };
  };

  // Carregar branding automaticamente quando o usuário muda
  useEffect(() => {
    if (user?.school_id) {
      startTransition(() => {
        loadBranding(user.school_id);
      });
    }
  }, [user?.school_id]);

  // Aplicar branding automaticamente quando os dados mudam
  useEffect(() => {
    if (branding) {
      applyBranding(branding);
    }
  }, [branding]);

  return {
    branding,
    loading,
    error,
    loadBranding,
    updateBranding,
    uploadLogo,
    removeLogo,
    applyBranding,
    getCurrentColors
  };
};