import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

import Header from "@/components/layout/Header";
import { Plus, Users, Grid, List } from "lucide-react";
import { Content, Subject, ContentAssignment, Topic } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { usePagination } from "@/hooks/use-pagination";
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { useNotifications } from "@/components/ui/notification-system";

// Import components
import ContentList from "@/components/contents/ContentList";
import ContentFilter from "@/components/contents/ContentFilter";
import ContentForm from "@/components/contents/ContentForm";
import ContentPreview from "@/components/contents/ContentPreview";
import MultiContentAssignment from "@/components/contents/MultiContentAssignment";
import { filterContents, enrichContentsWithNames } from "@/components/contents/utils";

export default function Contents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  
  // Filter states - hierarchical filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContentViewOpen, setIsContentViewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  
  // Content states
  const [viewingContent, setViewingContent] = useState<Content | null>(null);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [deletingContent, setDeletingContent] = useState<Content | null>(null);
  const [selectedContents, setSelectedContents] = useState<Set<string>>(new Set());
  
  // View states
  const [activeView, setActiveView] = useState<"grid" | "list">("grid");

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    if (selectedSchool === "all") {
      setSelectedClass("all");
      setSelectedSubject("all");
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass === "all") {
      setSelectedSubject("all");
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedYear !== "all") {
      // When year is selected, filter classes and subjects by year
      setSelectedClass("all");
      setSelectedSubject("all");
    }
  }, [selectedYear]);

  // Fetch all data with enhanced queries
  const { data: schools, isLoading: isLoadingSchools } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: classes, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade, school_id')
        .order('name');
      
      if (error) throw error;
      return (data || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        schoolId: cls.school_id,
        schoolName: "",
        academicYear: "",
        numberOfStudents: 0,
        subjects: [],
        createdAt: "",
        updatedAt: ""
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, grade, school_id')
        .order('name');
      
      if (error) throw error;
      return (data || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        grade: subject.grade,
        schoolId: subject.school_id,
        description: "",
        teacherName: "",
        numberOfContents: 0,
        createdAt: "",
        updatedAt: "",
        schoolName: ""
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch contents from Supabase
  const { data: contents, isLoading: isLoadingContents, error: contentsError } = useQuery({
    queryKey: ['contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contents')
        .select(`
          *,
          content_classes(class_id),
          subjects(name, school_id)
        `);
      
      if (error) throw error;
      
      // Transform data to match our enhanced Content type
      return data.map((content) => {
        const subjectName = content.subjects?.name || "Sem disciplina";
        const schoolId = content.subjects?.school_id || "";
        
        let status: "rascunho" | "publicado" | "arquivado" = "rascunho";
        switch (content.status) {
          case "draft":
          case "rascunho":
            status = "rascunho";
            break;
          case "published":
          case "publicado":
            status = "publicado";
            break;
          case "archived":
          case "arquivado":
            status = "arquivado";
            break;
          default:
            status = "rascunho";
        }
        
        return {
          id: content.id,
          title: content.title,
          description: content.description || "",
          subjectId: content.subject_id || "",
          subjectName: subjectName,
          schoolId: schoolId,
          schoolName: "",
          contentType: content.content_type as "text" | "pdf" | "image" | "video" | "link" | "file",
          contentData: content.content_data,
          status: status,
          classId: content.content_classes?.map((cc: any) => cc.class_id) || [],
          className: [],
          
          // Enhanced fields with proper types
          yearLevel: content.year_level || 5,
          topicId: content.topic_id,
          topicName: undefined, // Will be populated when joining with topics table
          subtopicId: undefined, // Will be populated when joining with topics table
          subtopicName: undefined, // Will be populated when joining with topics table
          difficulty: content.difficulty || 'medio',
          estimatedDuration: content.estimated_duration,
          tags: content.tags ? content.tags.split(',') : [],
          views: content.views || 0,
          lastViewed: content.last_viewed,
          
          createdAt: content.created_at,
          updatedAt: content.updated_at,
          createdBy: content.created_by || ""
        } as Content;
      });
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for content
  });

  // Enhanced filtering function with hierarchical logic
  const getFilteredContents = () => {
    // Use contents directly since we already transform them in the query
    let filtered = contents || [];

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(content =>
        content.title.toLowerCase().includes(query) ||
        content.description.toLowerCase().includes(query) ||
        content.subjectName.toLowerCase().includes(query) ||
        content.schoolName.toLowerCase().includes(query)
      );
    }

    // School filter
    if (selectedSchool !== "all") {
      filtered = filtered.filter(content => content.schoolId === selectedSchool);
    }

    // Year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(content => content.yearLevel.toString() === selectedYear);
    }

    // Class filter
    if (selectedClass !== "all") {
      filtered = filtered.filter(content => 
        content.classId.includes(selectedClass)
      );
    }

    // Subject filter
    if (selectedSubject !== "all") {
      filtered = filtered.filter(content => content.subjectId === selectedSubject);
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(content => content.status === selectedStatus);
    }

    return filtered;
  };

  const filteredContents = getFilteredContents();

  // Filter classes and subjects for UI display
  const filteredClasses = (classes || []).filter(cls => {
    if (selectedSchool !== "all" && cls.schoolId !== selectedSchool) return false;
    if (selectedYear !== "all") {
      return cls.grade === `${selectedYear}º Ano` || cls.grade === selectedYear;
    }
    return true;
  });

  const filteredSubjects = (subjects || []).filter(subject => {
    if (selectedSchool !== "all" && subject.schoolId !== selectedSchool) return false;
    if (selectedYear !== "all") {
      return subject.grade === `${selectedYear}º Ano` || subject.grade === selectedYear;
    }
    return true;
  });

  // Add pagination
  const {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    paginatedData: paginatedContents,
    goToPage,
    setItemsPerPage,
  } = usePagination({
    data: filteredContents,
    itemsPerPage: 12,
  });

  // Enhanced content mutations with notifications
  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase
        .from('contents')
        .delete()
        .eq('id', contentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      addNotification({
        title: "Conteúdo eliminado",
        message: "O conteúdo foi eliminado com sucesso.",
        type: "success",
      });
      setIsDeleteDialogOpen(false);
      setDeletingContent(null);
    },
    onError: (error) => {
      addNotification({
        title: "Erro ao eliminar",
        message: `Não foi possível eliminar o conteúdo: ${error.message}`,
        type: "error",
      });
    }
  });

  // Content selection handlers
  const handleContentSelect = (contentId: string, selected: boolean) => {
    const newSelection = new Set(selectedContents);
    if (selected) {
      newSelection.add(contentId);
    } else {
      newSelection.delete(contentId);
    }
    setSelectedContents(newSelection);
  };

  const handleSelectAllContents = () => {
    if (selectedContents.size === paginatedContents.length) {
      setSelectedContents(new Set());
    } else {
      setSelectedContents(new Set(paginatedContents.map(c => c.id)));
    }
  };

  // Dialog handlers
  const handleViewContent = (content: Content) => {
    setViewingContent(content);
    setIsContentViewOpen(true);
  };

  const handleEditContent = (content: Content) => {
    setEditingContent(content);
    setIsEditDialogOpen(true);
  };

  const handleDeleteContent = (content: Content) => {
    setDeletingContent(content);
    setIsDeleteDialogOpen(true);
  };

  // Assignment handler
  const handleMultipleAssignment = async (assignments: Omit<ContentAssignment, 'id' | 'assignedAt' | 'assignedBy'>[]) => {
    try {
      logger.info('Assigning contents to classes', { 
        assignmentCount: assignments.length 
      });
      
      // Transform assignments to match database schema
      const assignmentsToInsert = assignments.map(assignment => ({
        content_id: assignment.contentId,
        class_id: assignment.classId,
        due_date: assignment.dueDate || null,
        is_required: assignment.isRequired,
        assigned_by: 'admin', // You can get this from auth context
        notes: null // Add notes field to the assignment interface if needed
      }));

      // Insert assignments into the database
      const { error } = await supabase
        .from('content_assignments')
        .insert(assignmentsToInsert);

      if (error) {
        console.error('Error creating assignments:', error);
        throw new Error(error.message);
      }
      
      // Reset selection and close dialog
      setSelectedContents(new Set());
      setIsAssignmentDialogOpen(false);
      
      toast({
        title: "Sucesso",
        description: `${assignments.length} atribuições criadas com sucesso.`
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({ queryKey: ["content-assignments"] });
      
    } catch (error) {
      logger.error('Failed to create assignments', error);
      throw error;
    }
  };

  const selectedContentObjects = filteredContents.filter(c => selectedContents.has(c.id));

  const isLoading = isLoadingContents || isLoadingSubjects || isLoadingClasses || isLoadingSchools;

  // Show error if data fetch failed
  useEffect(() => {
    if (contentsError) {
      toast({
        title: "Erro ao carregar conteúdos",
        description: `${contentsError.message}`,
        variant: "destructive"
      });
    }
  }, [contentsError, toast]);

  return (
    <>
      <Header 
        title="Gestão de Conteúdos" 
        subtitle="Organize materiais educacionais por ano e tópicos"
      />
      
      <main className="flex-1 overflow-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeView === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={activeView === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedContents.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedContents.size} selecionado(s)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAssignmentDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Atribuir a Turmas
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Conteúdo
                </Button>
              </div>
            </div>
              
            <ContentFilter 
              searchQuery={searchQuery}
              selectedSubject={selectedSubject}
              selectedStatus={selectedStatus}
              selectedSchool={selectedSchool}
              selectedClass={selectedClass}
              selectedYear={selectedYear}
              subjects={filteredSubjects}
              schools={schools || []}
              classes={filteredClasses}
              onSearchChange={setSearchQuery}
              onSubjectChange={setSelectedSubject}
              onStatusChange={setSelectedStatus}
              onSchoolChange={setSelectedSchool}
              onClassChange={setSelectedClass}
              onYearChange={setSelectedYear}
            />

            {/* Multiple selection header */}
            {filteredContents.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  checked={selectedContents.size === filteredContents.length}
                  onCheckedChange={handleSelectAllContents}
                />
                <span className="text-sm">
                  Selecionar todos ({filteredContents.length} conteúdos)
                </span>
              </div>
            )}

            <ContentList 
              view={activeView}
              contents={filteredContents}
              selectedContents={selectedContents}
              onView={handleViewContent}
              onEdit={handleEditContent}
              onDelete={handleDeleteContent}
              onSelect={handleContentSelect}
              isLoading={isLoading}
              searchQuery={searchQuery}
            />
      </main>

      {/* Multiple Assignment Dialog */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atribuir Conteúdos a Turmas</DialogTitle>
            <DialogDescription>
              Selecione as turmas para atribuir os {selectedContents.size} conteúdos selecionados.
            </DialogDescription>
          </DialogHeader>
          <MultiContentAssignment
            selectedContents={selectedContentObjects}
            availableClasses={filteredClasses}
            onAssign={handleMultipleAssignment}
            onCancel={() => setIsAssignmentDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog para adicionar novo conteúdo */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Conteúdo</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do conteúdo pedagógico a ser adicionado.
            </DialogDescription>
          </DialogHeader>
          
          <ContentForm 
            onClose={() => setIsAddDialogOpen(false)}
            schools={schools || []}
            classes={filteredClasses}
            subjects={filteredSubjects}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar conteúdo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Conteúdo</DialogTitle>
            <DialogDescription>
              Modifique os detalhes do conteúdo pedagógico.
            </DialogDescription>
          </DialogHeader>
          
          <ContentForm 
            content={editingContent}
            onClose={() => {
              setIsEditDialogOpen(false);
              setEditingContent(null);
            }}
            schools={schools || []}
            classes={filteredClasses}
            subjects={filteredSubjects}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar conteúdo */}
      <Dialog open={isContentViewOpen} onOpenChange={setIsContentViewOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingContent?.title}</DialogTitle>
            <DialogDescription>
              {viewingContent?.subjectName} • {viewingContent?.schoolName}
            </DialogDescription>
          </DialogHeader>
          
          <ContentPreview 
            content={viewingContent} 
            onClose={() => setIsContentViewOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminação */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar o conteúdo "{deletingContent?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingContent && deleteContentMutation.mutate(deletingContent.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
