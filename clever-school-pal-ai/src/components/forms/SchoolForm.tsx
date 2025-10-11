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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";

const schoolFormSchema = z.object({
  // Dados da escola
  name: z.string().min(3, {
    message: "O nome da escola deve ter pelo menos 3 caracteres.",
  }),
  address: z.string().min(5, {
    message: "O endereço deve ter pelo menos 5 caracteres.",
  }),
  contactEmail: z.string().email({
    message: "Endereço de e-mail inválido.",
  }),
  contactPhone: z.string().regex(/^(\+351)?\s?\d{9}$/, {
    message: "Número de telefone português inválido. Use o formato +351 XXXXXXXXX ou XXXXXXXXX",
  }),
});

type SchoolFormValues = z.infer<typeof schoolFormSchema>;

interface SchoolFormProps {
  defaultValues?: Partial<SchoolFormValues>;
  onSubmit: (data: SchoolFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SchoolForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SchoolFormProps) {
  const [loading, setLoading] = useState(isSubmitting);

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      address: defaultValues?.address || "",
      contactEmail: defaultValues?.contactEmail || "",
      contactPhone: defaultValues?.contactPhone || "",
    },
  });

  async function handleSubmit(data: SchoolFormValues) {
    try {
      setLoading(true);
      await onSubmit(data);
      toast.success(
        defaultValues ? "Escola atualizada com sucesso!" : "Escola criada com sucesso!"
      );
    } catch (error) {
      console.error("Erro ao salvar escola:", error);
      toast.error("Erro ao salvar escola. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informação sobre o novo fluxo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-blue-900 font-semibold mb-1">💡 Novo Fluxo 2025</h4>
              <p className="text-blue-800 text-sm">
                Agora pode criar escolas <strong>sem usuários iniciais</strong>. 
                Após criar a escola, vá para <strong>Gestão de Utilizadores</strong> para adicionar 
                diretores, coordenadores e professores conforme necessário.
              </p>
            </div>
          </div>
        </div>

        {/* Dados da Escola */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Informações da Escola
            </CardTitle>
            <CardDescription>
              Dados básicos da instituição de ensino
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Escola</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da escola" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o endereço completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail de Contacto</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@escola.pt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone de Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="+351 XXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Próximos passos */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 text-lg">📋 Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Criar a escola (apenas dados básicos)</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Ir para <strong>Gestão de Utilizadores</strong></span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Adicionar <strong>Diretor</strong>, <strong>Coordenador</strong> e <strong>Professores</strong></span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Atribuir professores às suas turmas</span>
            </div>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="btn-gradient"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {defaultValues ? "Atualizando..." : "Criando..."}
              </>
            ) : (
              defaultValues ? "Atualizar Escola" : "Criar Escola"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default SchoolForm;
