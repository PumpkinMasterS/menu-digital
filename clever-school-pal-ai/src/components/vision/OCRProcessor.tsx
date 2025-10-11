import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Camera, FileText, Table, FileCheck, Database, Image } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OCRStats {
  model: string;
  processingTime: number;
  extractType: string;
  charactersExtracted: number;
  tokensUsed: any;
  confidence: string;
}

interface OCRResult {
  success: boolean;
  extractedText: string | object;
  rawText: string;
  stats: OCRStats;
  timestamp: string;
}

const OCRProcessor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [model, setModel] = useState<'qwen/qwen3-vl-235b-a22b-instruct' | 'qwen/qwen3-vl-235b-a22b-thinking'>('qwen/qwen3-vl-235b-a22b-instruct');
  const [extractType, setExtractType] = useState<'text' | 'structured' | 'table' | 'form' | 'document'>('text');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTypes = {
    text: { icon: FileText, label: 'Texto Simples', description: 'Extrai todo o texto da imagem' },
    structured: { icon: Database, label: 'Dados Estruturados', description: 'Organiza informações em JSON' },
    table: { icon: Table, label: 'Tabelas', description: 'Extrai dados de tabelas' },
    form: { icon: FileCheck, label: 'Formulários', description: 'Extrai campos e valores' },
    document: { icon: FileText, label: 'Documento', description: 'Analisa estrutura completa' }
  };

  const models = {
    'qwen/qwen3-vl-235b-a22b-instruct': {
      name: 'Qwen VL 235B Instruct',
      speed: 'rápido',
      cost: 'custo equilibrado',
      context: 'grande contexto',
      description: 'Respostas diretas, ideal para OCR simples e formulários'
    },
    'qwen/qwen3-vl-235b-a22b-thinking': {
      name: 'Qwen VL 235B Thinking',
      speed: 'moderado',
      cost: 'mais caro',
      context: 'grande contexto',
      description: 'Raciocínio passo a passo, melhor para casos complexos'
    }
  } as const;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor selecione um arquivo de imagem",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    if (!selectedFile) {
      toast({
        title: "Erro",
        description: "Selecione uma imagem primeiro",
        variant: "destructive"
      });
      return;
    }

    // Validações de tipo e tamanho (UI mostra até 10MB)
    const allowedTypes = new Set([
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
    ]);
    if (!allowedTypes.has(selectedFile.type)) {
      toast({ title: 'Tipo não suportado', description: 'Use JPG, PNG, WebP, HEIC/HEIF', variant: 'destructive' });
      return;
    }
    const maxBytes = 10 * 1024 * 1024; // 10MB (UI)
    if (selectedFile.size > maxBytes) {
      toast({ title: 'Arquivo grande', description: 'Tamanho máximo 10MB', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    const startedAt = Date.now();

    try {
      // Obter sessão (para policies do Storage e invoke com JWT)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Construir caminho no bucket tmp-ocr
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, '0');
      const d = String(now.getUTCDate()).padStart(2, '0');
      const uuid = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const ext = selectedFile.name.split('.').pop() || 'png';
      const path = `web/${session.user.id}/${y}/${m}/${d}/${uuid}.${ext}`;

      // Upload direto do browser
      const uploadRes = await supabase.storage
        .from('tmp-ocr')
        .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });

      if (uploadRes.error) {
        throw new Error(`Erro no upload: ${uploadRes.error.message}`);
      }

      // Gerar URL assinada (5 min)
      const signed = await supabase.storage
        .from('tmp-ocr')
        .createSignedUrl(path, 60 * 5);

      if (signed.error || !signed.data?.signedUrl) {
        throw new Error(`Erro ao criar URL assinada: ${signed.error?.message || 'desconhecido'}`);
      }

      const signedUrl = signed.data.signedUrl;

      // Compor pergunta a partir de extractType + prompt
      const defaultPrompts: Record<typeof extractType, string> = {
        text: 'Extrai todo o texto da imagem. Não invente conteúdo.',
        structured: 'Extrai dados em JSON com chaves claras. Não invente conteúdo.',
        table: 'Extrai as tabelas presentes como arrays de objetos. Não invente conteúdo.',
        form: 'Extrai campos e valores como pares chave-valor. Não invente conteúdo.',
        document: 'Analisa a estrutura do documento e extrai conteúdo relevante. Não invente conteúdo.'
      } as const;

      const question = (customPrompt?.trim())
        ? customPrompt.trim()
        : `${defaultPrompts[extractType]} Responda em Português.`;

      // Invocar Edge Function unificada
      const { data, error } = await supabase.functions.invoke('humanized-ai-tutor', {
        body: {
          platform: 'web',
          messageType: 'image',
          imageUrl: signedUrl,
          visionModel: model,
          studentId: session.user.id,
          question
        }
      });

      if (error) {
        throw error;
      }

      const elapsed = Date.now() - startedAt;
      const answerText = (typeof data?.answer === 'string') ? data.answer : JSON.stringify(data?.answer ?? '');

      const mappedResult: OCRResult = {
        success: Boolean(data?.canRespond) && Boolean(answerText),
        extractedText: answerText,
        rawText: answerText,
        stats: {
          model: data?.modelUsed || model,
          processingTime: elapsed,
          extractType,
          charactersExtracted: answerText.length,
          tokensUsed: data?.usage ?? '-',
          confidence: '—'
        },
        timestamp: new Date().toISOString()
      };

      setResult(mappedResult);
      toast({
        title: mappedResult.success ? 'OCR Processado!' : 'Sem resposta',
        description: `${mappedResult.stats.charactersExtracted} caracteres em ${mappedResult.stats.processingTime}ms`
      });
    } catch (err: any) {
      console.error('Erro no OCR multimodal:', err);
      toast({
        title: 'Erro no OCR',
        description: err?.message || 'Falha ao processar imagem',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Removido bloco legado de OCR inline (base64 + ocr-vision-processor) que estava fora de função e quebrava a build.


  const formatResult = (result: string | object): string => {
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return result;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Processador OCR com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Modelo de IA</label>
              <Select value={model} onValueChange={(value: any) => setModel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(models).map(([key, modelInfo]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{modelInfo.name}</span>
                        <span className="text-xs text-muted-foreground">{modelInfo.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 text-xs text-muted-foreground">
                <div>⚡ {models[model].speed}</div>
                <div>💰 {models[model].cost}</div>
                <div>📄 {models[model].context}</div>
              </div>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setIsVisionModalOpen(true)}>Detalhes e avisos</Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Extração</label>
              <Select value={extractType} onValueChange={(value: any) => setExtractType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(extractTypes).map(([key, typeInfo]) => {
                    const IconComponent = typeInfo.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{typeInfo.label}</span>
                            <span className="text-xs text-muted-foreground">{typeInfo.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prompt Personalizado */}
          <div>
            <label className="text-sm font-medium mb-2 block">Prompt Personalizado (Opcional)</label>
            <Textarea
              placeholder="Descreva o que quer extrair da imagem..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Upload de Imagem */}
          <div>
            <label className="text-sm font-medium mb-2 block">Imagem</label>
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="space-y-4">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-h-64 mx-auto rounded-lg shadow-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    {selectedFile?.name} ({(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Clique para selecionar imagem</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG ou WebP até 10MB</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Botão de Processar */}
          <Button 
            onClick={processOCR}
            disabled={!selectedFile || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando OCR...
              </>
            ) : (
              <>
                <Image className="h-4 w-4 mr-2" />
                Processar OCR
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modal de detalhes do modelo de visão */}
      <Dialog open={isVisionModalOpen} onOpenChange={setIsVisionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modelos de Visão Qwen (VL 235B)</DialogTitle>
            <DialogDescription>
              • Instruct: indicado para OCR rápido e respostas diretas.<br/>
              • Thinking: raciocínio passo a passo para documentos complexos; pode ser mais lento e custar mais.<br/>
              • Dica: para OCR e análises básicas, prefira Instruct; use Thinking apenas quando precisar de explicações aprofundadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground mt-2">
            <div>
              As imagens são processadas via função Edge e apenas URLs assinadas temporárias são enviadas ao modelo de visão.
            </div>
            <div>
              O contexto é grande em ambos os modelos; escolha conforme necessidade de velocidade vs. profundidade de raciocínio.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVisionModalOpen(false)}>Fechar</Button>
            <Button onClick={() => setIsVisionModalOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resultado */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultado da Extração</span>
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "Sucesso" : "Erro"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.stats.charactersExtracted}</div>
                <div className="text-xs text-muted-foreground">Caracteres</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.stats.processingTime}ms</div>
                <div className="text-xs text-muted-foreground">Tempo</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.stats.confidence}</div>
                <div className="text-xs text-muted-foreground">Confiança</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.stats.model.split('-')[1]}</div>
                <div className="text-xs text-muted-foreground">Modelo</div>
              </div>
            </div>

            {/* Texto Extraído */}
            <div>
              <label className="text-sm font-medium mb-2 block">Texto Extraído</label>
              <Textarea
                value={formatResult(result.extractedText)}
                readOnly
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {/* Copiar Resultado */}
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(formatResult(result.extractedText));
                toast({ title: "Copiado!", description: "Texto copiado para a área de transferência" });
              }}
              variant="outline"
              className="w-full"
            >
              Copiar Resultado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OCRProcessor;