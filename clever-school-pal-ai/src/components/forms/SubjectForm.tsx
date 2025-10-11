
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const subjectFormSchema = z.object({
  name: z.string().min(3, {
    message: "O nome da disciplina deve ter pelo menos 3 caracteres.",
  }),
  description: z.string().optional(),
  schoolId: z.string({
    required_error: "Selecione uma escola",
  }),
  grade: z.string().min(1, {
    message: "Ano é obrigatório.",
  }),
  teacherName: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormProps {
  defaultValues?: Partial<SubjectFormValues>;
  onSubmit: (data: SubjectFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SubjectForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SubjectFormProps) {
  const [loading, setLoading] = useState(isSubmitting);

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
  
  const gradeOptions = [
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
    "6º Ano", "7º Ano", "8º Ano", "9º Ano", "10º Ano",
    "11º Ano", "12º Ano"
  ];

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      schoolId: defaultValues?.schoolId || "",
      grade: defaultValues?.grade || "",
      teacherName: defaultValues?.teacherName || "",
    },
  });

  async function handleSubmit(data: SubjectFormValues) {
    try {
      setLoading(true);
      await onSubmit(data);
      toast.success(
        defaultValues ? "Disciplina atualizada com sucesso!" : "Disciplina criada com sucesso!"
      );
    } catch (error) {
      console.error("Erro ao salvar disciplina:", error);
      toast.error("Erro ao salvar disciplina. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Disciplina</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Matemática" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descrição da disciplina" {...field} />
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
          name="teacherName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Professor (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Nome do professor" {...field} />
              </FormControl>
              <FormMessage />
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
              : defaultValues
              ? "Atualizar Disciplina"
              : "Criar Disciplina"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default SubjectForm;
