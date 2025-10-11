import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  bucket: string;
  path?: string;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  path = '',
  onUploadComplete,
  onUploadError,
  maxSize = 5, // 5MB por defeito
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const generateFileName = (originalName: string) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomId}.${extension}`;
  };

  const uploadFile = async (file: File) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!acceptedTypes.includes(file.type)) {
      const error = `Tipo de arquivo não suportado. Aceitos: ${acceptedTypes.join(', ')}`;
      onUploadError?.(error);
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      const error = `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`;
      onUploadError?.(error);
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Gerar nome único para o arquivo
      const fileName = generateFileName(file.name);
      const filePath = path ? `${path}/${fileName}` : fileName;

      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onUploadComplete?.(publicUrl.publicUrl);
      setPreview(publicUrl.publicUrl);
      
      toast({
        title: "Upload concluído",
        description: "Imagem carregada com sucesso!"
      });

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      onUploadError?.(errorMessage);
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  }, []);

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className={`w-full ${className}`}>
      <Card className={`border-2 border-dashed transition-colors ${
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      } ${uploading ? 'pointer-events-none' : ''}`}>
        <CardContent className="p-6">
          <div
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="text-center"
          >
            {preview ? (
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="mx-auto max-h-48 rounded-lg object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={clearPreview}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {uploading ? 'A carregar...' : 'Arrasta uma imagem ou clica para selecionar'}
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, WEBP até {maxSize}MB
                  </p>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-gray-500">
                      {uploadProgress}% completo
                    </p>
                  </div>
                )}

                <input
                  type="file"
                  accept={acceptedTypes.join(',')}
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  id="image-upload"
                />
                
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={uploading}
                  className="mx-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Imagem
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageUpload; 