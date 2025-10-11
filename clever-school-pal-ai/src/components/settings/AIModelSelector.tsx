import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Brain, Zap, DollarSign, Clock, Globe } from 'lucide-react';
import { AI_MODEL_CONFIGS, AIModelType } from '../../hooks/useAIModel';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  status: 'production' | 'preview';
  performance: {
    speed: string;
    context: string;
    cost: string;
  };
  strengths: string[];
  issues?: string[];
  hasWebSearch?: boolean; // 🌐 Indica se tem web search automático
}

// Converter configurações do useAIModel para o formato do AIModelSelector
const AI_MODELS: AIModel[] = Object.values(AI_MODEL_CONFIGS).map(config => ({
  id: config.id,
  name: config.name,
  provider: config.provider,
  description: config.description,
  status: 'production' as const,
  performance: {
    speed: config.cost === 'free' ? 'alta' : 'muito alta',
    context: config.id.includes('llama') ? '128k tokens' : 
             config.id.includes('gemini') ? '1M tokens' :
             config.id.includes('deepseek') ? '64k tokens' : '200k tokens',
    cost: config.cost === 'free' ? 'Gratuito' : 'Pago'
  },
  strengths: config.strengths,
  issues: config.weaknesses || [],
  hasWebSearch: config.hasWebSearch || false // 🌐 Adicionar propriedade de web search
}));

interface AIModelSelectorProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function AIModelSelector({ 
  currentModel, 
  onModelChange, 
  disabled = false 
}: AIModelSelectorProps) {
  const selectedModel = AI_MODELS.find(model => model.id === currentModel) || AI_MODELS[0];
  const openRouterEnabled = (import.meta.env.VITE_OPENROUTER_ENABLED === 'true');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Modelo de IA
        </CardTitle>
        <CardDescription>
          Escolhe qual modelo de IA usar para as respostas educacionais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor Principal */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Modelo Ativo:</label>
          <Select
            value={currentModel}
            onValueChange={onModelChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleciona um modelo de IA..." />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  disabled={model.provider === 'OpenRouter' && !openRouterEnabled}
                >
                  <div className="flex items-center gap-2">
                    {model.hasWebSearch && (
                      <span className="text-blue-500 text-sm">🌐</span>
                    )}
                    <span>{model.name}</span>
                    {model.hasWebSearch && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">
                        <Globe className="h-3 w-3 mr-1" />
                        Web Search
                      </Badge>
                    )}
                    <Badge 
                      variant={model.status === 'production' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {model.status}
                    </Badge>
                    {model.provider === 'OpenRouter' && !openRouterEnabled && (
                      <Badge variant="destructive" className="text-xs">Configurar</Badge>
                    )}
                    {model.issues && model.issues.length === 0 && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        ✅ Sem problemas
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!openRouterEnabled && (
            <p className="text-xs text-muted-foreground">
              Modelos OpenRouter estão desabilitados. Para habilitar, defina VITE_OPENROUTER_ENABLED=true no .env e configure as credenciais no servidor.
            </p>
          )}
        </div>

        {/* Detalhes do Modelo Selecionado */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {selectedModel.hasWebSearch && (
                <span className="text-blue-500 text-lg">🌐</span>
              )}
              <h4 className="font-semibold">{selectedModel.name}</h4>
              {selectedModel.hasWebSearch && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">
                  <Globe className="h-3 w-3 mr-1" />
                  Web Search
                </Badge>
              )}
            </div>
            <Badge 
              variant={selectedModel.status === 'production' ? 'default' : 'secondary'}
            >
              {selectedModel.status}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {selectedModel.description}
          </p>

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3" />
              <span>{selectedModel.performance.speed}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{selectedModel.performance.context}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              <span>{selectedModel.performance.cost}</span>
            </div>
          </div>

          {/* Strengths */}
          <div className="space-y-1">
            <h5 className="text-xs font-medium text-green-600">✅ Pontos Fortes:</h5>
            <ul className="text-xs space-y-1">
              {selectedModel.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Issues */}
          {selectedModel.issues && selectedModel.issues.length > 0 && (
            <div className="space-y-1 mt-2">
              <h5 className="text-xs font-medium text-orange-600">⚠️ Problemas Conhecidos:</h5>
              <ul className="text-xs space-y-1">
                {selectedModel.issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Informação especial para modelos com web search */}
          {selectedModel.hasWebSearch && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <strong className="text-blue-700">🌐 WEB SEARCH AUTOMÁTICO:</strong>
              </div>
              <div className="text-blue-600 space-y-1">
                <div>• Este modelo pode pesquisar informações atualizadas na internet automaticamente</div>
                <div>• Ideal para perguntas sobre eventos recentes, notícias, preços, etc.</div>
                <div>• Custo adicional por pesquisa: ~$30-50 por 1000 requests (GPT-4o) ou $4 por 1000 resultados (Exa)</div>
              </div>
            </div>
          )}

          {/* Recomendação */}
          {selectedModel.id === 'meta-llama/llama-3.3-70b-instruct:free' && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <strong className="text-green-700">🎯 RECOMENDADO:</strong>
              <span className="text-green-600 ml-1">
                Llama 3.3 70B é o padrão gratuito e eficiente, ideal para educação.
              </span>
            </div>
          )}
        </div>

        {/* Comparação Rápida */}
        <div className="text-xs text-muted-foreground">
          <strong>💡 Dica:</strong> Llama 3.3 70B e Gemini 2.0 Flash são gratuitos e ideais para educação; 
          Modelos com <Globe className="h-3 w-3 inline mx-1" />Web Search fazem pesquisas automáticas na internet; 
          DeepSeek 3.1 oferece raciocínio avançado; GPT-5 é o mais avançado (custo maior).
        </div>
      </CardContent>
    </Card>
  );
}