import { useState, useRef, useCallback, useEffect } from "react";
import { Content, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useSafeTimeout } from "@/hooks/use-page-visibility";

import { Loader2, Upload, X, FileText, Image, Video, Link, File } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface ContentFormProps {
  content?: Content | null;
  onClose: () => void;
  schools: any[];
  classes: any[];
  subjects: Subject[];
}

// Helper function to get badge variant based on character count
const getCharCountVariant = (count: number): "default" | "secondary" | "destructive" => {
  if (count <= 700) return "default"; // Verde
  if (count <= 900) return "secondary"; // Amarelo  
  return "destructive"; // Vermelho
};

const ContentForm = ({ content, onClose, schools, classes, subjects }: ContentFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const { setSafeTimeout } = useSafeTimeout();
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const isEditing = !!content;
  
  const [newContent, setNewContent] = useState({
    title: content?.title || "",
    description: content?.description || "",
    contentData: content?.contentData || "",
    contentType: (content?.contentType as 'topic' | 'text' | 'pdf' | 'image' | 'video' | 'link' | 'file') || 'text',
    schoolId: content?.schoolId || "",
    subjectId: content?.subjectId || "",
    classIds: [] as string[],
    tags: content?.tags || "",
    difficulty: (content?.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
    learningObjectives: content?.learningObjectives || ""
  });

  // Add year filter state
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [skipResetEffects, setSkipResetEffects] = useState(false);

  // Initialize form with content data if editing
  useEffect(() => {
    if (content && !isFormInitialized) {
      setSkipResetEffects(true);
      isInitializingRef.current = true;
      
      // Handle content type conversion - filter out unsupported types
      let contentType: 'topic' | 'text' | 'pdf' | 'image' | 'video' | 'link' | 'file' = 'topic';
      if (['topic', 'text', 'pdf', 'image', 'video', 'link', 'file'].includes(content.contentType)) {
        contentType = content.contentType as 'topic' | 'text' | 'pdf' | 'image' | 'video' | 'link' | 'file';
      }
      
      // Find the subject to determine the year level
      const contentSubject = subjects?.find(s => s.id === content.subjectId);
      let yearFromGrade = "all";
      if (contentSubject?.grade) {
        const gradeMatch = contentSubject.grade.match(/(\d+)/);
        if (gradeMatch) {
          yearFromGrade = gradeMatch[1];
        }
      }
      
      const formData = {
        title: content.title,
        description: content.description || "",
        subjectId: content.subjectId || "",
        contentType: contentType,
        contentData: content.contentData,
        learningObjectives: content.learningObjectives || "",
        classIds: content.classId || [],
        schoolId: content.schoolId || "",
        tags: Array.isArray(content.tags) ? content.tags.join(', ') : content.tags || "",
        difficulty: content.difficulty || "medium" as 'easy' | 'medium' | 'hard',
      };
      
      setNewContent(formData);
      setSelectedYear(yearFromGrade);
      setIsFormInitialized(true);

      if (content.contentType !== 'text' && content.contentType !== 'topic' && content.contentData) {
        setUploadedFileUrl(content.contentData);
        setUploadedFileName(content.title);
      }
      
      // Usar timeout seguro com cleanup automático
      setSafeTimeout(() => {
        isInitializingRef.current = false;
        setSkipResetEffects(false);
      }, 500);
    }
  }, [content, subjects, isFormInitialized, schools, classes]);

  // Reset form initialized flag when content changes
  useEffect(() => {
    if (!content) {
      setIsFormInitialized(false);
      setSelectedYear("all");
      setSkipResetEffects(false);
    }
  }, [content]);

  // Filter classes by selected school and year
  const filteredClasses = classes?.filter(c => {
    if (!newContent.schoolId) return false;
    if (c.schoolId !== newContent.schoolId) return false;
    if (selectedYear !== "all") {
      const classGrade = c.grade?.toString();
      return classGrade === selectedYear || 
             classGrade === `${selectedYear}º Ano` || 
             classGrade === `${selectedYear}º ano` ||
             classGrade?.includes(selectedYear);
    }
    return true;
  }) || [];

  // Filter subjects by selected school and year
  const filteredSubjects = subjects?.filter(s => {
    if (!newContent.schoolId) return false;
    if (s.schoolId !== newContent.schoolId) return false;
    if (selectedYear !== "all") {
      return s.grade === `${selectedYear}º Ano` || s.grade === selectedYear;
    }
    return true;
  }) || [];

  // Reset dependent selections when school or year changes (but not when editing existing content)
  useEffect(() => {
    // PRIMARY PROTECTION: If editing content, never reset
    if (isEditing && content) {
      return;
    }
    
    // Primary protection: skip if explicitly disabled
    if (skipResetEffects) {
      return;
    }
    
    // Don't reset if we're initializing
    if (isInitializingRef.current) {
      return;
    }
    
    // Don't reset if form is not yet initialized (during editing setup)
    if (isEditing && !isFormInitialized) {
      return;
    }
    
    // Don't reset if we're editing and content exists - more specific check
    if (isEditing && content && content.id && isFormInitialized) {
      return;
    }
    
    // Don't reset if this is the initial state (empty schoolId)
    if (!newContent.schoolId) {
      return;
    }
    
    setNewContent(prev => ({
      ...prev,
      classIds: [],
      subjectId: ""
    }));
  }, [newContent.schoolId, selectedYear, isEditing, content, isFormInitialized, skipResetEffects]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileProcessing(files[0]);
    }
  }, []);

  // Handle file processing (both drag&drop and upload)
  const handleFileProcessing = async (file: File) => {
    setFileUploading(true);
    setUploadedFileName(file.name);

    // Validações de tipo e tamanho (máx. 50MB)
    const MAX_SIZE_BYTES = 50 * 1024 * 1024;
    const allowedMime = [
      'application/pdf',
      'image/jpeg','image/png','image/gif','image/webp',
      'video/mp4','video/webm','video/ogg'
    ];

    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'O tamanho máximo permitido é 50MB.',
        variant: 'destructive'
      });
      setFileUploading(false);
      return;
    }

    if (!allowedMime.includes(file.type)) {
      // Permitimos fallback por extensão para PDFs/imagens caso type esteja vazio
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowByExt = ['pdf','jpg','jpeg','png','gif','webp','mp4','webm','ogg'].includes(ext || '');
      if (!allowByExt) {
        toast({
          title: 'Tipo de ficheiro não suportado',
          description: 'Suporta PDF, imagens (jpg, png, gif, webp) e vídeos (mp4, webm, ogg).',
          variant: 'destructive'
        });
        setFileUploading(false);
        return;
      }
    }

    // Function to sanitize filename for Supabase Storage
    const sanitizeFileName = (fileName: string): string => {
      // Remove or replace special characters and spaces
      return fileName
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .toLowerCase(); // Convert to lowercase
    };

    try {
      let contentType: 'topic' | 'text' | 'pdf' | 'image' | 'video' | 'link' | 'file' = "file";
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'pdf' || file.type === 'application/pdf') {
        contentType = 'pdf';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '') || file.type.startsWith('image/')) {
        contentType = 'image';
      } else if (['mp4', 'webm', 'ogg'].includes(extension || '') || file.type.startsWith('video/')) {
        contentType = 'video';
      }
      
      // Create sanitized file path
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `${Date.now()}_${sanitizedFileName}`;
      
      const { error } = await supabase.storage
        .from('content_files')
        .upload(filePath, file);
      
      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('content_files')
        .getPublicUrl(filePath);

      setUploadedFileUrl(publicUrl);
      setNewContent({
        ...newContent,
        contentType,
        contentData: publicUrl
      });

      toast({
        title: "Ficheiro carregado",
        description: "Ficheiro carregado com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar ficheiro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFileUploading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileProcessing(file);
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setUploadedFileUrl("");
    setUploadedFileName("");
    setNewContent({
      ...newContent,
      contentType: "topic",
      contentData: ""
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Create or update content mutation
  const saveContent = useMutation({
    mutationFn: async (contentData: typeof newContent) => {
      const contentPayload = {
        title: contentData.title,
        description: contentData.description || null,
        subject_id: contentData.subjectId || null,
        content_type: contentData.contentType,
        content_data: contentData.contentData,
        tags: Array.isArray(contentData.tags) ? contentData.tags.join(',') : contentData.tags || null,
        difficulty: contentData.difficulty,
        learning_objectives: contentData.learningObjectives || null,
        year_level: parseInt(contentData.schoolId ? "5" : "5"), // Default to 5, can be enhanced later
        status: 'ativo' as const,  // Add required status field
        created_by: 'system',
        updated_at: new Date().toISOString()
      };

      let savedContent;

      if (isEditing && content) {
        console.log('🔄 Updating content:', content.id);
        console.log('📝 Update payload:', contentPayload);
        
        const { data: updatedContent, error: updateError } = await supabase
          .from('contents')
          .update(contentPayload)
          .eq('id', content.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Update error:', updateError);
          throw updateError;
        }
        
        console.log('✅ Content updated successfully:', updatedContent);

        savedContent = updatedContent;

        // Use the SQL function to manage content-class relationships atomically
        const { data: manageResult, error: manageError } = await supabase
          .rpc('manage_content_classes_simple', {
            p_content_id: content.id,
            p_class_ids: contentData.classIds
          });

        if (manageError) {
          console.error('Error managing content classes:', manageError);
          throw new Error(`Database error: ${manageError.message}`);
        }

        // Check if the function returned an error
        if (manageResult && typeof manageResult === 'object' && 'success' in manageResult && !manageResult.success) {
          const errorDetails = (manageResult as any).error || 'Unknown error';
          const errorMessage = (manageResult as any).message || 'Failed to manage content classes';
          console.error('Function returned error:', { errorDetails, errorMessage });
          throw new Error(`${errorMessage}: ${errorDetails}`);
        }

        console.log('Content classes managed successfully:', manageResult);
      } else {
        const { data: createdContent, error: createError } = await supabase
          .from('contents')
          .insert(contentPayload)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        savedContent = createdContent;

        // Use the SQL function to manage content-class relationships atomically
        if (contentData.classIds.length > 0) {
          const { data: manageResult, error: manageError } = await supabase
            .rpc('manage_content_classes_simple', {
              p_content_id: savedContent.id,
              p_class_ids: contentData.classIds
            });

          if (manageError) {
            console.error('Error managing content classes:', manageError);
            throw new Error(`Database error: ${manageError.message}`);
          }

          // Check if the function returned an error
          if (manageResult && typeof manageResult === 'object' && 'success' in manageResult && !manageResult.success) {
            const errorDetails = (manageResult as any).error || 'Unknown error';
            const errorMessage = (manageResult as any).message || 'Failed to manage content classes';
            console.error('Function returned error:', { errorDetails, errorMessage });
            throw new Error(`${errorMessage}: ${errorDetails}`);
          }

          console.log('Content classes managed successfully:', manageResult);
        }
      }

      // Generate embedding for the content
      try {        
        await supabase.functions.invoke('generate-content-embedding', {
          body: {
            contentId: savedContent.id,
            title: savedContent.title,
            description: savedContent.description,
            contentData: savedContent.content_data
          }
        });
      } catch {
        // Don't throw error - content was saved successfully, embedding is optional
      }

      return savedContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      onClose();
      
      setUploadedFileUrl("");
      setUploadedFileName("");
      
      setNewContent({
        title: "",
        description: "",
        contentData: "",
        contentType: "topic",
        schoolId: "",
        subjectId: "",
        classIds: [],
        tags: "",
        difficulty: "medium",
        learningObjectives: "",
      });
      
      toast({
        title: isEditing ? "Conteúdo atualizado" : "Conteúdo adicionado",
        description: isEditing ? "O conteúdo foi atualizado com sucesso." : "O conteúdo foi adicionado com sucesso."
      });
    },
    onError: (error) => {
      console.error("Content save error:", error);
      toast({
        title: isEditing ? "Erro ao atualizar conteúdo" : "Erro ao adicionar conteúdo",
        description: `Erro: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Helper function to safely check content type
  const isTopicContentType = (type: string): type is 'topic' => {
    return type === 'topic';
  };

  const isTextContentType = (type: string): type is 'text' => {
    return type === 'text';
  };

  const isNonTextContentType = (type: string): boolean => {
    return ['pdf', 'image', 'video', 'link', 'file'].includes(type);
  };

  // Handle form submission
  const handleSaveContent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContent.title.trim()) {
      toast({
        title: "Erro de validação",
        description: "O título é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (!newContent.schoolId) {
      toast({
        title: "Erro de validação",
        description: "É necessário selecionar uma escola.",
        variant: "destructive"
      });
      return;
    }

    if (isTextContentType(newContent.contentType) && !newContent.contentData.trim()) {
      toast({
        title: "Erro de validação",
        description: "É necessário fornecer conteúdo de texto.",
        variant: "destructive"
      });
      return;
    }

    if (isTopicContentType(newContent.contentType) && !(newContent.contentData || "").trim()) {
      toast({
        title: "Erro de validação",
        description: "É necessário fornecer uma descrição do tópico.",
        variant: "destructive"
      });
      return;
    }

    if (isNonTextContentType(newContent.contentType) && !(newContent.contentData || "").trim()) {
      toast({
        title: "Erro de validação",
        description: "É necessário fornecer uma URL ou fazer upload de um ficheiro.",
        variant: "destructive"
      });
      return;
    }

    saveContent.mutate(newContent);
  };

  // Content type icons
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'topic': return <FileText className="h-4 w-4" />;
      case 'text': return <FileText className="h-4 w-4" />;
      case 'pdf': return <File className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  // Handle multiple class selection
  const handleClassSelection = (classId: string, checked: boolean) => {
    if (checked) {
      setNewContent({
        ...newContent,
        classIds: [...newContent.classIds, classId]
      });
    } else {
      setNewContent({
        ...newContent,
        classIds: newContent.classIds.filter(id => id !== classId)
      });
    }
  };

  // Handle "select all classes" toggle
  const handleSelectAllClasses = (checked: boolean) => {
    if (checked) {
      setNewContent({
        ...newContent,
        classIds: filteredClasses.map(cls => cls.id)
      });
    } else {
      setNewContent({
        ...newContent,
        classIds: []
      });
    }
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSaveContent} className="space-y-4 px-1">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">
              Título <Badge variant="outline" className="ml-2">🤖 IA</Badge>
            </Label>
            <Input
              id="title"
              value={newContent.title}
              onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Digite o título do conteúdo"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={newContent.description}
              onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Breve descrição do conteúdo (apenas para gestão interna)"
              rows={2}
            />
          </div>
          
          <div>
            <label htmlFor="schoolId" className="text-sm font-medium block mb-1">
              Escola *
            </label>
            <Select
              value={newContent.schoolId}
              onValueChange={(value) => {
                // If editing, don't reset dependent fields unless actually changing school
                if (isEditing && content && value === content.schoolId) {
                  return;
                }
                
                // If editing and different school, only update schoolId but preserve other fields
                if (isEditing && content) {
                  setNewContent({
                    ...newContent, 
                    schoolId: value,
                  });
                  return;
                }
                
                // Normal behavior for new content
                setNewContent({
                  ...newContent, 
                  schoolId: value,
                  subjectId: "",
                  classIds: []
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a escola" />
              </SelectTrigger>
              <SelectContent>
                {schools?.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="yearFilter" className="text-sm font-medium block mb-1">
              Filtrar por Ano
            </label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
              disabled={!newContent.schoolId}
            >
              <SelectTrigger>
                <SelectValue placeholder={!newContent.schoolId ? "Selecione escola" : "Todos os anos"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                <SelectItem value="5">5º Ano</SelectItem>
                <SelectItem value="6">6º Ano</SelectItem>
                <SelectItem value="7">7º Ano</SelectItem>
                <SelectItem value="8">8º Ano</SelectItem>
                <SelectItem value="9">9º Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subjectId" className="text-sm font-medium block mb-1">
                Disciplina
              </label>
              <Select
                value={newContent.subjectId}
                onValueChange={(value) => {
                  // Protect against clearing state during editing initialization
                  if (isEditing && content && !isFormInitialized) {
                    return;
                  }
                  
                  setNewContent({...newContent, subjectId: value});
                }}
                disabled={!newContent.schoolId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!newContent.schoolId ? "Selecione escola" : "Disciplina"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="classIds" className="text-sm font-medium block mb-1">
                Turmas {filteredClasses.length > 0 && `(${newContent.classIds.length}/${filteredClasses.length} selecionadas)`}
              </label>
              {filteredClasses.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newContent.classIds.length === filteredClasses.length && filteredClasses.length > 0}
                      onCheckedChange={(checked) => handleSelectAllClasses(!!checked)}
                    />
                    <span className="text-sm">Selecionar todas ({filteredClasses.length})</span>
                  </div>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {filteredClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={newContent.classIds.includes(cls.id)}
                          onCheckedChange={(checked) => handleClassSelection(cls.id, !!checked)}
                        />
                        <span className="text-sm">{cls.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground p-3 border rounded">
                  {!newContent.schoolId 
                    ? "Selecione uma escola primeiro" 
                    : selectedYear !== "all"
                    ? `Nenhuma turma encontrada para o ${selectedYear}º ano`
                    : "Nenhuma turma disponível"
                  }
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contentType" className="text-sm font-medium block mb-1">
                Tipo de Conteúdo
              </label>
              <Select
                value={newContent.contentType}
                onValueChange={(value) => {
                  // Protect against clearing state during editing initialization
                  if (isEditing && content && !isFormInitialized) {
                    return;
                  }
                  
                  setNewContent({...newContent, contentType: value as 'topic' | 'text' | 'pdf' | 'image' | 'video' | 'link' | 'file'});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topic">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tópico
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Texto
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Imagem
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Vídeo
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Link
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Ficheiro
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="difficulty" className="text-sm font-medium block mb-1">
                Dificuldade
              </label>
              <Select
                value={newContent.difficulty}
                onValueChange={(value) => {
                  // Protect against clearing state during editing initialization
                  if (isEditing && content && !isFormInitialized) {
                    return;
                  }
                  
                  setNewContent({...newContent, difficulty: value as 'easy' | 'medium' | 'hard'});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="learningObjectives">
              Objetivos de Aprendizagem <Badge variant="outline" className="ml-2">🤖 IA</Badge>
            </Label>
            <Textarea
              id="learningObjectives"
              value={newContent.learningObjectives}
              onChange={(e) => setNewContent({...newContent, learningObjectives: e.target.value})}
              placeholder="Descrição dos objetivos de aprendizagem"
              rows={2}
              className="resize-none"
            />
          </div>

          <div>
            <label htmlFor="tags" className="text-sm font-medium block mb-1">
              Tags
            </label>
            <Input
              id="tags"
              value={newContent.tags}
              onChange={(e) => setNewContent({...newContent, tags: e.target.value})}
              placeholder="matemática, frações, exercícios (separar por vírgulas)"
            />
          </div>
          
          {isTopicContentType(newContent.contentType) ? (
            <div>
              <label htmlFor="topicDescription" className="text-sm font-medium block mb-1">
                Descrição do Tópico *
              </label>
              <Textarea
                id="topicDescription"
                value={newContent.contentData}
                onChange={(e) => setNewContent({...newContent, contentData: e.target.value})}
                rows={4}
                className="resize-none"
                placeholder="Descrição detalhada do tópico para orientar o LLM na criação de conteúdo educativo..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta descrição será usada pelo AI para gerar explicações e exercícios adequados ao nível da turma
              </p>
            </div>
          ) : isTextContentType(newContent.contentType) ? (
            <div>
              <Label htmlFor="contentData">
                Conteúdo de Texto <Badge variant="outline" className="ml-2">🤖 IA</Badge>
              </Label>
              <Textarea
                id="contentData"
                value={newContent.contentData}
                onChange={(e) => setNewContent({...newContent, contentData: e.target.value})}
                rows={6}
                className="resize-none"
                placeholder="Escreva o conteúdo pedagógico aqui..."
                required
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Os primeiros 1000 caracteres serão usados pela IA como contexto educacional
                </p>
                <Badge 
                  variant={getCharCountVariant(newContent.contentData.length)} 
                  className="text-xs"
                >
                  {newContent.contentData.length}/1000
                </Badge>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-2">
                Upload de Ficheiro ou URL
              </label>
              
              {!uploadedFileUrl ? (
                <>
                  <Card
                    ref={dropZoneRef}
                    className={`border-2 border-dashed transition-colors ${
                      isDragOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="space-y-4">
                        <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          {getContentTypeIcon(newContent.contentType)}
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Arraste ficheiros aqui ou clique para selecionar
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Suporta PDF, imagens, vídeos e outros ficheiros (máx. 50MB)
                          </p>
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={fileUploading}
                          className="w-full sm:w-auto"
                        >
                          {fileUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              A carregar...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Selecionar ficheiro
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Input
                    id="contentUpload"
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="application/pdf,image/*,video/mp4,video/webm,video/ogg"
                  />
                  
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <div className="flex-1 h-px bg-border"></div>
                      <span>ou</span>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    
                    <Input
                      placeholder="Inserir URL externa (YouTube, Google Drive, etc.)"
                      value={!isTextContentType(newContent.contentType) ? newContent.contentData : ""}
                      onChange={(e) => setNewContent({...newContent, contentData: e.target.value})}
                      disabled={fileUploading}
                    />
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getContentTypeIcon(newContent.contentType)}
                        <div className="min-w-0 flex-1">
                          <span className="text-sm truncate block">
                            {uploadedFileName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Ficheiro carregado com sucesso
                          </span>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveFile}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveContent.isPending || fileUploading} className="w-full sm:w-auto">
              {saveContent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  {isEditing ? 'Atualizando...' : 'Salvando...'}
                </>
              ) : (
                isEditing ? 'Atualizar Conteúdo' : 'Salvar Conteúdo'
              )}
            </Button>
          </DialogFooter>
        </div>
      </form>
    </div>
  );
};

export default ContentForm;
