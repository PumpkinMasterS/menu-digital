
import { useState, useEffect, startTransition } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import { ArrowLeft, Book, LoaderCircle, User, Users } from "lucide-react";
import ClassSubjectForm from "@/components/subjects/ClassSubjectForm";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [isSubjectsDialogOpen, setIsSubjectsDialogOpen] = useState(false);

  // Fetch class details
  const { data: classData, isLoading } = useQuery({
    queryKey: ["class-details", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("classes")
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
      
      return data;
    },
    enabled: !!id,
  });

  // Fetch class subjects
  const { data: classSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["class-subjects", id],
    queryFn: async () => {
      if (!id) return [];

      const { data: subjectIds, error: idsError } = await supabase
        .rpc("get_class_subject_ids", { p_class_id: id });
      if (idsError) throw new Error(idsError.message);
      const ids: string[] = subjectIds || [];
      if (ids.length === 0) return [] as Array<{
        id: string;
        name?: string;
        description?: string;
        grade?: string;
        teacherName?: string;
      }>;

      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, description, grade, teacher_name")
        .in("id", ids)
        .order("name");
      if (error) throw new Error(error.message);

      return (
        data?.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          grade: s.grade as any,
          teacherName: (s as any).teacher_name,
        })) || []
      );
    },
    enabled: !!id,
  });

  // Fetch students in this class
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["class-students", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", id)
        .order("name");

      if (error) throw new Error(error.message);
      
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <>
        <Header title="Carregando..." />
        <main className="flex-1 p-4 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </>
    );
  }

  if (!classData) {
    return (
      <>
        <Header title="Turma não encontrada" />
        <main className="flex-1 p-4 overflow-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Turma não encontrada</h1>
            <p className="text-muted-foreground mb-4">
              A turma que você está procurando não existe ou foi removida.
            </p>
            <Button onClick={() => startTransition(() => navigate("/classes"))}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Turmas
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        title={`Turma ${classData.name}`} 
        subtitle={`${classData.grade} - ${classData.schools?.name || 'Escola não informada'}`}
      />
      <main className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => startTransition(() => navigate("/classes"))}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-2xl font-bold">{classData.name}</h1>
                  <Badge variant="outline">{classData.grade}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSubjectsDialogOpen(true)}
                  >
                    <Book className="mr-2 h-4 w-4" />
                    Gerenciar Disciplinas
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="subjects">Disciplinas</TabsTrigger>
                  <TabsTrigger value="students">Alunos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações da Turma</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Nome da Turma</h3>
                            <p className="text-base">{classData.name}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Ano</h3>
                            <p className="text-base">{classData.grade}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Ano Letivo</h3>
                            <p className="text-base">{classData.academic_year}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Escola</h3>
                            <p className="text-base">{classData.schools?.name}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Data de Criação</h3>
                            <p className="text-base">
                              {new Date(classData.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Última Atualização</h3>
                            <p className="text-base">
                              {new Date(classData.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="subjects" className="pt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Disciplinas</CardTitle>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsSubjectsDialogOpen(true)}
                      >
                        <Book className="mr-2 h-4 w-4" />
                        Gerenciar Disciplinas
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingSubjects ? (
                        <div className="flex justify-center py-6">
                          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : classSubjects.length === 0 ? (
                        <div className="text-center py-6">
                          <Book className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Esta turma ainda não tem disciplinas.
                          </p>
                          <Button 
                            className="mt-4" 
                            onClick={() => setIsSubjectsDialogOpen(true)}
                          >
                            Adicionar Disciplinas
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {classSubjects.map((subject) => (
                            <Card key={subject.id} className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{subject.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {subject.teacherName && (
                                  <div className="flex gap-2 text-sm mb-2">
                                    <span className="text-muted-foreground">Professor:</span>
                                    <span>{subject.teacherName}</span>
                                  </div>
                                )}
                                {subject.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {subject.description}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="students" className="pt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Alunos</CardTitle>
                      <Button 
                        variant="outline"
                        onClick={() => startTransition(() => navigate(`/students?class=${id}`))}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Gerenciar Alunos
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingStudents ? (
                        <div className="flex justify-center py-6">
                          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : students.length === 0 ? (
                        <div className="text-center py-6">
                          <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Esta turma ainda não tem alunos.
                          </p>
                          <Button 
                            className="mt-4"
                            onClick={() => startTransition(() => navigate(`/students?class=${id}`))}
                          >
                            Adicionar Alunos
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {students.map((student) => (
                            <Card key={student.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="bg-primary/10 rounded-full p-2">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {student.email || student.whatsappNumber}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
        </div>
      </main>
      
      <ClassSubjectForm 
        classId={id!}
        open={isSubjectsDialogOpen}
        onOpenChange={setIsSubjectsDialogOpen}
      />
    </>
  );
}
