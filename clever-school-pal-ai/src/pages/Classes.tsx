import { useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import { Calendar, LoaderCircle, MoreHorizontal, Plus, Search, Trash2, Users, Edit, Filter } from "lucide-react";
import { toast } from "sonner";
import ClassForm from "@/components/forms/ClassForm";

export default function Classes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [classToEdit, setClassToEdit] = useState<any>(null);

  // Fetch classes from Supabase
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id, 
          name, 
          grade, 
          academic_year,
          general_context,
          school_id,
          schools(name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching classes:", error);
        throw new Error(error.message);
      }
      
      // Transform the data to match our UI needs
      return data.map(cls => ({
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        academicYear: cls.academic_year,
        generalContext: cls.general_context,
        schoolId: cls.school_id,
        schoolName: cls.schools?.name || "Escola Desconhecida"
      })) || [];
    }
  });

  // Fetch schools for the filter
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching schools:", error);
        throw new Error(error.message);
      }
      
      return data || [];
    }
  });

  // Create class mutation
  const createClass = useMutation({
    mutationFn: async (classData: any) => {
      // First create the class
      const { data: classResult, error: classError } = await supabase
        .from("classes")
        .insert({
          name: classData.name,
          school_id: classData.schoolId,
          grade: classData.grade,
          academic_year: classData.academicYear,
          general_context: classData.general_context || null
        })
        .select()
        .single();
      
      if (classError) throw new Error(classError.message);
      
      // Then create class-subject relationships using the SQL function
      if (classData.subjectIds && classData.subjectIds.length > 0) {
        const { data: relationshipResult, error: relationshipError } = await supabase
          .rpc('manage_class_subjects', {
            p_class_id: classResult.id,
            p_subject_ids: classData.subjectIds
          });
        
        if (relationshipError) {
          console.error('Error creating class-subject relationships:', relationshipError);
          throw new Error(`Erro ao associar disciplinas: ${relationshipError.message}`);
        }
        
        if (relationshipResult && typeof relationshipResult === 'object' && 'success' in relationshipResult && !(relationshipResult as any).success) {
          throw new Error(`Erro ao associar disciplinas: ${(relationshipResult as any).error}`);
        }
        
        console.log('Class-subject relationships created:', relationshipResult);
      }
      
      return classResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setIsCreateDialogOpen(false);
      toast.success("Turma criada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error creating class:", error);
      toast.error(`Erro ao criar turma: ${error.message}`);
    },
  });

  // Update class mutation
  const updateClass = useMutation({
    mutationFn: async (classData: any) => {
      const { classId, subjectIds, ...updateData } = classData;
      
      // First update the class
      const { data: classResult, error: classError } = await supabase
        .from("classes")
        .update({
          name: updateData.name,
          school_id: updateData.schoolId,
          grade: updateData.grade,
          academic_year: updateData.academicYear,
          general_context: updateData.general_context || null
        })
        .eq("id", classId)
        .select()
        .single();
      
      if (classError) throw new Error(classError.message);
      
      // Then update class-subject relationships using the SQL function
      const { data: relationshipResult, error: relationshipError } = await supabase
        .rpc('manage_class_subjects', {
          p_class_id: classId,
          p_subject_ids: subjectIds || []
        });
      
      if (relationshipError) {
        console.error('Error updating class-subject relationships:', relationshipError);
        throw new Error(`Erro ao atualizar disciplinas: ${relationshipError.message}`);
      }
      
      if (relationshipResult && typeof relationshipResult === 'object' && 'success' in relationshipResult && !(relationshipResult as any).success) {
        throw new Error(`Erro ao atualizar disciplinas: ${(relationshipResult as any).error}`);
      }
      
      console.log('Class-subject relationships updated:', relationshipResult);
      
      return classResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setIsEditDialogOpen(false);
      toast.success("Turma atualizada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error updating class:", error);
      toast.error(`Erro ao atualizar turma: ${error.message}`);
    },
  });

  // Delete class mutation
  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setIsDeleteDialogOpen(false);
      setClassToDelete(null);
      toast.success("Turma eliminada com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting class:", error);
      toast.error("Erro ao eliminar turma. Tente novamente.");
    }
  });

  const handleCreateClass = async (data: any) => {
    await createClass.mutateAsync(data);
  };

  const handleEditClass = async (data: any) => {
    if (classToEdit) {
      await updateClass.mutateAsync({
        ...data,
        classId: classToEdit.classId || classToEdit.id
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (classToDelete) {
      deleteClass.mutate(classToDelete);
    }
  };

  const openEditDialog = (cls: any) => {
    setClassToEdit({
      ...cls,
      classId: cls.id,
      schoolId: cls.schoolId,
      general_context: cls.generalContext
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setClassToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Get unique years and academic years for filtering - filter out null/undefined/empty values
  const availableYears = [...new Set(classes.map(cls => cls.grade).filter(grade => grade && grade.trim() !== ""))].sort();
  const availableAcademicYears = [...new Set(classes.map(cls => cls.academicYear).filter(year => year && year.trim() !== ""))].sort();

  // Filter classes based on search query, selected school, year, and academic year
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cls.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === "all" || cls.schoolId === selectedSchool;
    const matchesYear = selectedYear === "all" || cls.grade === selectedYear;
    const matchesAcademicYear = selectedAcademicYear === "all" || cls.academicYear === selectedAcademicYear;
    
    return matchesSearch && matchesSchool && matchesYear && matchesAcademicYear;
  });

  return (
    <>
      <Header 
        title="Gestão de Turmas" 
        subtitle="Organize e gerencie as turmas da sua escola"
      />
      
      <main className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-heading font-bold">Turmas</h1>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Nova Turma
                </Button>
              </div>
              
              {/* Enhanced Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar turmas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selectedSchool}
                    onValueChange={setSelectedSchool}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Escola" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="all" value="all">Todas as escolas</SelectItem>
                      <SelectGroup>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedYear}
                    onValueChange={setSelectedYear}
                  >
                    <SelectTrigger className="w-full md:w-[120px]">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="all-years" value="all">Todos os anos</SelectItem>
                      <SelectGroup>
                        {availableYears.map((year) => (
                          <SelectItem key={`year-${year}`} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedAcademicYear}
                    onValueChange={setSelectedAcademicYear}
                  >
                    <SelectTrigger className="w-full md:w-[140px]">
                      <SelectValue placeholder="Ano Letivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="all-academic-years" value="all">Todos os anos letivos</SelectItem>
                      <SelectGroup>
                        {availableAcademicYears.map((year) => (
                          <SelectItem key={`academic-${year}`} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {(selectedSchool !== "all" || selectedYear !== "all" || selectedAcademicYear !== "all" || searchQuery) && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setSelectedSchool("all");
                        setSelectedYear("all");
                        setSelectedAcademicYear("all");
                        setSearchQuery("");
                      }}
                      title="Limpar filtros"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Results Summary */}
              {(selectedSchool !== "all" || selectedYear !== "all" || selectedAcademicYear !== "all" || searchQuery) && (
                <div className="text-sm text-muted-foreground">
                  Mostrando {filteredClasses.length} de {classes.length} turmas
                </div>
              )}
              
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredClasses.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      Nenhuma turma encontrada.{" "}
                      {searchQuery || selectedSchool !== "all" || selectedYear !== "all" || selectedAcademicYear !== "all" ? (
                        "Tente refinar sua busca."
                      ) : (
                        <>
                          Clique em <strong>Nova Turma</strong> para começar.
                        </>
                      )}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClasses.map((cls) => (
                    <Card key={cls.id} className="card-hover">
                      <CardHeader className="pb-2 flex flex-row items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                          <CardDescription>
                            {cls.schoolName}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startTransition(() => navigate(`/classes/${cls.id}`))}>
                              <Users className="mr-2 h-4 w-4" />
                              Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive" 
                              onClick={() => openDeleteDialog(cls.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ano:</span>
                            <Badge variant="outline">{cls.grade}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ano Letivo:</span>
                            <span className="font-medium">{cls.academicYear}</span>
                          </div>
                          {cls.generalContext && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Contexto:</span>
                              <p className="text-xs mt-1 p-2 bg-muted rounded text-muted-foreground line-clamp-2">
                                {cls.generalContext}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
        </div>
      </main>

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Turma</DialogTitle>
            <DialogDescription>
              Preencha os detalhes abaixo para criar uma nova turma e selecione as disciplinas.
            </DialogDescription>
          </DialogHeader>
          <ClassForm 
            onSubmit={handleCreateClass} 
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createClass.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Turma</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da turma e suas disciplinas abaixo.
            </DialogDescription>
          </DialogHeader>
          <ClassForm 
            defaultValues={classToEdit}
            onSubmit={handleEditClass} 
            onCancel={() => {
              setIsEditDialogOpen(false);
              setClassToEdit(null);
            }}
            isSubmitting={updateClass.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteClass.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteClass.isPending}
            >
              {deleteClass.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
