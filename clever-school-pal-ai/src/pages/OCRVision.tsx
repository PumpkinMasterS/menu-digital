import React from 'react';
import { Helmet } from 'react-helmet-async';
import OCRProcessor from '@/components/vision/OCRProcessor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Zap, DollarSign, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Add imports for admin vision model menu
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useGlobalPreferences } from '@/hooks/useGlobalPreferences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const OCRVision: React.FC = () => {
  // Admin menu state for default vision model (Discord/WhatsApp)
  const { isAdminMode } = useApp();
  const { getPreference, setPreference } = useGlobalPreferences();
  const [visionModel, setVisionModel] = useState<string>(
    getPreference('vision_ai_model', 'qwen/qwen3-vl-235b-a22b-instruct')
  );
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  useEffect(() => {
    setPreference('vision_ai_model', visionModel);
  }, [visionModel, setPreference]);

  return (
    <>
      <Helmet>
        <title>OCR Vision - Processamento Inteligente de Imagens</title>
        <meta name="description" content="Extraia texto e dados de imagens usando IA multimodal via OpenRouter (Qwen VL 235B Vision)" />
      </Helmet>

      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            OCR Vision
            <Badge variant="secondary" className="ml-3">
              Powered by OpenRouter
            </Badge>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Extraia texto, dados de tabelas, formulários e documentos usando IA multimodal de última geração
          </p>
          <div className="max-w-2xl mx-auto">
            <Alert>
              <AlertTitle>Aviso sobre o modo Thinking</AlertTitle>
              <AlertDescription>
                Nota: o modo Thinking pode aumentar custos e tempo de resposta. Use quando precisar de raciocínio mais profundo.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Eye className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Visão Avançada</h3>
              <p className="text-sm text-muted-foreground">
                Qwen VL 235B Vision (multimodal) com capacidades avançadas de visão computacional via OpenRouter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ultra Rápido</h3>
              <p className="text-sm text-muted-foreground">
                Desempenho otimizado para OCR com Qwen Vision
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Custo Eficiente</h3>
              <p className="text-sm text-muted-foreground">
                Custo equilibrado com opções Instruct e Thinking via OpenRouter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seguro</h3>
              <p className="text-sm text-muted-foreground">
                Processamento via OpenRouter (Qwen VL 235B Vision)
              </p>
            </CardContent>
          </Card>
        </div>

{/* Seção duplicada removida: Casos de Uso e OCRProcessor foram mantidos apenas uma vez no topo da página */}
        {/* Admin: Modelo padrão de visão (Discord/WhatsApp) */}
        {isAdminMode && (
          <Card className="mt-4 border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                Admin: Modelo padrão de visão (Discord/WhatsApp)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Define o modelo de visão padrão que será usado pelo Discord e WhatsApp ao analisar imagens.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modelo de Visão</label>
                  <Select value={visionModel} onValueChange={setVisionModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleciona um modelo de visão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qwen/qwen3-vl-235b-a22b-instruct">
                        Qwen VL 235B Instruct — rápido, custo menor
                      </SelectItem>
                      <SelectItem value="qwen/qwen3-vl-235b-a22b-thinking">
                        Qwen VL 235B Thinking — raciocínio profundo, custo maior
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="mr-2">Atual</Badge>
                    <span>{visionModel.includes('thinking') ? 'Thinking (custo maior)' : 'Instruct (custo menor)'}</span>
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => setIsVisionModalOpen(true)}>Detalhes e avisos</Button>
                  <Button onClick={() => toast.success('Modelo atualizado', { description: 'Discord/WhatsApp utilizarão este modelo por padrão.' })}>Guardar</Button>
                </div>
              </div>

              <p className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded p-2">
                Nota: o modo Thinking pode aumentar custos e tempo de resposta. Use quando precisar de raciocínio mais profundo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Use Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Casos de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📄 Documentos</h4>
                <p className="text-sm text-muted-foreground">
                  Digitalização de contratos, relatórios, artigos e textos acadêmicos
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📊 Tabelas e Planilhas</h4>
                <p className="text-sm text-muted-foreground">
                  Extração de dados estruturados para análise e processamento
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📝 Formulários</h4>
                <p className="text-sm text-muted-foreground">
                  Digitalização automática de campos e valores preenchidos
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🎓 Material Educativo</h4>
                <p className="text-sm text-muted-foreground">
                  Conversão de livros, exercícios e anotações para texto digital
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📋 Receitas Médicas</h4>
                <p className="text-sm text-muted-foreground">
                  Digitalização de prescrições e documentos de saúde
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🏢 Documentos Empresariais</h4>
                <p className="text-sm text-muted-foreground">
                  Faturas, notas fiscais, relatórios e correspondências
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OCR Processor Component */}
        <OCRProcessor />

        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Modelos Disponíveis</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium">Qwen VL 235B Vision</div>
                    <div className="text-sm text-muted-foreground">
                      • Multimodal (imagem + texto)<br/>
                      • Excelente precisão em documentos e formulários<br/>
                      • Contexto amplo e respostas estruturadas<br/>
                      • Ótimo equilíbrio entre custo e qualidade via OpenRouter
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium">Outros modelos via OpenRouter</div>
                    <div className="text-sm text-muted-foreground">
                      • Suporte a múltiplos provedores e modelos com visão<br/>
                      • Escolha conforme custo/qualidade e disponibilidade<br/>
                      • Alternativas podem variar quanto a contexto e preço
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Tipos de Extração</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Texto</Badge>
                    <span>Extração simples de todo o texto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Estruturado</Badge>
                    <span>Organização em formato JSON</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Tabelas</Badge>
                    <span>Dados de tabelas em estrutura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Formulários</Badge>
                    <span>Campos e valores de forms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Documento</Badge>
                    <span>Análise completa com metadados</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Qwen VL 235B Vision (multimodal) com capacidades avançadas de visão computacional via OpenRouter
              </p>
              <p className="text-sm text-muted-foreground">
                Preços variam no OpenRouter conforme o modelo escolhido
              </p>
              <p className="text-sm text-muted-foreground">
                Processamento via OpenRouter (Qwen VL 235B Vision)
              </p>
              <div className="font-medium">Qwen VL 235B Vision</div>
              <div className="text-sm text-muted-foreground">
                • Multimodal (imagem + texto)<br/>
                • Ótimo para OCR de documentos e formulários<br/>
                • Contexto amplo e respostas estruturadas<br/>
                • Ótimo equilíbrio entre custo e qualidade
              </div>
              <div className="font-medium">Outros via OpenRouter</div>
              <div className="text-sm text-muted-foreground">
                • Suporte a múltiplos provedores e modelos<br/>
                • Escolha conforme custo/qualidade e disponibilidade<br/>
                • Alternativas com visão podem estar disponíveis
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalhes do modelo de visão */}
      {isAdminMode && (
        <Dialog open={isVisionModalOpen} onOpenChange={setIsVisionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modelo de Visão: Qwen VL 235B</DialogTitle>
              <DialogDescription>
                Escolha entre Instruct (rápido e econômico) ou Thinking (raciocínio profundo, custo maior).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>
                • Instruct: ideal para extração direta de texto e descrição de imagem com boa velocidade.
              </p>
              <p>
                • Thinking: melhor para problemas complexos (matemática, diagramas) com cadeias de raciocínio, porém pode ser mais lento e custoso.
              </p>
              <p className="text-blue-700 bg-blue-100 border border-blue-200 rounded p-2">
                Dica: mantenha Instruct como padrão e ative Thinking apenas quando necessário.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVisionModalOpen(false)}>Fechar</Button>
              <Button onClick={() => setIsVisionModalOpen(false)}>Entendi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </>
  );
};

export default OCRVision;