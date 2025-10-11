import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { toast } from "sonner";

export interface CustomPersonality {
  id: string;
  name: string;
  prompt: string;
  created_by: string | null;
  created_at: string;
  is_default?: boolean;
}

// Personalidade padrão que sempre estará disponível
const DEFAULT_PERSONALITY: CustomPersonality = {
  id: 'default-assistant',
  name: 'Assistente Simples',
  prompt: 'És um assistente educativo simples. Responde às perguntas dos alunos de forma clara e direta, sempre incentivando o aprendizado.',
  created_by: null,
  created_at: new Date().toISOString(),
  is_default: true
};

export const useCustomPersonalities = () => {
  const { user } = useUnifiedAuth();
  const queryClient = useQueryClient();

  // Query para carregar personalidades
  const {
    data: dbPersonalities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['custom_personalities'],
    queryFn: async (): Promise<CustomPersonality[]> => {
      const { data, error } = await supabase
        .from('custom_personalities')
        .select('id, name, prompt, created_by, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar personalidades:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2, // Tentar novamente 2 vezes em caso de erro
  });

  // Combinar personalidade padrão com personalidades da BD
  const personalities: CustomPersonality[] = [
    DEFAULT_PERSONALITY,
    ...dbPersonalities.filter(p => p.id !== 'default-assistant') // Evitar duplicação
  ];

  // Mutação para criar personalidade
  const createPersonalityMutation = useMutation({
    mutationFn: async ({ name, prompt }: { name: string; prompt: string }) => {
      // Preparar dados sem created_by se não houver usuário
      const insertData: any = {
        name: name.trim(),
        prompt: prompt.trim(),
        is_active: true
      };

      // Só incluir created_by se houver usuário autenticado
      if (user?.id) {
        insertData.created_by = user.id;
      }

      const { data, error } = await supabase
        .from('custom_personalities')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom_personalities'] });
      toast.success(`Personalidade "${data.name}" foi criada com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao criar personalidade:', error?.message || error);
      toast.error("Erro ao criar personalidade. Tente novamente.");
    }
  });

  // Mutação para atualizar personalidade
  const updatePersonalityMutation = useMutation({
    mutationFn: async ({ id, name, prompt }: { id: string; name: string; prompt: string }) => {
      // Não permitir editar a personalidade padrão
      if (id === 'default-assistant') {
        throw new Error('Não é possível editar a personalidade padrão');
      }

      const { data, error } = await supabase
        .from('custom_personalities')
        .update({
          name: name.trim(),
          prompt: prompt.trim()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom_personalities'] });
      toast.success(`Personalidade "${data.name}" foi atualizada com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar personalidade:', error);
      toast.error(error.message || "Erro ao atualizar personalidade");
    }
  });

  // Mutação para deletar personalidade
  const deletePersonalityMutation = useMutation({
    mutationFn: async (id: string) => {
      // Não permitir deletar a personalidade padrão
      if (id === 'default-assistant') {
        throw new Error('Não é possível deletar a personalidade padrão');
      }

      // Soft delete - marcar como inativa
      const { error } = await supabase
        .from('custom_personalities')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['custom_personalities'] });
      const deletedPersonality = personalities.find(p => p.id === deletedId);
      toast.success(`Personalidade "${deletedPersonality?.name}" foi removida com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao deletar personalidade:', error);
      toast.error(error.message || "Erro ao deletar personalidade");
    }
  });

  // Mutação para deletar permanentemente (apenas para admins)
  const hardDeletePersonalityMutation = useMutation({
    mutationFn: async (id: string) => {
      // Não permitir deletar a personalidade padrão
      if (id === 'default-assistant') {
        throw new Error('Não é possível deletar a personalidade padrão');
      }

      const { error } = await supabase
        .from('custom_personalities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['custom_personalities'] });
      const deletedPersonality = personalities.find(p => p.id === deletedId);
      toast.success(`Personalidade "${deletedPersonality?.name}" foi removida permanentemente!`);
    },
    onError: (error: any) => {
      console.error('Erro ao deletar personalidade permanentemente:', error);
      toast.error(error.message || "Erro ao deletar personalidade");
    }
  });

  return {
    // Data - agora inclui personalidade padrão
    personalities,
    isLoading,
    error,
    
    // Actions
    createPersonality: createPersonalityMutation.mutateAsync,
    updatePersonality: updatePersonalityMutation.mutateAsync,
    deletePersonality: deletePersonalityMutation.mutateAsync,
    hardDeletePersonality: hardDeletePersonalityMutation.mutateAsync,
    refetch,
    
    // Loading states
    isCreating: createPersonalityMutation.isPending,
    isUpdating: updatePersonalityMutation.isPending,
    isDeleting: deletePersonalityMutation.isPending,
    
    // Utilities
    getPersonalityById: (id: string) => personalities.find(p => p.id === id),
    getPersonalityByName: (name: string) => personalities.find(p => p.name === name),
    getUserPersonalities: () => personalities.filter(p => p.created_by === user?.id),
    getSharedPersonalities: () => personalities.filter(p => p.created_by !== user?.id && !p.is_default),
    getDefaultPersonality: () => DEFAULT_PERSONALITY,
  };
}; 