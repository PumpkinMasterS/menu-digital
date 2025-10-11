
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Subject } from "@/types";
import { LoaderCircle, Trash2 } from "lucide-react";

interface ClassSubjectFormProps {
  classId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClassSubjectForm({
  classId,
  open,
  onOpenChange,
}: ClassSubjectFormProps) {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  
  // Fetch the class details
  const { data: classData } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, schools(id, name)")
        .eq("id", classId)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!classId,
  });

  // Fetch the subjects already associated with this class
  const { data: classSubjects = [], isLoading: loadingClassSubjects } = useQuery({
    queryKey: ["class-subjects", classId],
    queryFn: async () => {
      const { data: subjectIds, error: idsError } = await supabase
        .rpc("get_class_subject_ids", { p_class_id: classId });
      if (idsError) throw new Error(idsError.message);

      const ids: string[] = subjectIds || [];
      if (ids.length === 0) return [] as Array<{
        id: string;
        subjectId: string;
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
          subjectId: s.id,
          name: s.name,
          description: s.description,
          grade: s.grade as any,
          teacherName: (s as any).teacher_name,
        })) || []
      );
    },
    enabled: !!classId,
  });

  // Fetch all available subjects for this school
  const { data: availableSubjects = [] } = useQuery({
    queryKey: ["available-subjects", classData?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, grade")
        .eq("school_id", classData?.school_id)
        .eq("grade", classData?.grade)
        .order("name");
      
      if (error) throw new Error(error.message);
      
      // Filter out subjects that are already associated with this class
      const assignedSubjectIds = classSubjects.map(s => s.subjectId);
      return data.filter(s => !assignedSubjectIds.includes(s.id)) || [];
    },
    enabled: !!classData?.school_id && !!classData?.grade,
  });

  // Add subject to class mutation
  const addSubject = useMutation({
    mutationFn: async (subjectId: string) => {
      const currentIds = (classSubjects || []).map((s) => s.subjectId);
      const nextIds = Array.from(new Set([...currentIds, subjectId]));
      const { error } = await supabase.rpc("manage_class_subjects", {
        p_class_id: classId,
        p_subject_ids: nextIds,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-subjects", classId] });
      queryClient.invalidateQueries({ queryKey: ["available-subjects", classData?.school_id] });
      setSelectedSubjectId("");
      toast.success("Disciplina adicionada à turma com sucesso!");
    },
    onError: (error) => {
      console.error("Error adding subject to class:", error);
      toast.error("Erro ao adicionar disciplina. Tente novamente.");
    }
  });

  // Remove subject from class mutation
  const removeSubject = useMutation({
    mutationFn: async (subjectId: string) => {
      const currentIds = (classSubjects || []).map((s) => s.subjectId);
      const nextIds = currentIds.filter((id) => id !== subjectId);
      const { error } = await supabase.rpc("manage_class_subjects", {
        p_class_id: classId,
        p_subject_ids: nextIds,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-subjects", classId] });
      queryClient.invalidateQueries({ queryKey: ["available-subjects", classData?.school_id] });
      toast.success("Disciplina removida da turma com sucesso!");
    },
    onError: (error) => {
      console.error("Error removing subject from class:", error);
      toast.error("Erro ao remover disciplina. Tente novamente.");
    }
  });

  const handleAddSubject = () => {
    if (selectedSubjectId) {
      addSubject.mutate(selectedSubjectId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Disciplinas da Turma</DialogTitle>
          <DialogDescription>
            Adicione ou remova disciplinas desta turma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {classData && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Turma:</span>
                <span className="font-medium ml-2">{classData.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ano:</span>
                <span className="font-medium ml-2">{classData.grade}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Escola:</span>
                <span className="font-medium ml-2">{classData.schools?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ano Letivo:</span>
                <span className="font-medium ml-2">{classData.academic_year}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Adicionar Disciplina</h3>
            <div className="flex gap-2">
              <Select
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
                disabled={availableSubjects.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    availableSubjects.length === 0 
                      ? "Sem disciplinas disponíveis" 
                      : "Selecione uma disciplina"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddSubject}
                disabled={!selectedSubjectId || addSubject.isPending}
              >
                {addSubject.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Disciplinas da Turma</h3>
            {loadingClassSubjects ? (
              <div className="flex justify-center py-4">
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : classSubjects.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Esta turma ainda não tem disciplinas associadas.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell>{subject.teacherName || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubject.mutate(subject.subjectId)}
                          disabled={removeSubject.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
