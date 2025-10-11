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
import { Book, LoaderCircle, MoreHorizontal, Plus, Search, Trash2, Filter, FileText, Building } from "lucide-react";
import { toast } from "sonner";
import SubjectForm from "@/components/forms/SubjectForm";

export default function Subjects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedView, setSelectedView] = useState<string>("cards"); // cards, by-year, by-school
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  // Fetch subjects from Supabase
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select(`
          id, 
          name, 
          description,
          grade,
          teacher_name,
          school_id,
          schools(name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching subjects:", error);
        throw new Error(error.message);
      }
      
      // Transform the data to match our UI needs
      return data.map(subject => ({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        grade: subject.grade,
        teacherName: subject.teacher_name,
        schoolId: subject.school_id,
        schoolName: subject.schools?.name || "Escola Desconhecida"
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

  // Create subject mutation
  const createSubject = useMutation({
    mutationFn: async (subjectData: any) => {
      const { data, error } = await supabase
        .from("subjects")
        .insert({
          name: subjectData.name,
          description: subjectData.description,
          grade: subjectData.grade,
          teacher_name: subjectData.teacherName, // Agora é opcional
          school_id: subjectData.schoolId
        })
        .select();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setIsCreateDialogOpen(false);
      toast.success("Disciplina criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating subject:", error);
      toast.error("Erro ao criar disciplina. Tente novamente.");
    }
  });

  // Delete subject mutation
  const deleteSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setIsDeleteDialogOpen(false);
      setSubjectToDelete(null);
      toast.success("Disciplina eliminada com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting subject:", error);
      toast.error("Erro ao eliminar disciplina. Tente novamente.");
    }
  });

  const handleCreateSubject = async (data: any) => {
    await createSubject.mutateAsync(data);
  };

  const handleDeleteConfirm = () => {
    if (subjectToDelete) {
      deleteSubject.mutate(subjectToDelete);
    }
  };

  const openDeleteDialog = (id: string) => {
    setSubjectToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Get unique grades for filtering
  const availableGrades = [...new Set(subjects.map(subject => subject.grade))].filter(Boolean).sort();

  // Filter subjects based on search query, selected school, and grade
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subject.teacherName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === "all" || subject.schoolId === selectedSchool;
    const matchesGrade = selectedGrade === "all" || subject.grade === selectedGrade;
    return matchesSearch && matchesSchool && matchesGrade;
  });

  // Group subjects by year for year view
  const subjectsByYear = filteredSubjects.reduce((acc, subject) => {
    const year = subject.grade || 'Sem ano';
    if (!acc[year]) acc[year] = [];
    acc[year].push(subject);
    return acc;
  }, {} as Record<string, typeof subjects>);

  // Group subjects by school for school view
  const subjectsBySchool = filteredSubjects.reduce((acc, subject) => {
    const school = subject.schoolName || 'Sem escola';
    if (!acc[school]) acc[school] = [];
    acc[school].push(subject);
    return acc;
  }, {} as Record<string, typeof subjects>);

  const renderSubjectCard = (subject: any) => (
    <Card key={subject.id} className="card-hover">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            {subject.name}
          </CardTitle>
          <CardDescription>
            {subject.schoolName}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startTransition(() => navigate(`/subjects/${subject.id}`))}>
              <FileText className="mr-2 h-4 w-4" />
              Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startTransition(() => navigate(`/subjects/${subject.id}/contents`))}>
              <Book className="mr-2 h-4 w-4" />
              Conteúdos
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive" 
              onClick={() => openDeleteDialog(subject.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{subject.grade}º Ano</Badge>
          </div>
          {subject.teacherName && (
            <p className="text-sm text-muted-foreground">
              Professor: {subject.teacherName}
            </p>
          )}
          {subject.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {subject.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Header 
        title="Gestão de Disciplinas" 
        subtitle="Organize as disciplinas por escola e ano letivo"
      />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsCreateDialogOpen(true)} className="btn-gradient">
                <Plus className="mr-2 h-4 w-4" />
                Nova Disciplina
              </Button>
              
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button 
                  variant={selectedView === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedView("cards")}
                >
                  Cards
                </Button>
                <Button 
                  variant={selectedView === "by-year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedView("by-year")}
                >
                  Por Ano
                </Button>
                <Button 
                  variant={selectedView === "by-school" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedView("by-school")}
                >
                  Por Escola
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredSubjects.length} disciplina{filteredSubjects.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar disciplinas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                <SelectGroup>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                <SelectGroup>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}º Ano
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Content based on selected view */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSubjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Book className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma disciplina encontrada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || selectedSchool !== "all" || selectedGrade !== "all" ? (
                    "Tente refinar sua busca ou limpar os filtros."
                  ) : (
                    "Comece adicionando sua primeira disciplina ao sistema."
                  )}
                </p>
                {!searchQuery && selectedSchool === "all" && selectedGrade === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Primeira Disciplina
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {selectedView === "cards" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubjects.map(renderSubjectCard)}
                </div>
              )}
              
              {selectedView === "by-year" && (
                <div className="space-y-6">
                  {Object.entries(subjectsByYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, yearSubjects]) => (
                    <Card key={year}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Filter className="h-5 w-5 text-primary" />
                          {year}º Ano ({yearSubjects.length} disciplina{yearSubjects.length !== 1 ? 's' : ''})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {yearSubjects.map(renderSubjectCard)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {selectedView === "by-school" && (
                <div className="space-y-6">
                  {Object.entries(subjectsBySchool).sort(([a], [b]) => a.localeCompare(b)).map(([school, schoolSubjects]) => (
                    <Card key={school}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          {school} ({schoolSubjects.length} disciplina{schoolSubjects.length !== 1 ? 's' : ''})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {schoolSubjects.map(renderSubjectCard)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Disciplina</DialogTitle>
            <DialogDescription>
              Preencha os detalhes abaixo para criar uma nova disciplina.
            </DialogDescription>
          </DialogHeader>
          <SubjectForm 
            onSubmit={handleCreateSubject} 
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createSubject.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta disciplina? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteSubject.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteSubject.isPending}
            >
              {deleteSubject.isPending ? (
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
