import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Image, 
  Eye, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Info,
  Sparkles,
  Zap,
  FileImage
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedImageUploadProps {
  type: 'logo' | 'favicon' | 'banner';
  title: string;
  description: string;
  recommendedSize: string;
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading?: boolean;
  maxSize?: number; // em MB
  aspectRatio?: string; // e.g., "16:9", "1:1", "auto"
  allowedFormats?: string[];
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const AdvancedImageUpload: React.FC<AdvancedImageUploadProps> = ({
  type,
  title,
  description,
  recommendedSize,
  currentUrl,
  onUpload,
  onRemove,
  isUploading = false,
  maxSize = 5,
  _aspectRatio = 'auto',
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState<CompressionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configurações específicas por tipo
  const getTypeConfig = () => {
    switch (type) {
      case 'logo':
        return {
          icon: <FileImage className="w-6 h-6" />,
          color: 'from-blue-500 to-cyan-500',
          recommendations: ['SVG preferível para escalabilidade', 'Fundo transparente recomendado']
        };
      case 'favicon':
        return {
          icon: <Sparkles className="w-6 h-6" />,
          color: 'from-purple-500 to-pink-500',
          recommendations: ['16x16px ou 32x32px', 'ICO ou PNG recomendado']
        };
      case 'banner':
        return {
          icon: <Image className="w-6 h-6" />,
          color: 'from-green-500 to-teal-500',
          recommendations: ['Alta resolução recomendada', 'Proporção landscape ideal']
        };
      default:
        return {
          icon: <Upload className="w-6 h-6" />,
          color: 'from-gray-500 to-gray-600',
          recommendations: ['Siga as especificações recomendadas']
        };
    }
  };

  const config = getTypeConfig();

  // Função para comprimir imagem se necessário
  const compressImage = useCallback((file: File, quality: number = 0.8): Promise<{ file: File; stats: CompressionStats }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        // SVG e não-imagens não precisam de compressão
        resolve({ 
          file, 
          stats: { originalSize: file.size, compressedSize: file.size, compressionRatio: 0 }
        });
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular dimensões baseadas no tipo
        let { width, height } = img;
        let maxWidth: number, maxHeight: number;

        switch (type) {
          case 'logo':
            maxWidth = 800;
            maxHeight = 300;
            break;
          case 'favicon':
            maxWidth = 128;
            maxHeight = 128;
            break;
          case 'banner':
            maxWidth = 1920;
            maxHeight = 1080;
            break;
          default:
            maxWidth = 1200;
            maxHeight = 800;
        }

        // Redimensionar mantendo proporção
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar e comprimir
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name,
                { type: file.type }
              );
              
              const stats: CompressionStats = {
                originalSize: file.size,
                compressedSize: compressedFile.size,
                compressionRatio: ((file.size - compressedFile.size) / file.size) * 100
              };
              
              resolve({ file: compressedFile, stats });
            } else {
              resolve({ 
                file, 
                stats: { originalSize: file.size, compressedSize: file.size, compressionRatio: 0 }
              });
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, [type]);

  // Validação de arquivo
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Verificar tipo
    if (!allowedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `Formato não suportado. Use: ${allowedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`
      };
    }

    // Verificar tamanho
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `Arquivo muito grande. Máximo: ${maxSize}MB`
      };
    }

    return { valid: true };
  };

  // Manipular upload de arquivo
  const handleFileUpload = async (file: File) => {
    setError(null);
    setUploadProgress(0);

    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    try {
      // Mostrar preview
      const previewURL = URL.createObjectURL(file);
      setPreviewUrl(previewURL);

      // Comprimir se necessário
      setUploadProgress(25);
      const { file: processedFile, stats } = await compressImage(file);
      setCompressionStats(stats);
      
      setUploadProgress(50);

      // Fazer upload
      await onUpload(processedFile);
      
      setUploadProgress(100);
      
      // Limpar preview após sucesso
      setTimeout(() => {
        setPreviewUrl(null);
        setUploadProgress(0);
        setCompressionStats(null);
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro no upload');
      setPreviewUrl(null);
      setUploadProgress(0);
    }
  };

  // Eventos de drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
            <div className="text-white">{config.icon}</div>
          </div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Area */}
        {!currentUrl && !previewUrl && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
              isDragOver 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedFormats.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            <div className="space-y-3">
              <div className={`mx-auto w-12 h-12 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                <Upload className="w-6 h-6 text-white" />
              </div>
              
              {isDragOver ? (
                <p className="text-primary font-medium">Solte o arquivo aqui</p>
              ) : (
                <div>
                  <p className="font-medium text-gray-700 mb-1">
                    Arraste um arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-500">
                    {recommendedSize} • Máx. {maxSize}MB
                  </p>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm"
                disabled={isUploading}
                className="pointer-events-none"
              >
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processando...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Compression Stats */}
        {compressionStats && compressionStats.compressionRatio > 5 && (
          <Alert>
            <Zap className="w-4 h-4" />
            <AlertDescription>
              <strong>Otimização aplicada!</strong> Tamanho reduzido de {formatFileSize(compressionStats.originalSize)} 
              para {formatFileSize(compressionStats.compressedSize)} 
              ({compressionStats.compressionRatio.toFixed(1)}% menor)
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {(previewUrl || currentUrl) && (
          <div className="space-y-3">
            <div className="relative group">
              <img
                src={previewUrl || currentUrl}
                alt={`Preview ${type}`}
                className="w-full max-h-48 object-contain rounded-lg border bg-gray-50"
              />
              
              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => {
                  const url = previewUrl || currentUrl;
                  if (url && (url.startsWith('http') || url.startsWith('/'))) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}>
                  <Eye className="w-4 h-4" />
                </Button>
                {currentUrl && (
                  <Button size="sm" variant="destructive" onClick={onRemove} disabled={isUploading}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Informações do arquivo atual */}
            {currentUrl && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-700">Arquivo configurado</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Alterar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Recomendações */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Info className="w-4 h-4" />
            Recomendações
          </div>
          <div className="space-y-1">
            {config.recommendations.map((rec, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                {rec}
              </div>
            ))}
          </div>
        </div>

        {/* Especificações Técnicas */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Formatos</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {allowedFormats.map(format => (
                <Badge key={format} variant="secondary" className="text-xs">
                  {format.split('/')[1].toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tamanho</p>
            <p className="text-sm font-medium mt-1">Máx. {maxSize}MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 