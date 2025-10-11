
import { useState, startTransition } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import { ArrowLeft, Book, FileText, LoaderCircle, School } from "lucide-react";
import SubjectForm from "@/components/forms/SubjectForm";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch subject details
  const { data: subject, isLoading } = useQuery({
    queryKey: ["subject-detail", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("subjects")
        .select(`
          *,
          schools (
            id,
            name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        grade: data.grade,
        teacherName: data.teacher_name,
        schoolId: data.school_id,
        schoolName: data.schools?.name,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    enabled: !!id,
  });

  // Fetch associated classes
  const { data: associatedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["subject-classes", id],
    queryFn: async () => {
      if (!id) return [];

      // Buscar IDs de turmas via RPC para respeitar RLS
      const { data: classIds, error: idsError } = await supabase
        .rpc("get_subject_class_ids", { p_subject_id: id });
      if (idsError) throw new Error(idsError.message);
      const ids: string[] = classIds || [];
      if (ids.length === 0) return [] as Array<{
        id: string;
        classId: string;
        name?: string;
        grade?: string;
        academicYear?: string;
      }>;

      const { data, error } = await supabase
        .from("classes")
        .select("id, name, grade, academic_year")
        .in("id", ids)
        .order("name");
      if (error) throw new Error(error.message);

      return (
        data?.map((c) => ({
          id: c.id,
          classId: c.id,
          name: c.name,
          grade: c.grade as any,
          academicYear: (c as any).academic_year,
        })) || []
      );
    },
    enabled: !!id,
  });

  // Fetch contents of this subject
  const { data: subjectContents = [], isLoading: loadingContents } = useQuery({
    queryKey: ["subject-contents", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .eq("subject_id", id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      
      return data || [];
    },
    enabled: !!id,
  });

  // Update subject mutation
  const updateSubject = useMutation({
    mutationFn: async (subjectData: any) => {
      const { data, error } = await supabase
        .from("subjects")
        .update({
          name: subjectData.name,
          description: subjectData.description,
          grade: subjectData.grade,
          teacher_name: subjectData.teacherName,
          school_id: subjectData.schoolId
        })
        .eq("id", id)
        .select();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating subject:", error);
    }
  });

  const handleUpdateSubject = async (data: any) => {
    await updateSubject.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="flex-1 p-4 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </>
    );
  }

  if (!subject) {
    return (
      <>
        <Header />
        <main className="flex-1 p-4 overflow-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Disciplina não encontrada</h1>
            <p className="text-muted-foreground mb-4">
              A disciplina que você está procurando não existe ou foi removida.
            </p>
            <Button onClick={() => startTransition(() => navigate("/subjects"))}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Disciplinas
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 p-4 overflow-auto">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => startTransition(() => navigate("/subjects"))}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-2xl font-bold">{subject.name}</h1>
                  <Badge variant="outline">{subject.grade}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    Editar Disciplina
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => startTransition(() => navigate(`/subjects/${id}/contents`))}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Gerenciar Conteúdos
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="classes">Turmas</TabsTrigger>
                  <TabsTrigger value="contents">Conteúdos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações da Disciplina</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Nome da Disciplina</h3>
                            <p className="text-base">{subject.name}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Ano</h3>
                            <p className="text-base">{subject.grade}</p>
                          </div>
                          {subject.teacherName && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Professor</h3>
                              <p className="text-base">{subject.teacherName}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Escola</h3>
                            <p className="text-base">{subject.schoolName}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Data de Criação</h3>
                            <p className="text-base">
                              {new Date(subject.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Última Atualização</h3>
                            <p className="text-base">
                              {new Date(subject.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {subject.description && (
                        <div className="mt-6">
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h3>
                          <p className="text-base">{subject.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="classes" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Turmas Associadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingClasses ? (
                        <div className="flex justify-center py-6">
                          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : associatedClasses.length === 0 ? (
                        <div className="text-center py-6">
                          <School className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Esta disciplina ainda não está associada a nenhuma turma.
                          </p>
                          <Button 
                            className="mt-4" 
                            onClick={() => startTransition(() => navigate("/classes"))}
                          >
                            Gerenciar Turmas
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {associatedClasses.map((cls) => (
                            <Card key={cls.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                <div className="flex flex-col gap-2">
                                  <h3 className="font-medium">{cls.name}</h3>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Ano:</span>
                                    <Badge variant="outline">{cls.grade}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Ano Letivo:</span>
                                    <span>{cls.academicYear}</span>
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => startTransition(() => navigate(`/classes/${cls.classId}`))}
                                  >
                                    Ver Turma
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="contents" className="pt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Conteúdos</CardTitle>
                      <Button
                        onClick={() => startTransition(() => navigate(`/subjects/${id}/contents`))}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Gerenciar Conteúdos
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingContents ? (
                        <div className="flex justify-center py-6">
                          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : subjectContents.length === 0 ? (
                        <div className="text-center py-6">
                          <Book className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Esta disciplina ainda não possui conteúdos.
                          </p>
                          <Button 
                            className="mt-4"
                            onClick={() => startTransition(() => navigate(`/subjects/${id}/contents`))}
                          >
                            Adicionar Conteúdos
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {subjectContents.slice(0, 6).map((content) => (
                            <Card key={content.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                <div className="flex flex-col gap-2">
                                  <h3 className="font-medium line-clamp-1">{content.title}</h3>
                                  {content.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {content.description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between text-sm">
                                    <Badge variant="outline">{content.content_type}</Badge>
                                    <Badge variant={
                                      content.status === 'published' ? 'default' : 
                                      content.status === 'draft' ? 'secondary' : 'outline'
                                    }>
                                      {content.status === 'published' ? 'Publicado' : 
                                       content.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                      
                      {subjectContents.length > 6 && (
                        <div className="flex justify-center mt-4">
                          <Button 
                            variant="outline"
                            onClick={() => startTransition(() => navigate(`/subjects/${id}/contents`))}
                          >
                            Ver Todos os Conteúdos ({subjectContents.length})
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
      
      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Disciplina</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da disciplina.
            </DialogDescription>
          </DialogHeader>
          <SubjectForm 
            defaultValues={{
              name: subject.name,
              description: subject.description || "",
              schoolId: subject.schoolId,
              grade: subject.grade,
              teacherName: subject.teacherName || ""
            }}
            onSubmit={handleUpdateSubject} 
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={updateSubject.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
