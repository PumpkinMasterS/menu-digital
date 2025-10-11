import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Search, Users, MessageCircle, Edit, Phone } from "lucide-react";
import { Student } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StudentForm from "@/components/forms/StudentForm";
import { toast } from "sonner";

export default function Students() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          name,
          whatsapp_number,
          discord_id,
          email,
          active,
          bot_active,
          class_id,
          school_id,
          classes!students_class_id_fkey(id, name),
          schools!students_school_id_fkey(id, name)
        `)
        .order("name");

      if (error) throw error;

      return data?.map(student => ({
        id: student.id,
        name: student.name,
        phoneNumber: student.whatsapp_number, // Usando whatsapp_number como phoneNumber
        whatsappNumber: student.whatsapp_number,
        discord_id: student.discord_id,
        email: student.email,
        active: student.active,
        botActive: student.bot_active,
        classId: student.class_id,
        schoolId: student.school_id,
        className: student.classes?.name || "Sem turma",
        schoolName: student.schools?.name || "Sem escola"
      })) || [];
    }
  });

  // Fetch schools for filter
  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch classes for filter
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, school_id")
        .order("name");
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === "all" || student.schoolId === selectedSchool;
    const matchesClass = selectedClass === "all" || student.classId === selectedClass;
    return matchesSearch && matchesSchool && matchesClass;
  });

  const handleCreateStudent = async (data: any) => {
    try {
      // Criar o estudante
      const { data: studentData, error } = await supabase
        .from("students")
        .insert({
          name: data.name,
          whatsapp_number: data.whatsapp_number || data.phoneNumber || data.whatsappNumber,
          discord_id: data.discord_id || null,
          email: data.email,
          class_id: data.class_id || data.classId,
          school_id: data.school_id || data.schoolId,
          active: data.active !== undefined ? data.active : true,
          bot_active: data.bot_active !== undefined ? data.bot_active : false
        })
        .select()
        .single();

      if (error) throw error;

      // Se foi fornecido um Discord ID, sincronizar com a tabela discord_users
      if (data.discord_id && data.discord_id.trim()) {
        const { error: discordError } = await supabase
          .from("discord_users")
          .upsert({
            user_id: data.discord_id.trim(),
            username: data.name, // Usar o nome do aluno como username padrão
            student_id: studentData.id,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (discordError) {
          console.warn('Aviso: Erro ao sincronizar Discord ID:', discordError);
          toast.warning('Aluno criado, mas houve um problema na sincronização do Discord ID.');
        }
      }

      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsDialogOpen(false);
      setEditingStudent(null);
      toast.success("Aluno criado com sucesso!");
    } catch (error: any) {
      console.error("Error creating student:", error);
      toast.error("Erro ao criar aluno: " + error.message);
    }
  };

  const handleUpdateStudent = async (data: any) => {
    if (!editingStudent) return;
    
    try {
      // Atualizar o estudante
      const { error } = await supabase
        .from("students")
        .update({
          name: data.name,
          whatsapp_number: data.whatsapp_number || data.phoneNumber || data.whatsappNumber,
          discord_id: data.discord_id || null,
          email: data.email,
          class_id: data.class_id || data.classId,
          school_id: data.school_id || data.schoolId,
          active: data.active,
          bot_active: data.bot_active !== undefined ? data.bot_active : data.botActive
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      // Sincronizar com a tabela discord_users
      if (data.discord_id && data.discord_id.trim()) {
        const newDiscordId = data.discord_id.trim();

        // Se o Discord ID foi alterado, remover mapeamentos antigos deste aluno
        if (editingStudent.discord_id && editingStudent.discord_id !== newDiscordId) {
          const { error: cleanupError } = await supabase
            .from("discord_users")
            .delete()
            .eq("student_id", editingStudent.id)
            .neq("user_id", newDiscordId);

          if (cleanupError) {
            console.warn('Aviso: Erro ao limpar mapeamentos antigos do Discord ID:', cleanupError);
          }
        }

        // Criar/atualizar registro com o novo Discord ID
        const { error: discordError } = await supabase
          .from("discord_users")
          .upsert({
            user_id: newDiscordId,
            username: data.name,
            student_id: editingStudent.id,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (discordError) {
          console.warn('Aviso: Erro ao sincronizar Discord ID:', discordError);
          toast.warning('Aluno atualizado, mas houve um problema na sincronização do Discord ID.');
        }
      } else {
        // Se não há Discord ID, remover registros existentes para este estudante
        const { error: removeError } = await supabase
          .from("discord_users")
          .delete()
          .eq("student_id", editingStudent.id);

        if (removeError) {
          console.warn('Aviso: Erro ao remover Discord ID antigo:', removeError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsDialogOpen(false);
      setEditingStudent(null);
      toast.success("Aluno atualizado com sucesso!");
    } catch (error: any) {
      console.error("Error updating student:", error);
      toast.error("Erro ao atualizar aluno: " + error.message);
    }
  };

  const handleEditStudent = (student: any) => {
    setEditingStudent({
      id: student.id,
      name: student.name,
      whatsapp_number: student.whatsappNumber || student.phoneNumber,
      discord_id: student.discord_id,
      email: student.email,
      class_id: student.classId,
      school_id: student.schoolId,
      active: student.active,
      bot_active: student.botActive
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStudent(null);
  };

  const formatWhatsApp = (number?: string) => {
    if (!number) return "";
    return number;
  };

  return (
    <>
      <Header />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-heading font-bold text-foreground">Alunos</h1>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="btn-gradient">
              <Plus className="mr-2 h-4 w-4" /> Novo Aluno
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar alunos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                <SelectGroup>
                  {schools?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                <SelectGroup>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <Card>
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                  <div className="h-6 loading-shimmer rounded w-1/3"></div>
                  <div className="space-y-2">
                    <div className="h-4 loading-shimmer rounded w-full"></div>
                    <div className="h-4 loading-shimmer rounded w-5/6"></div>
                    <div className="h-4 loading-shimmer rounded w-4/6"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum aluno encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || selectedClass !== "all" || selectedSchool !== "all" ? (
                    "Tente refinar sua busca ou limpar os filtros."
                  ) : (
                    "Comece adicionando seu primeiro aluno ao sistema."
                  )}
                </p>
                {!searchQuery && selectedClass === "all" && selectedSchool === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Primeiro Aluno
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de Alunos ({filteredStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Escola</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bot</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id} className="table-row">
                          <TableCell className="font-medium">
                            {student.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {student.phoneNumber}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {student.whatsappNumber ? (
                                <>
                                  <MessageCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{formatWhatsApp(student.whatsappNumber)}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{student.email || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{student.className}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.schoolName}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={student.active ? "default" : "secondary"}>
                              {student.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={student.botActive ? "default" : "secondary"}
                              className={student.botActive ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {student.botActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStudent(student)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Editar Aluno" : "Adicionar Novo Aluno"}
            </DialogTitle>
            <DialogDescription>
              {editingStudent ? "Modifique as informações do aluno selecionado." : "Preencha os dados para cadastrar um novo aluno."}
            </DialogDescription>
          </DialogHeader>
          <StudentForm 
            defaultValues={editingStudent}
            onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}
            onCancel={handleCloseDialog}
            isEditing={!!editingStudent}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
