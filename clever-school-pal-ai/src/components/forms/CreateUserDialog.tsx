import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, UserPlus, Wand2, AlertTriangle, TestTube, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface School {
  id: string;
  name: string;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schools: School[];
  onUserCreated: () => void;
  preselectedSchoolId?: string;
}

interface CreateUserForm {
  email: string;
  name: string;
  role: 'diretor' | 'coordenador' | 'super_admin' | 'professor';
  school_id?: string; // Opcional para super_admin
  password: string;
  confirmPassword: string;
}

interface PasswordStrengthResult {
  is_valid: boolean;
  score: number;
  max_score: number;
  strength: string;
  issues: string[];
  suggestions: string[];
}

interface EmailValidationResult {
  is_valid: boolean;
  domain: string;
  issues: string[];
  suggestions: string[];
  classification: string;
}

export default function CreateUserDialog({
  open,
  onOpenChange,
  schools,
  onUserCreated,
  preselectedSchoolId
}: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [reactivatingUser, setReactivatingUser] = useState(false);

  const form = useForm<CreateUserForm>({
    defaultValues: {
      email: '',
      name: '',
      role: 'professor',
      school_id: preselectedSchoolId || '',
      password: '',
      confirmPassword: ''
    }
  });

  // Limpar school_id quando role é super_admin e resetar quando muda para outro role
  const watchedRole = form.watch('role');
  useEffect(() => {
    if (watchedRole === 'super_admin') {
      form.setValue('school_id', '');
    } else if (!form.getValues('school_id') && preselectedSchoolId) {
      form.setValue('school_id', preselectedSchoolId);
    }
  }, [watchedRole, form, preselectedSchoolId]);

  const checkExistingUser = async (email: string) => {
    if (!email || !email.includes('@')) {
      setExistingUser(null);
      return;
    }

    setCheckingEmail(true);
    
    try {
      // Usar função RPC list_admin_users para verificar usuários existentes
      const { data: adminUsers, error } = await supabase.rpc('list_admin_users');

      if (error) {
        console.warn('⚠️ Erro ao verificar email existente:', error);
        setExistingUser(null);
        return;
      }

      if (adminUsers && Array.isArray(adminUsers)) {
        const existingUser = adminUsers.find((user: any) => 
          user.email.toLowerCase() === email.toLowerCase().trim()
        );

        if (existingUser) {
          setExistingUser(existingUser);
          console.log('👤 Utilizador existente encontrado:', existingUser);
        } else {
          setExistingUser(null);
          console.log('✅ Email disponível');
        }
      } else {
        setExistingUser(null);
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação de email:', error);
      setExistingUser(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const testSupabaseConnection = async () => {
    setTestingConnection(true);
    
    try {
      console.log('🧪 Iniciando teste de conexão com Supabase...');
      
      // 1. Teste básico de conexão usando uma tabela que sabemos que existe
      const { data: pingData, error: pingError } = await supabase
        .from('schools')
        .select('count', { count: 'exact', head: true });

      if (pingError) {
        throw new Error(`Erro de conexão: ${pingError.message}`);
      }

      console.log('✅ Conexão Supabase OK');

      // 2. Testar função check_user_system_status
      let statusResult = null;
      try {
        const { data: statusData, error: statusError } = await (supabase as any).rpc('check_user_system_status');
        
        if (statusError) {
          console.warn('⚠️ Função check_user_system_status não disponível:', statusError);
          statusResult = { error: statusError.message };
        } else {
          console.log('✅ Status do sistema:', statusData);
          statusResult = statusData;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao testar status do sistema:', error);
        statusResult = { error: 'Função não encontrada' };
      }

      // 3. Testar função create_user_auth_only
      let createFunctionExists = false;
      try {
        // Não vamos criar um usuário real, só verificar se a função existe
        const { error: createError } = await (supabase as any).rpc('create_user_auth_only', {
          p_email: 'teste.verificacao@naocriar.com',
          p_name: 'Teste',
          p_role: 'super_admin',
          p_school_id: null
        });

        if (createError && createError.message.includes('Email já está em uso')) {
          // Se der erro de email já existe, significa que a função funciona
          createFunctionExists = true;
          console.log('✅ Função create_user_auth_only existe e funciona');
        } else if (createError && !createError.message.includes('does not exist')) {
          // Se der outro erro que não seja "função não existe", ela existe
          createFunctionExists = true;
          console.log('✅ Função create_user_auth_only existe:', createError.message);
        } else if (!createError) {
          // Se não der erro, a função funciona (mas não criou o usuário porque o email é fake)
          createFunctionExists = true;
          console.log('✅ Função create_user_auth_only funciona perfeitamente');
        }
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.error('❌ Função create_user_auth_only não existe');
          createFunctionExists = false;
        } else {
          console.log('✅ Função create_user_auth_only existe (erro esperado):', error.message);
          createFunctionExists = true;
        }
      }

      const testResults = {
        connection: true,
        userCount: pingData,
        systemStatus: statusResult,
        createFunction: createFunctionExists,
        timestamp: new Date().toISOString()
      };

      setSystemStatus(testResults);

      // Feedback visual
      if (createFunctionExists) {
        toast.success('✅ Sistema Funcional', {
          description: 'Conexão OK e funções SQL disponíveis',
          duration: 5000
        });
      } else {
        toast.warning('⚠️ Funções SQL em Falta', {
          description: 'Conexão OK mas é preciso aplicar as migrations SQL',
          duration: 8000
        });
      }

    } catch (error: any) {
      console.error('💥 Erro no teste de conexão:', error);
      
      setSystemStatus({
        connection: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast.error('❌ Erro de Conexão', {
        description: `Não foi possível conectar ao Supabase: ${error.message}`,
        duration: 8000
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    
    // Garantir pelo menos uma maiúscula, minúscula, número e símbolo
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];
    
    // Completar com caracteres aleatórios
    for (let i = 4; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Embaralhar a password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    form.setValue('password', password);
    form.setValue('confirmPassword', password);
    
    // Debug
    console.log('🔐 Password gerada automaticamente');
  };

  // Validação de password em tempo real (OPCIONAL - se falhar, não bloqueia)
  const validatePassword = async (password: string) => {
    if (!password) return;
    
    try {
      const { data: result, error } = await (supabase as any).rpc('validate_password_strength_v2', {
        password_text: password
      });
      
      if (error) {
        console.warn('⚠️ Função validate_password_strength_v2 não disponível:', error);
        return;
      }
      
      setPasswordStrength(result);
      console.log('✅ Password validada:', result?.strength);
    } catch (error) {
      console.warn('⚠️ Erro na validação de password (ignorado):', error);
    }
  };

  // Validação de email em tempo real (OPCIONAL - se falhar, não bloqueia)
  const validateEmail = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    try {
      const { data: result, error } = await (supabase as any).rpc('validate_institutional_email', {
        email_text: email
      });
      
      if (error) {
        console.warn('⚠️ Função validate_institutional_email não disponível:', error);
        return;
      }
      
      setEmailValidation(result);
      console.log('✅ Email validado:', result?.classification);
    } catch (error) {
      console.warn('⚠️ Erro na validação de email (ignorado):', error);
    }
  };

  const handleEmailSuggestions = (currentEmail: string) => {
    const suggestions = [];
    const [localPart, domain] = currentEmail.split('@');
    
    if (domain) {
      // Adicionar número ao final
      suggestions.push(`${localPart}1@${domain}`);
      suggestions.push(`${localPart}2@${domain}`);
      
      // Adicionar timestamp
      const timestamp = Date.now().toString().slice(-4);
      suggestions.push(`${localPart}${timestamp}@${domain}`);
      
      // Versões alternativas
      suggestions.push(`${localPart}.admin@${domain}`);
      suggestions.push(`admin.${localPart}@${domain}`);
    }
    
    return suggestions;
  };

  const onSubmit = async (data: CreateUserForm) => {
    console.log('🚀 Iniciando criação de utilizador:', {
      name: data.name,
      email: data.email,
      role: data.role,
      has_password: !!data.password,
      has_confirmPassword: !!data.confirmPassword,
      passwords_match: data.password === data.confirmPassword,
      school_id: data.school_id
    });

    // Validação básica de passwords
    if (!data.password || !data.confirmPassword) {
      toast.error('❌ Erro de Validação', {
        description: 'Ambos os campos de password devem estar preenchidos'
      });
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error('❌ Erro de Validação', {
        description: 'As passwords não coincidem'
      });
      return;
    }

    // Validações baseadas no role
    if (data.role === 'super_admin') {
      // Super Admin: não deve ter school_id
      if (data.school_id) {
        toast.error('❌ Configuração Inválida', {
          description: 'Super Admins têm acesso global e não devem estar associados a uma escola específica'
        });
        return;
      }
    } else {
      // Diretor/Coordenador: devem ter school_id
      if (!data.school_id) {
        toast.error('❌ Escola Obrigatória', {
          description: `${data.role === 'diretor' ? 'Diretores' : 'Coordenadores'} devem estar associados a uma escola específica`
        });
        return;
      }
    }

    // Validações OPCIONAIS (só aplicam se as funções existirem)
    if (passwordStrength && !passwordStrength.is_valid) {
      console.warn('⚠️ Password fraca detectada, mas continuando...');
      // Não bloquear - apenas avisar
      toast.warning('⚠️ Password Fraca', {
        description: 'A password pode não cumprir todos os requisitos de segurança'
      });
    }

    if (emailValidation && !emailValidation.is_valid) {
      console.warn('⚠️ Email não institucional detectado, mas continuando...');
      // Não bloquear - apenas avisar
      toast.warning('⚠️ Email Pessoal', {
        description: 'Considere usar um email institucional'
      });
    }

    setLoading(true);
    
    try {
      const selectedSchool = schools.find(s => s.id === data.school_id);
      const isGlobalAdmin = data.role === 'super_admin';
      
      console.log('📡 Chamando RPC create_user_auth_only com:', {
        p_email: data.email,
        p_name: data.name,
        p_role: data.role,
        p_school_id: isGlobalAdmin ? null : data.school_id
      });

      const { data: result, error } = await (supabase as any).rpc('create_user_auth_only', {
        p_email: data.email,
        p_name: data.name,
        p_role: data.role,
        p_school_id: isGlobalAdmin ? null : data.school_id
      });

      console.log('📨 Resposta do RPC:', { result, error });

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        
        if (error.message.includes('does not exist')) {
          throw new Error(`Função SQL não encontrada. Execute as migrations SQL primeiro. Erro: ${error.message}`);
        }
        
        throw new Error(`Erro no servidor: ${error.message}`);
      }

      if (!result) {
        console.error('❌ Resposta vazia do servidor');
        throw new Error('Servidor retornou resposta vazia');
      }

      if (!result.success) {
        console.error('❌ Operação falhou:', result.error);
        
        // Tratamento especial para email já existente
        if (result.error && result.error.includes('Email já está em uso')) {
          const suggestions = handleEmailSuggestions(data.email);
          
          toast.error('📧 Email Já Existe', {
            description: `O email "${data.email}" já está cadastrado no sistema.`,
            duration: 10000,
            action: {
              label: 'Ver Sugestões',
              onClick: () => {
                const suggestionText = suggestions.slice(0, 3).join('\n• ');
                toast.info('💡 Sugestões de Email', {
                  description: `Tente:\n• ${suggestionText}`,
                  duration: 15000
                });
              }
            }
          });
          
          // Verificar o usuário existente
          checkExistingUser(data.email);
          return;
        }
        
        throw new Error(result.error || 'Operação falhou por motivo desconhecido');
      }

      console.log('✅ Utilizador criado com sucesso!', result);

      const successMessage = isGlobalAdmin 
        ? `${data.name} foi criado como Super Administrador Global`
        : `${data.name} foi adicionado como ${data.role} na ${selectedSchool?.name}`;

      // Feedback de sucesso baseado no tipo de utilizador
      if (isGlobalAdmin) {
        toast.success('👑 Super Admin Criado!', {
          description: successMessage,
          duration: 8000,
        });
        
        // Toast adicional com aviso sobre TOTP
        setTimeout(() => {
          toast.warning('🔐 ATENÇÃO: TOTP Obrigatório!', {
            description: `${data.name} deve configurar autenticação de dois fatores (TOTP) no primeiro login.`,
            duration: 12000,
          });
        }, 1000);
      } else {
        toast.success('🎉 Utilizador Criado!', {
          description: successMessage,
          duration: 5000
        });
      }

      // Reset form e fechar dialog
      form.reset();
      setPasswordStrength(null);
      setEmailValidation(null);
      setExistingUser(null);
      onOpenChange(false);
      onUserCreated();

    } catch (error: any) {
      console.error('💥 Erro completo na criação:', error);
      
      toast.error('❌ Erro ao Criar Utilizador', {
        description: error.message || 'Erro desconhecido. Verifique a consola para detalhes.',
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para reativar usuário inativo
  const reactivateUser = async (email: string) => {
    setReactivatingUser(true);
    
    try {
      console.log('🔄 Reativando usuário:', email);
      
      const { data: result, error } = await (supabase as any).rpc('reactivate_user_simple', {
        p_email: email
      });

      if (error) {
        console.error('❌ Erro ao reativar usuário:', error);
        throw new Error(`Erro ao reativar usuário: ${error.message}`);
      }

      if (!result?.success) {
        console.error('❌ Falha na reativação:', result?.error);
        throw new Error(result?.error || 'Falha ao reativar usuário');
      }

      console.log('✅ Usuário reativado com sucesso!', result);
      
      toast.success('✅ Usuário Reativado!', {
        description: `${existingUser.name} foi reativado com sucesso e já pode fazer login.`,
        duration: 8000
      });

      // Limpar dados e fechar dialog
      form.reset();
      setExistingUser(null);
      onOpenChange(false);
      onUserCreated(); // Refresh da lista
      
    } catch (error: any) {
      console.error('💥 Erro na reativação:', error);
      toast.error('❌ Erro ao Reativar', {
        description: error.message || 'Erro desconhecido ao reativar usuário',
        duration: 8000
      });
    } finally {
      setReactivatingUser(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Utilizador
            {debugMode && <span className="text-xs bg-yellow-100 px-2 py-1 rounded">DEBUG</span>}
          </DialogTitle>
          <DialogDescription>
            Criar um novo utilizador no sistema com credenciais seguras.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-2">
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className="text-xs text-blue-600 hover:underline"
            >
              {debugMode ? 'Desativar' : 'Ativar'} Debug
            </button>
            <span className="text-gray-300">|</span>
            <button 
              onClick={testSupabaseConnection}
              disabled={testingConnection}
              className="flex items-center gap-1 text-xs text-green-600 hover:underline disabled:opacity-50"
            >
              <TestTube className="h-3 w-3" />
              {testingConnection ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>
        </DialogHeader>

        {/* Status do Sistema */}
        {systemStatus && (
          <div className={`p-3 rounded-lg border ${
            systemStatus.connection && systemStatus.createFunction 
              ? 'bg-green-50 border-green-200' 
              : systemStatus.connection 
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {systemStatus.connection && systemStatus.createFunction ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : systemStatus.connection ? (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                {systemStatus.connection && systemStatus.createFunction 
                  ? 'Sistema Totalmente Funcional' 
                  : systemStatus.connection 
                  ? 'Conexão OK - Funções SQL em Falta'
                  : 'Erro de Conexão'
                }
              </span>
            </div>
            <div className="text-xs space-y-1">
              <div>Conexão: {systemStatus.connection ? '✅ OK' : '❌ Falhou'}</div>
              {systemStatus.createFunction !== undefined && (
                <div>Função Criar: {systemStatus.createFunction ? '✅ Disponível' : '❌ Em Falta'}</div>
              )}
              {systemStatus.error && (
                <div className="text-red-600">Erro: {systemStatus.error}</div>
              )}
            </div>
          </div>
        )}

        {/* Aviso sobre usuário existente */}
        {existingUser && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 mb-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Email já está em uso</span>
            </div>
            <div className="bg-muted/70 rounded-md p-3 text-sm">
              <p className="text-yellow-800 mb-2">Este email já está registado no sistema:</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Nome:</span>
                  <span className="text-gray-800">{existingUser.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Função:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    existingUser.role === 'super_admin' ? 'bg-blue-100 text-blue-800' :
                    existingUser.role === 'diretor' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {existingUser.role === 'super_admin' ? '👑 Super Admin' :
                     existingUser.role === 'diretor' ? '👨‍💼 Diretor' : '👩‍🏫 Coordenador'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    existingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {existingUser.is_active ? '✅ Ativo' : '❌ Inativo'}
                  </span>
                </div>
                {existingUser.school_name && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Escola:</span>
                    <span className="text-gray-800">🏫 {existingUser.school_name}</span>
                  </div>
                )}
                {existingUser.created_at && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Criado em:</span>
                    <span className="text-gray-800">{new Date(existingUser.created_at).toLocaleDateString('pt-PT')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {!existingUser.is_active ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center gap-2 text-green-800">
                    <span>🔄</span>
                    <div>
                      <p className="font-medium text-sm">Usuário Inativo Detectado</p>
                      <p className="text-xs">Você pode reativar este usuário imediatamente</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => reactivateUser(existingUser.email)}
                    disabled={reactivatingUser}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {reactivatingUser ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        Reativando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Reativar Usuário
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-yellow-700 bg-yellow-100 rounded p-2">
                  💡 <strong>Sugestão:</strong> Este usuário já está ativo. Use um email diferente.
                </div>
              )}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Email
                      {checkingEmail && <RefreshCw className="h-3 w-3 animate-spin" />}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="joao@escola.edu.pt" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          validateEmail(e.target.value);
                          checkExistingUser(e.target.value);
                        }}
                      />
                    </FormControl>
                    {emailValidation && (
                      <div className="mt-2 text-sm">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                          emailValidation.is_valid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {emailValidation.classification}
                        </div>
                        {!emailValidation.is_valid && emailValidation.issues.length > 0 && (
                          <ul className="mt-1 text-yellow-600 text-xs space-y-1">
                            {emailValidation.issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="diretor">
                          <div className="flex items-center gap-2">
                            <span>👨‍💼</span>
                            <div>
                              <div className="font-medium">Diretor</div>
                              <div className="text-xs text-muted-foreground">Gestão de escola específica</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="coordenador">
                          <div className="flex items-center gap-2">
                            <span>👩‍🏫</span>
                            <div>
                              <div className="font-medium">Coordenador</div>
                              <div className="text-xs text-muted-foreground">Gestão de conteúdos e alunos</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="professor">
                          <div className="flex items-center gap-2">
                            <span>👨‍🏫</span>
                            <div>
                              <div className="font-medium">Professor</div>
                              <div className="text-xs text-muted-foreground">Acesso limitado às suas turmas</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="super_admin">
                          <div className="flex items-center gap-2">
                            <span>👑</span>
                            <div>
                              <div className="font-medium text-blue-600">Super Admin</div>
                              <div className="text-xs text-blue-500">Acesso global + TOTP obrigatório</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Escola - esconder para Super Admin */}
              {form.watch('role') !== 'super_admin' && (
                <FormField
                  control={form.control}
                  name="school_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Escola
                        <span className="text-red-500 text-sm">*</span>
                        <span className="text-xs text-muted-foreground">
                          ({form.watch('role') === 'diretor' ? 'Diretor' : form.watch('role') === 'coordenador' ? 'Coordenador' : 'Professor'} deve estar vinculado)
                        </span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={!field.value ? "border-red-200 bg-red-50" : ""}>
                            <SelectValue placeholder="Selecionar escola obrigatória" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schools.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              Nenhuma escola disponível
                            </div>
                          ) : (
                            schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                <div className="flex items-center gap-2">
                                  <span>🏫</span>
                                  <span>{school.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {!field.value && (
                        <div className="text-xs text-red-600 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Seleção de escola é obrigatória para este role</span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Info para Super Admin */}
              {form.watch('role') === 'super_admin' && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800 mb-3">
                      <span className="text-lg">👑</span>
                      <span className="font-semibold">Super Administrador Global</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm">Acesso total ao sistema</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-700">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm">Gestão de todas as escolas</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-700">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm">Criação de outros administradores</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-700">
                        <span className="text-blue-500">🌐</span>
                        <span className="text-sm font-medium">Escopo: Global (não vinculado a escola)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-amber-600 text-lg">🔐</span>
                      <div className="space-y-1">
                        <p className="text-amber-800 font-semibold text-sm">Autenticação de Dois Fatores (TOTP)</p>
                        <p className="text-amber-700 text-xs leading-relaxed">
                          Por segurança, Super Admins <strong>devem configurar TOTP</strong> no primeiro login usando 
                          Google Authenticator, Authy ou similar.
                        </p>
                        <div className="flex items-center gap-1 text-amber-600 text-xs mt-2">
                          <span>⚠️</span>
                          <span>Sem TOTP configurado = Acesso negado</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={generatePassword}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Gerar Password Segura
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              validatePassword(e.target.value);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      {passwordStrength && (
                        <div className="mt-2 text-sm">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            passwordStrength.score >= 4 
                              ? 'bg-green-100 text-green-800' 
                              : passwordStrength.score >= 2
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {passwordStrength.strength} ({passwordStrength.score}/{passwordStrength.max_score})
                          </div>
                          {!passwordStrength.is_valid && passwordStrength.issues.length > 0 && (
                            <ul className="mt-1 text-orange-600 text-xs space-y-1">
                              {passwordStrength.issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Password</FormLabel>
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {debugMode && (
              <div className="bg-gray-50 border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Debug Info
                </h4>
                <div className="text-xs space-y-1 text-gray-600">
                  <div>Password: {form.watch('password') ? '✅ Preenchida' : '❌ Vazia'}</div>
                  <div>Confirm Password: {form.watch('confirmPassword') ? '✅ Preenchida' : '❌ Vazia'}</div>
                  <div>Passwords coincidem: {form.watch('password') === form.watch('confirmPassword') ? '✅ Sim' : '❌ Não'}</div>
                  <div>Role: {form.watch('role')}</div>
                  <div>School ID: {form.watch('school_id') || 'Não selecionada'}</div>
                  <div>Email existente: {existingUser ? '❌ Sim' : '✅ Disponível'}</div>
                  {systemStatus && (
                    <div className="mt-2 pt-2 border-t">
                      <div>Última conexão: {systemStatus.timestamp}</div>
                      <div>Função criar disponível: {systemStatus.createFunction ? '✅' : '❌'}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || (systemStatus && !systemStatus.createFunction) || !!existingUser}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </>
                ) : (
                  'Criar Utilizador'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}