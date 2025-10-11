import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, BookOpen } from "lucide-react";

const classFormSchema = z.object({
  name: z.string().min(3, {
    message: "O nome da turma deve ter pelo menos 3 caracteres.",
  }),
  schoolId: z.string({
    required_error: "Selecione uma escola",
  }),
  grade: z.string().min(1, {
    message: "Ano é obrigatório.",
  }),
  academicYear: z.string().min(4, {
    message: "Ano letivo é obrigatório.",
  }),
  general_context: z.string().optional(),
  subjectIds: z.array(z.string()).min(1, {
    message: "Selecione pelo menos uma disciplina."
  }),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  defaultValues?: Partial<ClassFormValues & { classId?: string }>;
  onSubmit: (data: ClassFormValues & { classId?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ClassForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ClassFormProps) {
  const [loading, setLoading] = useState(isSubmitting);
  const isEditing = !!defaultValues?.classId;

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name");
      
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const currentYear = new Date().getFullYear();
  
  const gradeOptions = [
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
    "6º Ano", "7º Ano", "8º Ano", "9º Ano", "10º Ano",
    "11º Ano", "12º Ano"
  ];

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      schoolId: defaultValues?.schoolId || "",
      grade: defaultValues?.grade || "",
      academicYear: defaultValues?.academicYear || `${currentYear}/${currentYear + 1}`,
      general_context: defaultValues?.general_context || "",
      subjectIds: defaultValues?.subjectIds || [],
    },
  });

  const watchedSchoolId = form.watch("schoolId");
  const watchedGrade = form.watch("grade");
  const watchedSubjectIds = form.watch("subjectIds");

  // Fetch current class subjects if editing
  const { data: currentClassSubjects = [] } = useQuery({
    queryKey: ["class-subjects", defaultValues?.classId],
    queryFn: async () => {
      if (!defaultValues?.classId) return [];
      const { data, error } = await supabase.rpc('get_class_subject_ids', { p_class_id: defaultValues.classId });
      if (error) throw new Error(error.message);
      return (data as string[]) || [];
    },
    enabled: isEditing && !!defaultValues?.classId,
  });

  // Set initial subject IDs when editing
  useEffect(() => {
    if (isEditing && currentClassSubjects.length > 0 && !form.getValues("subjectIds").length) {
      form.setValue("subjectIds", currentClassSubjects);
    }
  }, [currentClassSubjects, isEditing, form]);

  // Fetch available subjects based on school and grade
  const { data: availableSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["available-subjects", watchedSchoolId, watchedGrade],
    queryFn: async () => {
      if (!watchedSchoolId || !watchedGrade) return [];
      
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, description, teacher_name")
        .eq("school_id", watchedSchoolId)
        .eq("grade", watchedGrade)
        .order("name");
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!watchedSchoolId && !!watchedGrade,
  });

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    const currentSubjects = form.getValues("subjectIds");
    if (checked) {
      form.setValue("subjectIds", [...currentSubjects, subjectId]);
    } else {
      form.setValue("subjectIds", currentSubjects.filter(id => id !== subjectId));
    }
  };

  const handleSelectAllSubjects = (checked: boolean) => {
    if (checked) {
      form.setValue("subjectIds", availableSubjects.map(s => s.id));
    } else {
      form.setValue("subjectIds", []);
    }
  };

  async function handleSubmit(data: ClassFormValues) {
    try {
      setLoading(true);
      await onSubmit({
        ...data,
        ...(isEditing && { classId: defaultValues?.classId })
      });
      toast.success(
        isEditing ? "Turma atualizada com sucesso!" : "Turma criada com sucesso!"
      );
    } catch (error) {
      console.error("Erro ao salvar turma:", error);
      toast.error("Erro ao salvar turma. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Reset subjects when school or grade changes (only for new classes)
  useEffect(() => {
    if (!isEditing) {
      form.setValue("subjectIds", []);
    }
  }, [watchedSchoolId, watchedGrade, isEditing, form]);

  const selectedSubjects = availableSubjects.filter(s => watchedSubjectIds.includes(s.id));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Turma</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 9º A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="schoolId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Escola</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma escola" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {schools?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ano</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="academicYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ano Letivo</FormLabel>
              <FormControl>
                <Input placeholder="2024/2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Disciplinas Section */}
        <FormField
          control={form.control}
          name="subjectIds"
          render={() => (
            <FormItem>
              <FormLabel>Disciplinas da Turma</FormLabel>
              
              {!watchedSchoolId || !watchedGrade ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/20">
                  <BookOpen className="h-4 w-4 inline mr-2" />
                  Selecione uma escola e ano para ver as disciplinas disponíveis
                </div>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Disciplinas Disponíveis ({availableSubjects.length})
                      </CardTitle>
                      {loadingSubjects && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    </div>
                    {availableSubjects.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={watchedSubjectIds.length === availableSubjects.length && availableSubjects.length > 0}
                          onCheckedChange={(checked) => handleSelectAllSubjects(!!checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          Selecionar todas ({availableSubjects.length})
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loadingSubjects ? (
                      <div className="flex items-center justify-center py-4">
                        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableSubjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma disciplina encontrada para esta escola e ano.
                        <br />
                        <span className="text-xs">Crie disciplinas primeiro na seção "Disciplinas".</span>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {availableSubjects.map((subject) => (
                            <div key={subject.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30">
                              <Checkbox
                                checked={watchedSubjectIds.includes(subject.id)}
                                onCheckedChange={(checked) => handleSubjectToggle(subject.id, !!checked)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{subject.name}</div>
                                {subject.teacher_name && (
                                  <div className="text-xs text-muted-foreground">
                                    Prof: {subject.teacher_name}
                                  </div>
                                )}
                                {subject.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {subject.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Selected subjects summary */}
                        {selectedSubjects.length > 0 && (
                          <div className="mt-4 pt-3 border-t">
                            <div className="text-xs text-muted-foreground mb-2">
                              Selecionadas ({selectedSubjects.length}):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedSubjects.map((subject) => (
                                <Badge key={subject.id} variant="secondary" className="text-xs">
                                  {subject.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="general_context"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Contexto Geral da Turma para IA (Opcional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Férias de Natal de 18/12 a 7/1, Avaliações na semana de 15/3, Projeto especial sobre meio ambiente, horários específicos..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg border-l-4 border-l-green-500">
                <div className="font-medium mb-2 text-green-800">
                  🧠 Como funciona a Hierarquia de Contextos:
                </div>
                <div className="space-y-1 text-xs">
                  <div>1️⃣ <strong>Personalidade IA:</strong> Aplicada globalmente</div>
                  <div>2️⃣ <strong>Contexto da Escola:</strong> Horários, políticas, eventos</div>
                  <div>3️⃣ <strong>Contexto da Turma:</strong> <span className="text-green-700 font-medium">Este campo específico</span></div>
                  <div>4️⃣ <strong>Contexto do Aluno:</strong> Necessidades especiais individuais</div>
                  <div>5️⃣ <strong>Conteúdos:</strong> Carregados inteligentemente quando necessário</div>
                </div>
                <div className="mt-2 text-xs text-green-600 font-medium">
                  💡 Este contexto será usado para TODOS os alunos desta turma específica
                </div>
                <div className="mt-2 text-xs text-green-600">
                  🔗 Após salvar, você pode gerir todos os contextos em: 
                  <span className="font-medium"> Admin → Contextos do Agente IA</span>
                </div>
              </div>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Salvando..."
              : isEditing
              ? "Atualizar Turma"
              : "Criar Turma"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ClassForm;
