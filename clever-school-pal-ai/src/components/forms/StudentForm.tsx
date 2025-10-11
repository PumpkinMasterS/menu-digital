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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Brain } from "lucide-react";

// Códigos de país mais comuns para validação inteligente
const COUNTRY_CODES = {
  '351': { name: 'Portugal', flag: '🇵🇹', format: '+351 9XX XXX XXX' },
  '55': { name: 'Brasil', flag: '🇧🇷', format: '+55 11 9XXXX-XXXX' },
  '34': { name: 'Espanha', flag: '🇪🇸', format: '+34 6XX XXX XXX' },
  '33': { name: 'França', flag: '🇫🇷', format: '+33 6 XX XX XX XX' },
  '44': { name: 'Reino Unido', flag: '🇬🇧', format: '+44 7XXX XXXXXX' },
  '1': { name: 'EUA/Canadá', flag: '🇺🇸', format: '+1 (XXX) XXX-XXXX' },
  '49': { name: 'Alemanha', flag: '🇩🇪', format: '+49 1XX XXXXXXX' },
  '39': { name: 'Itália', flag: '🇮🇹', format: '+39 3XX XXX XXXX' },
  '31': { name: 'Holanda', flag: '🇳🇱', format: '+31 6 XXXX XXXX' },
  '32': { name: 'Bélgica', flag: '🇧🇪', format: '+32 4XX XX XX XX' }
};

// Função inteligente para validar número internacional
const validateInternationalPhone = (number: string) => {
  // Remove todos os caracteres não numéricos
  const cleanNumber = number.replace(/[^\d]/g, '');
  
  // Verifica se tem entre 7-15 dígitos (padrão internacional)
  if (!/^\d{7,15}$/.test(cleanNumber)) {
    return false;
  }
  
  // Validações específicas por país
  if (cleanNumber.startsWith('351')) {
    // Portugal: +351 9XXXXXXXX (9 dígitos após 351)
    return /^351[1-9]\d{8}$/.test(cleanNumber);
  } else if (cleanNumber.startsWith('55')) {
    // Brasil: +55 XX 9XXXX-XXXX
    return /^55\d{2}[6-9]\d{8}$/.test(cleanNumber);
  } else if (cleanNumber.startsWith('34')) {
    // Espanha: +34 6XXXXXXXX ou 7XXXXXXXX
    return /^34[67]\d{8}$/.test(cleanNumber);
  } else if (cleanNumber.startsWith('33')) {
    // França: +33 6XXXXXXXX ou 7XXXXXXXX
    return /^33[67]\d{8}$/.test(cleanNumber);
  } else if (cleanNumber.startsWith('44')) {
    // Reino Unido: +44 7XXXXXXXXX
    return /^447\d{9}$/.test(cleanNumber);
  } else if (cleanNumber.startsWith('1')) {
    // EUA/Canadá: +1 XXXXXXXXXX (10 dígitos após 1)
    return /^1[2-9]\d{9}$/.test(cleanNumber);
  }
  
  // Para outros países, validação genérica
  return cleanNumber.length >= 7 && cleanNumber.length <= 15;
};

// Função para detectar país pelo número
const detectCountry = (number: string) => {
  const cleanNumber = number.replace(/[^\d]/g, '');
  
  // Tentar detectar pelos códigos mais comuns
  for (const [code, info] of Object.entries(COUNTRY_CODES)) {
    if (cleanNumber.startsWith(code)) {
      return { code, ...info };
    }
  }
  
  return null;
};

// Função para formatar número automaticamente
const formatPhoneNumber = (number: string) => {
  const cleanNumber = number.replace(/[^\d]/g, '');
  const country = detectCountry(cleanNumber);
  
  if (!country) {
    // Se não detectar país, assumir Portugal se começar com 9
    if (cleanNumber.startsWith('9') && cleanNumber.length <= 9) {
      return `+351 ${cleanNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
    }
    return `+${cleanNumber}`;
  }
  
  // Formatação específica por país
  if (country.code === '351') {
    // Portugal: +351 9XX XXX XXX
    const localNumber = cleanNumber.slice(3);
    if (localNumber.length === 9) {
      return `+351 ${localNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
    }
  } else if (country.code === '55') {
    // Brasil: +55 XX 9XXXX-XXXX
    const localNumber = cleanNumber.slice(2);
    if (localNumber.length === 11) {
      return `+55 ${localNumber.replace(/(\d{2})(\d{5})(\d{4})/, '$1 $2-$3')}`;
    }
  } else if (country.code === '34') {
    // Espanha: +34 6XX XXX XXX
    const localNumber = cleanNumber.slice(2);
    if (localNumber.length === 9) {
      return `+34 ${localNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
    }
  }
  
  return `+${cleanNumber}`;
};

const studentFormSchema = z.object({
  name: z.string().min(3, {
    message: "O nome do aluno é obrigatório e deve ter pelo menos 3 caracteres.",
  }),
  whatsapp_number: z.string().min(7, {
    message: "O número de WhatsApp é obrigatório.",
  }).refine((val) => {
    return validateInternationalPhone(val);
  }, {
            message: "Número de WhatsApp inválido. Use formato internacional (ex: +351XXXXXXXXX, +55XXXXXXXXXXX)",
  }),
  discord_id: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true; // Campo opcional
    // Discord IDs são números de 17-19 dígitos
    return /^\d{17,19}$/.test(val.trim());
  }, {
    message: "Discord ID inválido. Deve conter apenas números (17-19 dígitos)",
  }),
  email: z.string().email({
    message: "Formato de email inválido.",
  }).or(z.literal('')),
  school_id: z.string().min(1, {
    message: "Selecione uma escola (obrigatório)",
  }),
  class_id: z.string().min(1, {
    message: "Selecione uma turma (obrigatório)",
  }),
  active: z.boolean().default(true),
  bot_active: z.boolean().default(true),
  special_context: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  defaultValues?: Partial<StudentFormValues>;
  onSubmit: (data: StudentFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

export function StudentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
}: StudentFormProps) {
  const [loading, setLoading] = useState(isSubmitting);
  const [selectedSchool, setSelectedSchool] = useState<string>(
    defaultValues?.school_id || ""
  );
  const [phoneCountry, setPhoneCountry] = useState<any>(null);

  const { data: schools, isLoading: isLoadingSchools } = useQuery({
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

  const { data: classes, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["classes", selectedSchool],
    queryFn: async () => {
      if (!selectedSchool) return [];
      
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", selectedSchool)
        .order("name");
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedSchool
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      whatsapp_number: defaultValues?.whatsapp_number || "",
      discord_id: defaultValues?.discord_id || "",
      email: defaultValues?.email || "",
      school_id: defaultValues?.school_id || "",
      class_id: defaultValues?.class_id || "",
      active: defaultValues?.active !== undefined ? defaultValues.active : true,
      bot_active: defaultValues?.bot_active !== undefined ? defaultValues.bot_active : true,
      special_context: defaultValues?.special_context || "",
    },
  });

  async function handleSubmit(data: StudentFormValues) {
    try {
      setLoading(true);
      
      // Processar e limpar dados
      const processedData = {
        ...data,
        whatsapp_number: data.whatsapp_number.replace(/[^\d+]/g, ''), // Manter apenas + e números
        phoneNumber: data.whatsapp_number.replace(/[^\d+]/g, ''), // Para compatibilidade com Students.tsx
        discord_id: data.discord_id?.trim() || null // Limpar Discord ID ou definir como null se vazio
      };
      
      await onSubmit(processedData);
      toast.success(
        isEditing ? "Aluno atualizado com sucesso!" : "Aluno cadastrado com sucesso!"
      );
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      toast.error("Erro ao salvar aluno. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const handleSchoolChange = (value: string) => {
    setSelectedSchool(value);
    form.setValue("school_id", value);
    form.setValue("class_id", "");
  };

  const handlePhoneChange = (value: string) => {
    // Detectar país enquanto digita
    const country = detectCountry(value);
    setPhoneCountry(country);
    
    // Auto-formatar se possível
    if (value.length > 6) {
      const formatted = formatPhoneNumber(value);
      if (formatted !== value) {
        form.setValue("whatsapp_number", formatted);
        return;
      }
    }
    
    form.setValue("whatsapp_number", value);
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Aluno *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="whatsapp_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Telemóvel/WhatsApp * 
                  {phoneCountry && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {phoneCountry.flag} {phoneCountry.name}
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ex: +351XXXXXXXXX, +55XXXXXXXXXXX, 9XXXXXXXX" 
                    {...field}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {phoneCountry ? (
                    <span className="text-green-600">
                      ✅ Formato {phoneCountry.name}: {phoneCountry.format}
                    </span>
                  ) : (
                    <span>
                      🌍 Aceita qualquer país: Portugal (+351), Brasil (+55), etc.
                      <br />
                      📱 Este número será usado para WhatsApp também
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="discord_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Discord ID (Opcional)
                  <span className="ml-2 text-sm text-muted-foreground">
                    🎮 Para integração com Discord
                  </span>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ex: 123456789012345678" 
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  <span>
                    🔍 Como obter: Discord → Definições → Avançado → Modo de Desenvolvedor (ativar)
                    <br />
                    👤 Depois: clique direito no seu nome → Copiar ID do Utilizador
                    <br />
                    🤖 Este ID será usado para interação com o bot Discord
                  </span>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="school_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Escola *</FormLabel>
                <Select 
                  onValueChange={handleSchoolChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma escola" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingSchools ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : (
                      schools?.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="class_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Turma *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={!selectedSchool}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedSchool ? "Selecione uma turma" : "Selecione uma escola primeiro"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingClasses ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : classes?.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma turma encontrada</SelectItem>
                    ) : (
                      classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="special_context"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Contexto Especial para IA (Opcional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Aluno com autismo, prefere explicações claras e exemplos visuais. Ritmo mais lento. Evitar muita informação de uma vez..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border-l-4 border-l-blue-500">
                  <div className="font-medium mb-2 text-blue-800">
                    🧠 Como funciona a Hierarquia de Contextos:
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>1️⃣ <strong>Personalidade IA:</strong> Aplicada globalmente</div>
                    <div>2️⃣ <strong>Contexto da Escola:</strong> Horários, políticas, eventos</div>
                    <div>3️⃣ <strong>Contexto da Turma:</strong> Projetos, avaliações, matérias</div>
                    <div>4️⃣ <strong>Contexto do Aluno:</strong> <span className="text-blue-700 font-medium">Este campo específico</span></div>
                    <div>5️⃣ <strong>Conteúdos:</strong> Carregados inteligentemente quando necessário</div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600 font-medium">
                    💡 Este contexto será usado em TODAS as conversas deste aluno específico
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    🔗 Após salvar, você pode gerir todos os contextos em: 
                    <span className="font-medium"> Admin → Contextos do Agente IA</span>
                  </div>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Aluno Ativo</FormLabel>
                  <FormDescription>
                    Aluno pode fazer login no sistema
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="bot_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Bot WhatsApp Ativo</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Permite que o aluno receba mensagens do bot no WhatsApp
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-background border-t mt-6 py-4">
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
                ? "Atualizar Aluno"
                : "Criar Aluno"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default StudentForm;
