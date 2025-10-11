import { useState, useEffect } from 'react';

// Tipos e Configurações de Modelos de IA
export const AI_MODELS = {
  // Modelos normais (sem web search)
  DEEPSEEK_CHAT_FREE: 'deepseek/deepseek-chat-v3-0324:free',
  DEEPSEEK_CHAT: 'deepseek/deepseek-chat',
  GPT_5: 'openai/gpt-5',
  GPT_4O: 'openai/gpt-4o',
  GPT_4O_MINI: 'openai/gpt-4o-mini',
  LLAMA_33_70B: 'meta-llama/llama-3.3-70b-instruct:free',
  GEMINI_2_FLASH: 'google/gemini-2.0-flash-exp:free',
  QWEN3_NEXT_80B: 'qwen/qwen3-next-80b-a3b-instruct',
  CLAUDE_35_SONNET: 'anthropic/claude-3-5-sonnet',
  CLAUDE_35_HAIKU: 'anthropic/claude-3-5-haiku',
  
  // Modelos :online (com web search automático)
  GPT_4O_ONLINE: 'openai/gpt-4o:online',
  GPT_4O_MINI_ONLINE: 'openai/gpt-4o-mini:online',
  CLAUDE_35_SONNET_ONLINE: 'anthropic/claude-3-5-sonnet:online',
  CLAUDE_35_HAIKU_ONLINE: 'anthropic/claude-3-5-haiku:online',
  // DeepSeek 3.1 com web search automático
  DEEPSEEK_CHAT_ONLINE: 'deepseek/deepseek-chat:online',
} as const;

export type AIModelType = typeof AI_MODELS[keyof typeof AI_MODELS];

export interface AIModelConfig {
  id: AIModelType;
  name: string;
  provider: 'OpenRouter';
  description: string;
  strengths: string[];
  weaknesses: string[];
  cost: 'free' | 'paid';
  hasWebSearch?: boolean; // 🌐 Indica se tem web search automático
  isDefault?: boolean;
}

export const AI_MODEL_CONFIGS: Record<AIModelType, AIModelConfig> = {
  // 🆓 MODELOS GRATUITOS (sem web search)
  [AI_MODELS.LLAMA_33_70B]: {
    id: AI_MODELS.LLAMA_33_70B,
    name: 'Llama 3.3 70B (Gratuito)',
    provider: 'OpenRouter',
    description: 'Modelo econômico e eficiente, ideal para educação com excelente custo-benefício.',
    strengths: ['Gratuito no OpenRouter', 'Ótimo para educação', 'Boa performance geral', 'Econômico para uso intensivo'],
    weaknesses: ['Menos avançado que modelos premium', 'Sem web search automático'],
    cost: 'free',
    hasWebSearch: false,
    // isDefault removido: default mudou para DeepSeek 3.1 + Web Search
  },
  [AI_MODELS.DEEPSEEK_CHAT_FREE]: {
    id: AI_MODELS.DEEPSEEK_CHAT_FREE,
    name: 'DeepSeek V3 0324 (Gratuito)',
    provider: 'OpenRouter',
    description: 'Modelo avançado da DeepSeek com excelente raciocínio, versão gratuita no OpenRouter.',
    strengths: ['Gratuito no OpenRouter', 'Raciocínio avançado', 'Excelente para programação', '131K contexto', 'Mixture-of-experts'],
    weaknesses: ['Limitações diárias de uso', 'Versão anterior ao 3.1', 'Sem web search automático'],
    cost: 'free',
    hasWebSearch: false,
  },
  [AI_MODELS.GEMINI_2_FLASH]: {
    id: AI_MODELS.GEMINI_2_FLASH,
    name: 'Gemini 2.0 Flash (Gratuito)',
    provider: 'OpenRouter',
    description: 'Modelo rápido do Google com capacidades multimodais, gratuito no OpenRouter.',
    strengths: ['Gratuito no OpenRouter', 'Muito rápido', 'Capacidades multimodais', 'Boa para tarefas gerais'],
    weaknesses: ['Versão experimental', 'Pode ter limitações de uso', 'Sem web search automático'],
    cost: 'free',
    hasWebSearch: false,
  },

  // 💰 MODELOS PAGOS (sem web search)
  [AI_MODELS.GPT_4O]: {
    id: AI_MODELS.GPT_4O,
    name: 'GPT-4o',
    provider: 'OpenRouter',
    description: 'Modelo avançado da OpenAI com excelente performance em todas as tarefas.',
    strengths: ['Muito inteligente', 'Multimodal', 'Boa para tarefas complexas', 'Rápido'],
    weaknesses: ['Custo por token', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },
  [AI_MODELS.GPT_4O_MINI]: {
    id: AI_MODELS.GPT_4O_MINI,
    name: 'GPT-4o Mini',
    provider: 'OpenRouter',
    description: 'Versão mais econômica do GPT-4o, mantendo boa qualidade.',
    strengths: ['Mais barato que GPT-4o', 'Boa performance', 'Rápido', 'Multimodal'],
    weaknesses: ['Menos capaz que GPT-4o completo', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },
  [AI_MODELS.CLAUDE_35_SONNET]: {
    id: AI_MODELS.CLAUDE_35_SONNET,
    name: 'Claude 3.5 Sonnet',
    provider: 'OpenRouter',
    description: 'Modelo equilibrado da Anthropic com excelente raciocínio e escrita.',
    strengths: ['Excelente raciocínio', 'Boa escrita', 'Seguro', 'Ética avançada'],
    weaknesses: ['Custo por token', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },
  [AI_MODELS.CLAUDE_35_HAIKU]: {
    id: AI_MODELS.CLAUDE_35_HAIKU,
    name: 'Claude 3.5 Haiku',
    provider: 'OpenRouter',
    description: 'Versão mais rápida e econômica do Claude 3.5.',
    strengths: ['Muito rápido', 'Mais barato', 'Boa qualidade', 'Eficiente'],
    weaknesses: ['Menos capaz que Sonnet', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },
  [AI_MODELS.QWEN3_NEXT_80B]: {
    id: AI_MODELS.QWEN3_NEXT_80B,
    name: 'Qwen3 Next 80B A3B (Pago)',
    provider: 'OpenRouter',
    description: 'Modelo avançado da série Qwen3-Next otimizado para respostas rápidas e estáveis sem "thinking traces". Excelente para tarefas complexas de raciocínio, geração de código, QA de conhecimento e uso multilíngue.',
    strengths: ['Raciocínio complexo avançado', 'Excelente para programação', 'Suporte multilíngue robusto', 'Respostas rápidas e estáveis', 'Otimizado para alinhamento e formatação'],
    weaknesses: ['Custo por token', 'Modelo pago', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },
  [AI_MODELS.DEEPSEEK_CHAT]: {
    id: AI_MODELS.DEEPSEEK_CHAT,
    name: 'DeepSeek 3.1 Chat (Pago)',
    provider: 'OpenRouter',
    description: 'Versão mais recente da DeepSeek com melhorias no raciocínio e capacidades.',
    strengths: ['Raciocínio mais avançado', 'Versão mais recente', 'Melhor performance', 'Suporte a ferramentas'],
    weaknesses: ['Custo por token', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },
  [AI_MODELS.GPT_5]: {
    id: AI_MODELS.GPT_5,
    name: 'GPT-5',
    provider: 'OpenRouter',
    description: 'O mais avançado modelo da OpenAI, com capacidades superiores em todas as áreas.',
    strengths: ['Estado da arte', 'Excelente em todas as tarefas', 'Raciocínio superior', 'Capacidades multimodais'],
    weaknesses: ['Custo mais elevado', 'Pode ser excessivo para tarefas simples', 'Sem web search automático'],
    cost: 'paid',
    hasWebSearch: false,
  },

  // 🌐 MODELOS COM WEB SEARCH AUTOMÁTICO (:online)
  [AI_MODELS.GPT_4O_ONLINE]: {
    id: AI_MODELS.GPT_4O_ONLINE,
    name: 'GPT-4o + Web Search',
    provider: 'OpenRouter',
    description: 'GPT-4o com capacidade de pesquisa web automática para informações atualizadas.',
    strengths: ['Web search automático', 'Informações atualizadas', 'Muito inteligente', 'Multimodal', 'Sem configuração extra'],
    weaknesses: ['Custo adicional por pesquisa', 'Pode ser mais lento'],
    cost: 'paid',
    hasWebSearch: true,
  },
  [AI_MODELS.GPT_4O_MINI_ONLINE]: {
    id: AI_MODELS.GPT_4O_MINI_ONLINE,
    name: 'GPT-4o Mini + Web Search',
    provider: 'OpenRouter',
    description: 'GPT-4o Mini com capacidade de pesquisa web automática, mais econômico.',
    strengths: ['Web search automático', 'Mais barato que GPT-4o online', 'Informações atualizadas', 'Sem configuração extra'],
    weaknesses: ['Custo adicional por pesquisa', 'Menos capaz que GPT-4o completo'],
    cost: 'paid',
    hasWebSearch: true,
  },
  [AI_MODELS.CLAUDE_35_SONNET_ONLINE]: {
    id: AI_MODELS.CLAUDE_35_SONNET_ONLINE,
    name: 'Claude 3.5 Sonnet + Web Search',
    provider: 'OpenRouter',
    description: 'Claude 3.5 Sonnet com capacidade de pesquisa web automática.',
    strengths: ['Web search automático', 'Excelente raciocínio', 'Informações atualizadas', 'Ética avançada', 'Sem configuração extra'],
    weaknesses: ['Custo adicional por pesquisa', 'Pode ser mais lento'],
    cost: 'paid',
    hasWebSearch: true,
  },
  [AI_MODELS.CLAUDE_35_HAIKU_ONLINE]: {
    id: AI_MODELS.CLAUDE_35_HAIKU_ONLINE,
    name: 'Claude 3.5 Haiku + Web Search',
    provider: 'OpenRouter',
    description: 'Claude 3.5 Haiku com capacidade de pesquisa web automática, mais rápido e econômico.',
    strengths: ['Web search automático', 'Muito rápido', 'Mais barato', 'Informações atualizadas', 'Sem configuração extra'],
    weaknesses: ['Custo adicional por pesquisa', 'Menos capaz que Sonnet'],
    cost: 'paid',
    hasWebSearch: true,
  },
  // DeepSeek online como default
  [AI_MODELS.DEEPSEEK_CHAT_ONLINE]: {
    id: AI_MODELS.DEEPSEEK_CHAT_ONLINE,
    name: 'DeepSeek 3.1 + Web Search',
    provider: 'OpenRouter',
    description: 'DeepSeek com modo online para pesquisas web automáticas e menor alucinação.',
    strengths: ['Web search via :online', 'Bom raciocínio', 'Atualizado quando necessário'],
    weaknesses: ['Custo por pesquisa', 'Pode ser mais lento que offline'],
    cost: 'paid',
    hasWebSearch: true,
    isDefault: true,
  },
};

export function useAIModel() {
  // Sempre habilitado, já que só usamos OpenRouter
  const isModelEnabled = (_modelId: AIModelType) => true;

  const getInitialModel = (): AIModelType => {
    try {
      const savedModel = localStorage.getItem('selectedAIModel') as AIModelType;
      if (savedModel && AI_MODEL_CONFIGS[savedModel]) {
        return savedModel;
      }
    } catch (error) {
      console.warn('Erro ao ler selectedAIModel do localStorage:', error);
    }
    return AI_MODELS.DEEPSEEK_CHAT_ONLINE; // Padrão: DeepSeek com Web Search (:online)
  };

  const [selectedModel, setSelectedModel] = useState<AIModelType>(getInitialModel());
  const loading = false;

  useEffect(() => {
    const savedModel = localStorage.getItem('selectedAIModel') as AIModelType;
    if (savedModel && AI_MODEL_CONFIGS[savedModel] && savedModel !== selectedModel) {
      setSelectedModel(savedModel);
    }
  }, [selectedModel]);

  const selectModel = (modelId: AIModelType) => {
    setSelectedModel(modelId);
    localStorage.setItem('selectedAIModel', modelId);
  };

  const currentModelConfig = AI_MODEL_CONFIGS[selectedModel];

  const resetToDefault = () => {
    selectModel(AI_MODELS.DEEPSEEK_CHAT_ONLINE);
  };

  const switchModel = () => {
    const keys = Object.keys(AI_MODEL_CONFIGS) as AIModelType[];
    const idx = keys.indexOf(selectedModel);
    const next = keys[(idx + 1) % keys.length];
    selectModel(next);
  };

  return {
    selectedModel,
    selectModel,
    currentModelConfig,
    loading,
    resetToDefault,
    switchModel,
    availableModels: Object.values(AI_MODEL_CONFIGS),
    getModelForAPI: () => selectedModel,
    isUsingPaidModel: currentModelConfig?.cost === 'paid',
    isUsingDefaultModel: currentModelConfig?.isDefault,
  };
}