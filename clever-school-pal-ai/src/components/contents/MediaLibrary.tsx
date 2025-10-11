import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  Music, 
  Archive,
  Search,
  Grid,
  List,
  FileIcon,
  MoreHorizontal
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface MediaFile {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  content_id?: string;
  uploaded_by: string;
  uploaded_at: string;
  metadata: any;
}

interface MediaCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

const mediaCategories: MediaCategory[] = [
  { id: 'all', name: 'Todos os Arquivos', icon: <Archive className="w-4 h-4" />, count: 0, color: 'bg-gray-500' },
  { id: 'image', name: 'Imagens', icon: <Image className="w-4 h-4" />, count: 0, color: 'bg-blue-500' },
  { id: 'video', name: 'Vídeos', icon: <Video className="w-4 h-4" />, count: 0, color: 'bg-red-500' },
  { id: 'audio', name: 'Áudios', icon: <Music className="w-4 h-4" />, count: 0, color: 'bg-green-500' },
  { id: 'document', name: 'Documentos', icon: <FileText className="w-4 h-4" />, count: 0, color: 'bg-purple-500' },
  { id: 'other', name: 'Outros', icon: <FileIcon className="w-4 h-4" />, count: 0, color: 'bg-orange-500' }
];

export const MediaLibrary: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch media files
  const { data: mediaFiles, isLoading } = useQuery({
    queryKey: ['media-files'],
    queryFn: async (): Promise<MediaFile[]> => {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('school-branding')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('school-branding')
          .getPublicUrl(filePath);

        // Save to database
        const { data, error: dbError } = await supabase
          .from('media_files')
          .insert({
            filename: fileName,
            original_name: file.name,
            mime_type: file.type,
            size: file.size,
            url: publicUrl,
            uploaded_by: 'current_user',
            metadata: {
              category: getCategoryFromMimeType(file.type),
              description: '',
              tags: []
            }
          })
          .select()
          .single();

        if (dbError) throw dbError;
        return data;
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      toast({
        title: "Upload concluído",
        description: "Arquivos enviados com sucesso!",
      });
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: `Falha ao enviar arquivos: ${error.message}`,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  const getCategoryFromMimeType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  };

  const getFileIcon = (mimeType: string) => {
    const category = getCategoryFromMimeType(mimeType);
    switch (category) {
      case 'image': return <Image className="w-6 h-6 text-blue-500" />;
      case 'video': return <Video className="w-6 h-6 text-red-500" />;
      case 'audio': return <Music className="w-6 h-6 text-green-500" />;
      case 'document': return <FileText className="w-6 h-6 text-purple-500" />;
      default: return <FileIcon className="w-6 h-6 text-orange-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setIsUploading(true);
      uploadMutation.mutate(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setIsUploading(true);
      uploadMutation.mutate(files);
    }
  };

  const filteredFiles = mediaFiles?.filter(file => {
    const matchesCategory = selectedCategory === 'all' || getCategoryFromMimeType(file.mime_type) === selectedCategory;
    const matchesSearch = file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  // Update category counts
  const categoriesWithCounts = mediaCategories.map(category => ({
    ...category,
    count: category.id === 'all' 
      ? mediaFiles?.length || 0
      : mediaFiles?.filter(file => getCategoryFromMimeType(file.mime_type) === category.id).length || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Archive className="w-6 h-6 text-white" />
            </div>
            Biblioteca de Mídia
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestão centralizada de arquivos educacionais
          </p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          {mediaFiles?.length || 0} arquivos
        </Badge>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragOver ? (
              <p className="text-blue-600 font-medium">Solte os arquivos aqui...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-gray-500">
                  Suporte para imagens, vídeos, áudios e documentos (máx. 50MB)
                </p>
              </div>
            )}
            {isUploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Enviando arquivos...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {categoriesWithCounts.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2"
            >
              {category.icon}
              {category.name}
              <Badge variant="secondary" className="ml-1">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar arquivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Files Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="bg-gray-200 h-32 rounded mb-3"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                  {file.mime_type.startsWith('image/') ? (
                    <img 
                      src={file.url} 
                      alt={file.original_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getFileIcon(file.mime_type)
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm truncate" title={file.original_name}>
                    {file.original_name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  {file.metadata?.tags && file.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.metadata.tags.slice(0, 2).map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.mime_type)}
                    <div>
                      <p className="font-medium">{file.original_name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredFiles.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Nenhum arquivo encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Tente ajustar sua pesquisa' : 'Comece enviando alguns arquivos'}
            </p>
            {!searchQuery && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Enviar Arquivos
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 