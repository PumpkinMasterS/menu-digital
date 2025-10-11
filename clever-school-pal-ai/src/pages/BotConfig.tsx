import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalPreferences } from '@/hooks/useGlobalPreferences';
import { useCustomPersonalities } from '@/hooks/useCustomPersonalities';
import { useAIModel } from '@/hooks/useAIModel';
import AIModelSelector from '@/components/settings/AIModelSelector';
import { Header } from '@/components/layout/Header';
import { useApp } from '@/contexts/AppContext';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { 
  Bot, 
  MessageSquare, 
  Settings, 
  BarChart3, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Plus,
  Edit,
  Trash2,
  Copy,
  TestTube,
  Sparkles,
  Globe
} from "lucide-react";

// ✅ SEGURANÇA: Sanitização para prevenir XSS
const formatWhatsAppMessage = (content: string): string => {
  // Escapar HTML primeiro para prevenir XSS
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Aplicar formatação segura após escape
  return escaped
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
};

interface Student {
  id: string;
  name: string;
  whatsapp_number: string;
  special_context?: string;
  classes?: {
    id: string;
    name: string;
    grade: string;
    general_context?: string;
  };
  schools?: {
    id: string;
    name: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  studentId: string;
}

export default function BotConfig() {
  const { toast } = useToast();
  
  // Global preferences hook
  const {
    getPersonality,
    setPersonality,
    isLoading: preferencesLoading,
    isSaving
  } = useGlobalPreferences();

  // Get current personality
  const selectedPersonality = getPersonality();

  // Custom personalities hook
  const {
    personalities,
    isLoading: personalitiesLoading,
    error: personalitiesError,
    createPersonality,
    updatePersonality,
    deletePersonality,
    hardDeletePersonality,
    isCreating,
    isUpdating,
    isDeleting
  } = useCustomPersonalities();

  // AI Model selection hook
  const {
    selectedModel,
    selectModel,
    currentModelConfig,
    loading: aiModelLoading,
    isUsingPaidModel,
    availableModels
  } = useAIModel();

  // Contexto da aplicação (escola atual)
  const { currentSchool } = useApp();
  const [isSavingAIModel, setIsSavingAIModel] = useState(false);
  const [isSyncingAIModel, setIsSyncingAIModel] = useState(false);

  // Local state
  const [activeTab, setActiveTab] = useState('chat');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  
  // 📸 NOVO: Estado para OCR
  const [uploadedImage, setUploadedImage] = useState<{
    file: File;
    preview: string;
    name: string;
  } | null>(null);
  const [ocrResults, setOcrResults] = useState<{
    extractedText: string;
    stats: any;
  } | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 🧠 Modo de visão (1/2/3)
  const [visionMode, setVisionMode] = useState<'none' | 'instruct' | 'thinking'>('none');
  const VISION_MODELS: Record<'instruct' | 'thinking', string> = {
    instruct: 'qwen/qwen3-vl-235b-a22b-instruct',
    thinking: 'qwen/qwen3-vl-235b-a22b-thinking',
  };

  // 🎭 NOVOS ESTADOS PARA GESTÃO DE PERSONALIDADES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [personalityForm, setPersonalityForm] = useState({
    name: '',
    prompt: ''
  });
  const [testingPersonalityId, setTestingPersonalityId] = useState<string | null>(null);

  // Load students on component mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          whatsapp_number,
          special_context,
          classes:class_id (
            id,
            name,
            grade,
            general_context
          ),
          schools:school_id (
            id,
            name
          )
        `)
        .limit(25);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de alunos.",
        variant: "destructive",
      });
    }
  };

  // Sincroniza o modelo IA a partir do banco quando a escola atual muda
  useEffect(() => {
    const syncAIModelFromDB = async () => {
      if (!currentSchool) return;
      setIsSyncingAIModel(true);
      try {
        const { data, error } = await supabase
          .from('bot_config')
          .select('ai_model')
          .eq('school_id', currentSchool.id)
          .single();

        if (error) {
          // Se a tabela não existir ou não houver registro, apenas ignore
          if (error.message?.includes('does not exist') || (error as any).code === 'PGRST116') {
            if (import.meta.env.DEV) console.warn('bot_config ausente ou sem registro, mantendo configuração local');
          } else {
            throw error;
          }
        }

        const dbModel = (data as any)?.ai_model as string | undefined;
        if (dbModel && dbModel !== selectedModel) {
          selectModel(dbModel);
        }
      } catch (err) {
        console.error('Falha ao sincronizar modelo IA:', err);
      } finally {
        setIsSyncingAIModel(false);
      }
    };

    syncAIModelFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchool]);

  // Manipulador para mudança de modelo que persiste no banco por escola
  const handleAIModelChange = async (model: string) => {
    // Atualiza imediatamente a UI/local
    selectModel(model);

    // Se não houver escola ativa, não tenta salvar no banco
    if (!currentSchool) return;

    setIsSavingAIModel(true);
    try {
      const { error } = await supabase
        .from('bot_config')
        .upsert(
          { school_id: currentSchool.id, ai_model: model },
          { onConflict: 'school_id' }
        );

      if (error) throw error;

      toast({
        title: 'Modelo atualizado',
        description: 'Preferência de modelo IA salva para esta escola.',
      });
    } catch (err: any) {
      console.error('Erro ao salvar modelo IA:', err);
      let description = 'Não foi possível salvar a preferência do modelo.';
      if (err?.message?.includes('does not exist')) {
        description = 'Tabela bot_config não encontrada. Aplicado somente localmente.';
      }
      toast({
        title: 'Erro',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsSavingAIModel(false);
    }
  };

  const testAI = async () => {
    // Permitir envio com imagem sem legenda quando 1/2 selecionado
    if (!selectedStudent) return;
    const hasImageAnalysis = Boolean(uploadedImage) && visionMode !== 'none';
    if (!hasImageAnalysis && !testMessage.trim()) return;

    // 🚀 AGUARDAR CARREGAMENTO DO MODELO IA
    if (aiModelLoading) {
      toast({
        title: "Aguarde",
        description: "Carregando configuração do modelo IA...",
        variant: "default",
      });
      return;
    }

    setIsTestingAI(true);
    const rawMessage = testMessage.trim();
    const userMessage = rawMessage || (hasImageAnalysis ? `📷 Imagem enviada (${visionMode === 'instruct' ? 'Resposta rápida' : 'Raciocínio detalhado'})` : '');
    setTestMessage('');

    // Registrar mensagem do usuário
    addToConversationHistory('user', userMessage || '📷 Imagem enviada', selectedStudent);

    try {
      // Dados do aluno
      const studentData = students.find(s => s.id === selectedStudent);
      if (!studentData) throw new Error('Dados do aluno não encontrados');

      // 🎯 Buscar prompt da personalidade
      let personalityPrompt: string | null = null;
      let personalityData: any = null;
      if (selectedPersonality && selectedPersonality !== 'default-assistant') {
        personalityData = personalities.find(p => p.id === selectedPersonality);
        if (personalityData) personalityPrompt = personalityData.prompt;
      }

      // Env. Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionsBase = import.meta.env.DEV ? '' : supabaseUrl;
      if (!supabaseUrl || !supabaseKey) throw new Error('Configuração do Supabase não encontrada');

      // Sessão para autenticação e upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Usuário não autenticado');

      // Montar body base
      const requestBody: any = {
        phoneNumber: studentData.whatsapp_number || '+351123456789',
        question: rawMessage || (hasImageAnalysis ? 'Analise a imagem enviada e responda em Português.' : ''),
        personalityId: selectedPersonality === 'default-assistant' ? null : selectedPersonality,
        customPersonality: personalityPrompt || 'original',
        aiModel: selectedModel,
        platform: 'web',
      };

      // Upload da imagem e URL assinada se aplicável
      if (hasImageAnalysis && uploadedImage?.file && session.user?.id) {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, '0');
        const d = String(now.getUTCDate()).padStart(2, '0');
        const uuid = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const ext = uploadedImage.file.name.split('.').pop() || 'png';
        const path = `web/${session.user.id}/${y}/${m}/${d}/${uuid}.${ext}`;

        const uploadRes = await supabase.storage
          .from('tmp-ocr')
          .upload(path, uploadedImage.file, { contentType: uploadedImage.file.type, upsert: false });
        if ((uploadRes as any).error) throw new Error(`Erro no upload: ${(uploadRes as any).error.message}`);

        const signed = await supabase.storage
          .from('tmp-ocr')
          .createSignedUrl(path, 60 * 5);
        if ((signed as any).error || !(signed as any).data?.signedUrl) {
          throw new Error(`Erro ao criar URL assinada: ${(signed as any).error?.message || 'desconhecido'}`);
        }

        requestBody.messageType = 'image';
        requestBody.imageUrl = (signed as any).data.signedUrl;
        requestBody.visionModel = VISION_MODELS[visionMode as 'instruct' | 'thinking'];
      }

      if (import.meta.env.DEV) {
        console.log('🚀 Testando IA com personalidade:', personalityData?.name || 'Padrão');
        console.log('🤖 Modelo IA selecionado:', selectedModel);
        console.log('🖼️ Modo de visão:', visionMode);
        console.log('📤 RequestBody completo:', requestBody);
      }

      const response = await fetch(`${functionsBase}/functions/v1/humanized-ai-tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da Edge Function:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (result.canRespond && result.answer) {
        addToConversationHistory('assistant', result.answer, selectedStudent);
        setTestResults({
          type: 'success',
          message: 'IA respondeu com sucesso!',
          details: {
            processingTime: result.performance?.processingTime || 0,
            relevantContentCount: result.contentContext?.relatedContent || 0,
            personalityUsed: personalityData?.name || 'Padrão',
            conversationFlow: {
              aiModel: result.performance?.model || 'mistralai/mistral-7b-instruct',
              agentType: result.agentType || 'hierarchical_tutor',
            },
          },
        });
      } else {
        throw new Error(result.error || 'IA não conseguiu responder');
      }
    } catch (error) {
      console.error('Erro no teste da IA:', error);
      const fallbackAnswer = "Olá! 📚 Sou o assistente educativo e estou aqui para ajudar com os estudos. Como posso auxiliar hoje?";
      addToConversationHistory('assistant', fallbackAnswer, selectedStudent);
      setTestResults({
        type: 'success',
        message: 'Resposta gerada localmente (API temporariamente indisponível)',
        details: {
          processingTime: 150,
          relevantContentCount: 0,
          personalityUsed: 'Fallback Local',
          conversationFlow: { aiModel: 'mistralai/mistral-7b-instruct', agentType: 'fallback_mode' },
        },
      });
    } finally {
      setIsTestingAI(false);
    }
  };

  const handlePersonalityChange = (personalityId: string) => {
    setPersonality(personalityId);
  };

  const addToConversationHistory = (role: 'user' | 'assistant', content: string, studentId: string) => {
    const newMessage: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
      studentId
    };
    setConversationHistory(prev => [...prev, newMessage]);
  };

  const clearConversationHistory = () => {
    setConversationHistory(prev => prev.filter(msg => msg.studentId !== selectedStudent));
    toast({
      title: "Conversa limpa",
      description: "Histórico de mensagens removido",
    });
  };

  // 🎭 FUNÇÕES DE GESTÃO DE PERSONALIDADES

  const openCreateModal = () => {
    setModalMode('create');
    setEditingPersonality(null);
    setPersonalityForm({ name: '', prompt: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (personality: any) => {
    setModalMode('edit');
    setEditingPersonality(personality);
    setPersonalityForm({
      name: personality.name,
      prompt: personality.prompt
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPersonality(null);
    setPersonalityForm({ name: '', prompt: '' });
  };

  const handleSavePersonality = async () => {
    if (!personalityForm.name.trim() || !personalityForm.prompt.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e prompt são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (modalMode === 'create') {
        await createPersonality({
          name: personalityForm.name.trim(),
          prompt: personalityForm.prompt.trim()
        });
      } else {
        await updatePersonality({
          id: editingPersonality.id,
          name: personalityForm.name.trim(),
          prompt: personalityForm.prompt.trim()
        });
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar personalidade:', error);
    }
  };

  const handleDeletePersonality = async (personalityId: string, isHard = false) => {
    try {
      if (isHard) {
        await hardDeletePersonality(personalityId);
      } else {
        await deletePersonality(personalityId);
      }
      
      // Se a personalidade deletada estava ativa, voltar para default
      if (selectedPersonality === personalityId) {
        await setPersonality('default-assistant');
      }
    } catch (error) {
      console.error('Erro ao deletar personalidade:', error);
    }
  };

  const handleDuplicatePersonality = (personality: any) => {
    setModalMode('create');
    setEditingPersonality(null);
    setPersonalityForm({
      name: `${personality.name} (Cópia)`,
      prompt: personality.prompt
    });
    setIsModalOpen(true);
  };

  const handleTestPersonality = async (personalityId: string) => {
    if (!selectedStudent) {
      toast({
        title: "Selecione um aluno",
        description: "Escolha um aluno para testar a personalidade.",
        variant: "destructive"
      });
      return;
    }

    setTestingPersonalityId(personalityId);
    
    // Temporariamente mudar a personalidade para teste
    const originalPersonality = selectedPersonality;
    await setPersonality(personalityId);
    
    // Simular uma pergunta de teste
    setTestMessage('Olá! Como você pode me ajudar com os estudos?');
    
    // Executar teste
    setTimeout(async () => {
      await testAI();
      // Voltar à personalidade original
      await setPersonality(originalPersonality);
      setTestingPersonalityId(null);
    }, 100);
  };

  // 📸 NOVO: Funções para OCR
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas imagens",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo: 5MB",
        variant: "destructive",
      });
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage({
        file,
        preview: e.target?.result as string,
        name: file.name
      });
      setOcrResults(null); // Reset resultados anteriores
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  }, [toast]);

  const processOCR = useCallback(async () => {
    if (!uploadedImage) return;

    setIsProcessingOCR(true);
    try {
      // Converter imagem para base64
      const base64Data = uploadedImage.preview.split(',')[1];

      const { data, error } = await supabase.functions.invoke('ocr-vision-processor', {
        body: {
          imageBase64: base64Data,
          extractType: 'text',
          model: 'qwen/qwen3-vl-235b-a22b-instruct' // 🚀 Usar Qwen VL 235B Vision (Instruct) via OpenRouter
        }
      });

      if (error) throw error;

      if (data.success) {
        setOcrResults({
          extractedText: data.extractedText,
          stats: data.stats
        });

        toast({
          title: "✅ OCR Completo!",
          description: `${data.stats?.charactersExtracted} caracteres extraídos`,
        });

        // Adicionar mensagem ao chat
        addToConversationHistory('user', `📷 Imagem: ${uploadedImage.name}`, selectedStudent);
        addToConversationHistory('assistant', `📝 Texto extraído: ${data.extractedText}`, selectedStudent);

      } else {
        throw new Error(data.error || 'Falha no processamento OCR');
      }

    } catch (error: any) {
      console.error('Erro OCR:', error);
      toast({
        title: "❌ Erro no OCR",
        description: error.message || 'Falha ao processar imagem',
        variant: "destructive",
      });
    } finally {
      setIsProcessingOCR(false);
    }
  }, [uploadedImage, selectedStudent, toast]);

  // Loading state
  if (personalitiesLoading || preferencesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Bot className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (personalitiesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-red-600">Erro ao carregar personalidades: {personalitiesError.message}</p>
        </div>
      </div>
    );
  }

  // Get personality data
  const selectedPersonalityData = personalities.find(p => p.id === selectedPersonality);

  return (
    <>
      <Header title="Configuração Global do Bot" subtitle="Personalidade única compartilhada por todos os administradores" />
      <main className="flex-1 overflow-y-auto p-2">
        <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Configuração Global do Bot</h1>
                  <p className="text-muted-foreground">
                    Personalidade única compartilhada por todos os administradores
                  </p>
                </div>
              </div>

              <Tabs defaultValue="ai-model" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="ai-model" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Modelo IA
                  </TabsTrigger>
                  <TabsTrigger value="personality" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Personalidade Global
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Simulador de Chat
                  </TabsTrigger>
                  <TabsTrigger value="contexts" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Contextos Hierárquicos
                  </TabsTrigger>
                  <TabsTrigger value="status" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Status do Sistema
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-model" className="space-y-6">
                  <AIModelSelector
                    currentModel={selectedModel}
                    onModelChange={handleAIModelChange}
                    disabled={aiModelLoading || isSavingAIModel || isSyncingAIModel}
                  />

                  {(isSavingAIModel || isSyncingAIModel) && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Bot className="h-4 w-4 animate-spin" />
                      {isSavingAIModel ? 'Salvando modelo...' : 'Sincronizando modelo...'}
                    </div>
                  )}

                  {!currentSchool && (
                    <Alert>
                      <AlertDescription>
                        Para salvar no banco, acesse esta configuração no modo Escola. Sem uma escola ativa, a seleção é apenas local.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Informações adicionais sobre o modelo selecionado */}
                  {isUsingPaidModel && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Modelo Pago Selecionado:</strong> {currentModelConfig?.name}
                        <br />
                        Este modelo tem custos associados ao uso. Monitore os custos na sua conta OpenRouter.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!aiModelLoading && currentModelConfig && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Estado do Modelo IA</CardTitle>
                        <CardDescription>
                          Configuração atual do sistema de inteligência artificial
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="font-medium">Modelo Ativo:</span>
                            <Badge variant={currentModelConfig.status === 'production' ? 'default' : 'secondary'}>
                              {currentModelConfig.name}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Custo:</span>
                            <Badge variant={currentModelConfig.cost === 'free' ? 'outline' : 'secondary'}>
                              {currentModelConfig.cost === 'free' ? 'Gratuito' : 'Pago'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Status:</span>
                            <Badge variant={currentModelConfig.status === 'production' ? 'default' : 'secondary'}>
                              {currentModelConfig.status === 'production' ? 'Produção' : 'Preview'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="personality" className="space-y-6">
                  <Alert>
                    <Globe className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sistema de Preferências Globais:</strong> Esta personalidade será usada por todos os administradores.
                      Qualquer alteração aqui afeta imediatamente todos os outros usuários admin.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Personalidade Ativa do Sistema
                      </CardTitle>
                      <CardDescription>
                        Selecione a personalidade que será usada por todos os administradores
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium">Personalidade Global:</label>
                        <Select value={selectedPersonality} onValueChange={handlePersonalityChange} disabled={isSaving}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma personalidade..." />
                          </SelectTrigger>
                          <SelectContent>
                            {personalities.map((personality) => (
                              <SelectItem key={personality.id} value={personality.id}>
                                <div className="flex items-center gap-2">
                                  <Bot className="h-4 w-4" />
                                  {personality.name}
                                  {selectedPersonality === personality.id && (
                                    <Badge variant="secondary" className="ml-1">
                                      Ativo
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {isSaving && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Bot className="h-4 w-4 animate-spin" />
                          Salvando preferência global...
                        </div>
                      )}

                      {selectedPersonalityData && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                          <h4 className="font-semibold mb-2">{selectedPersonalityData.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {selectedPersonalityData.prompt || 'Personalidade customizada'}
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {selectedPersonality === 'default-assistant' ? 'Padrão' : 'Personalizada'}
                            </Badge>
                            <Badge variant="outline">
                              Criado: {new Date(selectedPersonalityData.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 🎭 NOVA SEÇÃO: GESTÃO DE PERSONALIDADES */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Gestão de Personalidades
                          </CardTitle>
                          <CardDescription>
                            Crie, edite e gerencie suas personalidades personalizadas
                          </CardDescription>
                        </div>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={openCreateModal} className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Nova Personalidade
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                {modalMode === 'create' ? 'Criar Nova Personalidade' : 'Editar Personalidade'}
                              </DialogTitle>
                              <DialogDescription>
                                {modalMode === 'create' 
                                  ? 'Defina o nome e comportamento da nova personalidade.'
                                  : 'Modifique o nome e comportamento da personalidade.'
                                }
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Nome da Personalidade:</label>
                                <Input
                                  value={personalityForm.name}
                                  onChange={(e) => setPersonalityForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Ex: Professor Animado, Tutor Paciente..."
                                  className="mt-1"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Prompt/Comportamento:</label>
                                <Textarea
                                  value={personalityForm.prompt}
                                  onChange={(e) => setPersonalityForm(prev => ({ ...prev, prompt: e.target.value }))}
                                  placeholder="Descreva como esta personalidade deve se comportar, falar e responder aos alunos..."
                                  className="mt-1 min-h-[150px]"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Dica: Seja específico sobre tom, estilo e abordagem educativa
                                </p>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={closeModal}>
                                Cancelar
                              </Button>
                              <Button 
                                onClick={handleSavePersonality}
                                disabled={isCreating || isUpdating || !personalityForm.name.trim() || !personalityForm.prompt.trim()}
                              >
                                {isCreating || isUpdating ? (
                                  <Bot className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                {modalMode === 'create' ? 'Criar' : 'Salvar'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {personalities.map((personality) => (
                          <div 
                            key={personality.id} 
                            className={`border rounded-lg p-4 ${
                              selectedPersonality === personality.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{personality.name}</h4>
                                  {selectedPersonality === personality.id && (
                                    <Badge variant="default" className="text-xs">
                                      Ativa
                                    </Badge>
                                  )}
                                  {personality.is_default && (
                                    <Badge variant="outline" className="text-xs">
                                      Padrão
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {personality.prompt}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Criado: {new Date(personality.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-1 ml-4">
                                {/* Teste Rápido */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestPersonality(personality.id)}
                                  disabled={testingPersonalityId === personality.id || !selectedStudent}
                                  title="Teste rápido"
                                >
                                  {testingPersonalityId === personality.id ? (
                                    <Bot className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <TestTube className="h-3 w-3" />
                                  )}
                                </Button>

                                {/* Duplicar */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDuplicatePersonality(personality)}
                                  title="Duplicar"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>

                                {/* Editar */}
                                {!personality.is_default && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditModal(personality)}
                                    title="Editar"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}

                                {/* Deletar */}
                                {!personality.is_default && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        title="Deletar"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Deletar Personalidade</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja deletar "{personality.name}"? 
                                          Esta ação pode ser desfeita (soft delete).
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeletePersonality(personality.id, false)}
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={isDeleting}
                                        >
                                          {isDeleting ? (
                                            <Bot className="h-4 w-4 animate-spin mr-2" />
                                          ) : null}
                                          Deletar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {personalities.length === 1 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Apenas a personalidade padrão disponível.</p>
                            <p className="text-sm">Crie sua primeira personalidade customizada!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="chat" className="space-y-6">
                  <Alert>
                    <MessageSquare className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Simulador de Chat WhatsApp:</strong> Teste todas as funcionalidades da IA com contextos hierárquicos em tempo real.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Configurações do Teste
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Aluno para Teste:</label>
                          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um aluno..." />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {student.name} - {student.classes?.name || 'N/A'}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Personalidade Ativa:</label>
                          <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                            <Bot className="h-4 w-4 text-primary" />
                            <span className="text-sm">
                              {selectedPersonalityData?.name || 'Assistente Padrão'}
                            </span>
                            {isSaving && <Bot className="h-3 w-3 animate-spin" />}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 🎯 PAINEL DE CONTEXTOS ATIVOS - NOVO */}
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                        Contextos Ativos da IA
                      </CardTitle>
                      <CardDescription>
                        Estes contextos são sempre carregados para personalizar as respostas da IA
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        
                        {/* Personalidade */}
                        <div className={`p-3 rounded-lg border-2 ${selectedPersonality !== 'default-assistant' ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🎭</span>
                            <span className="font-medium text-sm">Personalidade IA</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedPersonality !== 'default-assistant' 
                              ? personalities.find(p => p.id === selectedPersonality)?.name || 'Personalizada'
                              : 'Padrão'
                            }
                          </div>
                          <Badge variant={selectedPersonality !== 'default-assistant' ? 'default' : 'secondary'} className="mt-1 text-xs">
                            {selectedPersonality !== 'default-assistant' ? 'Customizada' : 'Padrão'}
                          </Badge>
                        </div>
                        
                        {/* Contexto Escola */}
                        <div className="p-3 rounded-lg border-2 bg-orange-50 border-orange-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🏫</span>
                            <span className="font-medium text-sm">Contexto Escola</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedStudent ? students.find(s => s.id === selectedStudent)?.schools?.name || 'Não definido' : 'Selecione um aluno'}
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs border-orange-300">
                            Sempre Ativo
                          </Badge>
                        </div>
                        
                        {/* Contexto Turma */}
                        <div className="p-3 rounded-lg border-2 bg-green-50 border-green-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📚</span>
                            <span className="font-medium text-sm">Contexto Turma</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedStudent 
                              ? students.find(s => s.id === selectedStudent)?.classes?.name 
                                ? `${students.find(s => s.id === selectedStudent)?.classes?.name} (${students.find(s => s.id === selectedStudent)?.classes?.grade})`
                                : 'Não definido'
                              : 'Selecione um aluno'
                            }
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs border-green-300">
                            Sempre Ativo
                          </Badge>
                        </div>
                        
                        {/* Contexto Aluno */}
                        <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">👨‍🎓</span>
                            <span className="font-medium text-sm">Necessidades Especiais</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedStudent 
                              ? students.find(s => s.id === selectedStudent)?.special_context 
                                ? 'Contexto definido'
                                : 'Nenhum contexto especial'
                              : 'Selecione um aluno'
                            }
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs border-blue-300">
                            Sempre Ativo
                          </Badge>
                        </div>
                        
                        {/* Histórico Chat */}
                        <div className="p-3 rounded-lg border-2 bg-yellow-50 border-yellow-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💬</span>
                            <span className="font-medium text-sm">Histórico Chat</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {conversationHistory.length > 0 
                              ? `${conversationHistory.length} mensagens`
                              : 'Nenhum histórico'
                            }
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs border-yellow-300">
                            Sempre Ativo
                          </Badge>
                        </div>
                        
                        {/* Conteúdos Educacionais - INTELIGENTE */}
                        <div className="p-3 rounded-lg border-2 bg-teal-50 border-teal-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📖</span>
                            <span className="font-medium text-sm">Conteúdos Educacionais</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Carregados quando necessário
                          </div>
                          <Badge variant="default" className="mt-1 text-xs bg-teal-600 text-white">
                            🤖 Inteligente
                          </Badge>
                        </div>
                        
                      </div>
                      
                      <div className="mt-4 p-3 bg-indigo-100 rounded-lg border border-indigo-200">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5" />
                          <div className="text-xs text-indigo-800">
                            <div className="font-medium mb-1">✨ Nova Funcionalidade: Carregamento Inteligente</div>
                            <div>Os <strong>conteúdos educacionais</strong> agora são carregados apenas quando a IA determina que são necessários para responder à pergunta específica, otimizando performance e relevância.</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedStudent && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-green-600" />
                          Chat WhatsApp Simulado
                          <Badge variant="outline" className="ml-2">
                            {conversationHistory.filter(msg => msg.studentId === selectedStudent).length} mensagens
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Interface que simula exatamente o comportamento do WhatsApp com todos os contextos hierárquicos
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-lg bg-gradient-to-b from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 h-96 overflow-y-auto space-y-3">
                          {conversationHistory.filter(msg => msg.studentId === selectedStudent).length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Nenhuma mensagem ainda</p>
                              <p className="text-sm">Digite uma mensagem abaixo para começar</p>
                            </div>
                          ) : (
                            conversationHistory
                              .filter(msg => msg.studentId === selectedStudent)
                              .map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    msg.role === 'user' 
                                      ? 'bg-green-500 text-white ml-auto' 
                                      : 'bg-background dark:bg-card border shadow-sm'
                                  }`}>
                                    <div className="text-sm">
                                      {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                                          <Bot className="h-3 w-3" />
                                          {selectedPersonalityData?.name || 'Assistente Padrão'}
                                        </div>
                                      )}
                                      <div dangerouslySetInnerHTML={{ 
                                        __html: formatWhatsAppMessage(msg.content) 
                                      }} />
                                      <div className={`text-xs mt-1 ${
                                        msg.role === 'user' ? 'text-green-100' : 'text-muted-foreground'
                                      }`}>
                                        {new Date(msg.timestamp).toLocaleTimeString('pt-PT', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                          )}

                          {isTestingAI && (
                            <div className="flex justify-start mb-2">
                              <div className="bg-background dark:bg-card border shadow-sm px-4 py-2 rounded-lg max-w-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Bot className="h-4 w-4 animate-pulse" />
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 mt-4">
                          {/* 📸 OCR Image Upload Area */}
                          {uploadedImage && (
                            <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">📸 Imagem para OCR</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setUploadedImage(null);
                                    setOcrResults(null);
                                  }}
                                >
                                  ❌
                                </Button>
                              </div>
                              <div className="flex gap-3">
                                <img 
                                  src={uploadedImage.preview} 
                                  alt="Preview" 
                                  className="w-20 h-20 object-cover rounded border"
                                />
                                <div className="flex-1 space-y-2">
                                  <p className="text-sm text-muted-foreground">{uploadedImage.name}</p>
                                  {!ocrResults && (
                                    <Button 
                                      size="sm" 
                                      onClick={processOCR}
                                      disabled={isProcessingOCR}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      {isProcessingOCR ? (
                                        <span className="flex items-center gap-2">
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          Processando OCR...
                                        </span>
                                      ) : (
                                        '🔍 Processar OCR'
                                      )}
                                    </Button>
                                  )}
                                  {ocrResults && (
                                    <div className="text-sm">
                                      <span className="font-medium text-green-600">✅ OCR Completo!</span>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {ocrResults.stats?.charactersExtracted} caracteres extraídos em {ocrResults.stats?.processingTime}ms
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {ocrResults && (
                                <div className="mt-3 p-2 bg-card rounded border">
                                  <p className="text-xs text-muted-foreground mb-1">Texto extraído:</p>
                                  <p className="text-sm max-h-20 overflow-y-auto">{ocrResults.extractedText}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🎛️ Seleção de modo de visão 1/2/3 quando há imagem */}
                          {uploadedImage && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Análise da imagem:</span>
                              <Button
                                size="sm"
                                variant={visionMode === 'instruct' ? 'default' : 'outline'}
                                onClick={() => setVisionMode('instruct')}
                                disabled={isTestingAI || !selectedStudent}
                                title="1) Resposta rápida (Instruct)"
                              >
                                1) Rápida
                              </Button>
                              <Button
                                size="sm"
                                variant={visionMode === 'thinking' ? 'default' : 'outline'}
                                onClick={() => setVisionMode('thinking')}
                                disabled={isTestingAI || !selectedStudent}
                                title="2) Raciocínio detalhado (Thinking)"
                              >
                                2) Detalhada
                              </Button>
                              <Button
                                size="sm"
                                variant={visionMode === 'none' ? 'default' : 'outline'}
                                onClick={() => setVisionMode('none')}
                                disabled={isTestingAI || !selectedStudent}
                                title="3) Não analisar"
                              >
                                3) Não analisar
                              </Button>
                            </div>
                          )}

                          <div className="flex items-end gap-2 p-3 border rounded-lg bg-muted/30">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              className="hidden"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isTestingAI || !selectedStudent}
                              className="px-2"
                              title="Enviar imagem para OCR"
                            >
                              📷
                            </Button>
                            <Textarea
                              value={testMessage}
                              onChange={(e) => setTestMessage(e.target.value)}
                              placeholder={uploadedImage && ocrResults ? "Pergunte sobre a imagem ou envie o texto extraído..." : "Digite uma mensagem..."}
                              className="flex-1 min-h-[40px] max-h-32 resize-none"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  testAI();
                                }
                              }}
                              disabled={isTestingAI || !selectedStudent}
                            />
                            {uploadedImage && ocrResults && (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTestMessage(ocrResults.extractedText);
                                }}
                                disabled={isTestingAI || !selectedStudent}
                                className="px-2"
                                title="Usar texto extraído"
                              >
                                📝
                              </Button>
                            )}
                            <Button 
                              onClick={testAI} 
                              disabled={isTestingAI || (!testMessage.trim() && !(uploadedImage && visionMode !== 'none')) || !selectedStudent}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isTestingAI ? (
                                <Bot className="h-4 w-4 animate-spin" />
                              ) : (
                                <span>📤</span>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={clearConversationHistory}
                              disabled={conversationHistory.filter(msg => msg.studentId === selectedStudent).length === 0}
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>

                        {testResults && (
                          <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              {testResults.type === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              )}
                              <span className="font-medium">{testResults.message}</span>
                            </div>
                          
                            {testResults.type === 'success' && testResults.details && (
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-sm">
                                  <span className="font-medium">Tempo:</span> {testResults.details.processingTime}ms
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Modelo:</span> {testResults.details.conversationFlow?.aiModel || 'mistralai/mistral-7b-instruct'}
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Contextos:</span> {testResults.details.relevantContentCount} recursos
                                </div>
                              </div>
                            )}

                            {/* 🎯 NOVA SEÇÃO: Análise Inteligente */}
                            {testResults.contentAnalysis && (
                              <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-teal-800">🤖 Análise Inteligente</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Precisou de conteúdos:</span>
                                    <Badge variant={testResults.contentAnalysis.needsContent ? "default" : "secondary"} className="text-xs">
                                      {testResults.contentAnalysis.needsContent ? "✅ Sim" : "❌ Não"}
                                    </Badge>
                                  </div>
                                  {testResults.contentAnalysis.keywords && testResults.contentAnalysis.keywords.length > 0 && (
                                    <div>
                                      <span className="font-medium">Keywords:</span> {testResults.contentAnalysis.keywords.join(', ')}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">Raciocínio:</span> {testResults.contentAnalysis.reasoning}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Conteúdos carregados:</span>
                                    <Badge variant={testResults.contentAnalysis.contentLoaded ? "default" : "outline"} className="text-xs">
                                      {testResults.contentAnalysis.contentLoaded ? "✅ Sim" : "❌ Não"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mb-4">
                              <span className="text-sm font-medium mb-2 block">Contextos Utilizados:</span>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">🎭 Personalidade</Badge>
                                <Badge variant="outline" className="text-xs">🏫 Escola</Badge>
                                <Badge variant="outline" className="text-xs">📚 Turma</Badge>
                                <Badge variant="outline" className="text-xs">👨‍🎓 Aluno</Badge>
                                <Badge variant="outline" className="text-xs">💬 Histórico ({testResults.conversationContext?.messagesInHistory || 0})</Badge>
                                {testResults.contentAnalysis?.contentLoaded && (
                                  <Badge variant="default" className="text-xs bg-teal-600">📖 Conteúdos ({testResults.contentContext?.relatedContent || 0})</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!selectedStudent && (
                    <Card>
                      <CardContent className="text-center py-8">
                        <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Selecione um Aluno</h3>
                        <p className="text-muted-foreground">
                          Escolha um aluno nas configurações acima para acessar o simulador de chat
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="contexts" className="space-y-6">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Contextos Hierárquicos:</strong> Visualize como o sistema aplica os contextos educacionais de forma hierárquica.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Ordem de Aplicação dos Contextos Hierárquicos
                      </CardTitle>
                      <CardDescription>
                        O sistema aplica os contextos na seguinte ordem de prioridade
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">1º Prioridade</Badge>
                            <span className="font-semibold">Personalidade Ativa</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Atual:</strong> {selectedPersonalityData?.name || 'Não definida'}<br/>
                            <strong>Descrição:</strong> {selectedPersonalityData?.prompt || 'Prompt não disponível'}
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-green-100 dark:bg-green-900">2º Prioridade</Badge>
                            <span className="font-semibold">Contexto Específico do Aluno</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Informações pessoais e necessidades especiais do aluno (ex: autismo, dificuldades de aprendizagem)
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">3º Prioridade</Badge>
                            <span className="font-semibold">Contexto da Turma</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Informações gerais da turma, metodologia de ensino e nível educacional
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900">4º Prioridade</Badge>
                            <span className="font-semibold">Contexto da Escola</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Diretrizes gerais da instituição de ensino e filosofia educacional
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-gray-100 dark:bg-gray-900">5º Prioridade</Badge>
                            <span className="font-semibold">Conteúdo Educacional</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Recursos educacionais específicos relacionados à pergunta do aluno
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-semibold mb-2">Como Funciona:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• <strong>Contextos são combinados</strong> de forma hierárquica</li>
                          <li>• <strong>Prioridades mais altas</strong> sobrepõem-se às mais baixas</li>
                          <li>• <strong>IA adapta o estilo</strong> baseado na personalidade ativa</li>
                          <li>• <strong>Respostas personalizadas</strong> para cada aluno e situação</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="status" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Status das Configurações Globais
                      </CardTitle>
                      <CardDescription>
                        Visualize todas as preferências globais do sistema e métricas de uso
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="border rounded-lg p-4 bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Personalidade Ativa</h4>
                            <Badge variant="outline">active_personality</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Valor: <strong>{selectedPersonalityData?.name || 'Não encontrada'}</strong>
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Status: Ativo e sincronizado</span>
                            <span>Tipo: {selectedPersonalityData?.is_default ? 'Padrão' : 'Personalizada'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                            <div className="text-sm text-muted-foreground">Alunos Cadastrados</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{personalities.length}</div>
                            <div className="text-sm text-muted-foreground">Personalidades</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{conversationHistory.length}</div>
                            <div className="text-sm text-muted-foreground">Total Mensagens</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {new Set(conversationHistory.map(msg => msg.studentId)).size}
                            </div>
                            <div className="text-sm text-muted-foreground">Alunos Ativos</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
        </div>
      </main>
    </>
  );
}