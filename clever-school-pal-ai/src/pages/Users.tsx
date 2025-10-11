import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users as UsersIcon, 
  Search, 
  Shield,
  School,
  MoreHorizontal,
  Building,
  Eye,
  EyeOff,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  Ban,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { updateUserName } from "@/lib/auth-simplified";
import { Header } from "@/components/layout/Header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CreateUserDialog from '@/components/forms/CreateUserDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'diretor' | 'coordenador' | 'professor';
  school_name?: string;
  school_id?: string;
  last_sign_in_at?: string;
  created_at: string;
  email_confirmed_at?: string;
}

interface School {
  id: string;
  name: string;
  slug?: string;
}

interface UserDependencies {
  success: boolean;
  can_delete: boolean;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
  user_info: {
    email: string;
    name: string;
    role: string;
    school_id: string | null;
  };
  dependencies: {
    contents: number;
    media_files: number;
    chat_logs: number;
    total: number;
  };
  warnings: string[];
  recommended_action: string;
  transfer_required: boolean;
}

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação obrigatória")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords não coincidem",
  path: ["confirmPassword"]
});

const editUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo")
});

export default function Users() {
  const { user: currentUser, refreshUser } = useUnifiedAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAnalysis, setDeleteAnalysis] = useState<UserDependencies | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const resetForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" }
  });

  const editForm = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "" }
  });

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Usar função RPC personalizada que funciona com anon key
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('list_admin_users');
        
        if (!rpcError && rpcData) {
          const translateRole = (role: string | null | undefined): User['role'] => {
            switch (role) {
              case 'super_admin':
                return 'super_admin';
              case 'director':
                return 'diretor';
              case 'coordinator':
                return 'coordenador';
              case 'teacher':
                return 'professor';
              case 'diretor':
              case 'coordenador':
              case 'professor':
                return role;
              default:
                return 'diretor';
            }
          };

          const formattedUsers = rpcData.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name || 'Sem nome',
            role: translateRole(user.role),
            school_id: user.school_id || null,
            school_name: user.school_name || 'Global',
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
            created_at: user.created_at
          }));

          setUsers(formattedUsers);
          
          if (import.meta.env.DEV) {
            console.log('✅ Usuários admin carregados via RPC:', formattedUsers.length);
          }
          return;
        }
      } catch (rpcError) {
        console.warn('⚠️ RPC list_admin_users falhou:', rpcError);
      }

      // Fallback: mostrar usuários mock para desenvolvimento
      const mockUsers = [
        {
          id: 'mock-1',
          email: 'admin@escola.com',
          name: 'Administrador Sistema',
          role: 'super_admin',
          school_id: null,
          school_name: 'Global',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          email: 'diretor@escola.com',
          name: 'Diretor Escola',
          role: 'diretor',
          school_id: '550e8400-e29b-41d4-a716-446655440000',
          school_name: 'Escola Exemplo',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-3',
          email: 'professor@escola.com',
          name: 'Professor Exemplo',
          role: 'professor',
          school_id: '550e8400-e29b-41d4-a716-446655440000',
          school_name: 'Escola Exemplo',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ];

      setUsers(mockUsers);
      
      if (import.meta.env.DEV) {
        console.log('⚠️ Usando usuários mock (função RPC não disponível)');
      }
      
      toast.warning('Exibindo dados de exemplo - configure a função RPC list_admin_users no Supabase');
      
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data } = await supabase.from('schools').select('id, name');
      setSchools(data || []);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
    }
  };

  const handleResetPassword = async (data: any) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      
      // Usar função unificada para reset de password
      const { data: result, error } = await (supabase as any).rpc('reset_user_password_unified', {
        p_user_email: selectedUser.email,
        p_new_password: data.newPassword
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      toast.success('✅ Password Resetada!', {
        description: `Password atualizada para ${selectedUser.name || selectedUser.email}`,
        duration: 5000
      });

      setShowResetDialog(false);
      resetForm.reset();
      
    } catch (error: any) {
      console.error('Erro no reset de password:', error);
      toast.error('❌ Erro ao Resetar Password', {
        description: error.message || 'Erro desconhecido',
        duration: 8000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (data: any) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      
      const { data: result, error } = await (supabase as any).rpc('update_user_simple', {
        user_email: selectedUser.email,
        new_name: data.name,
        new_role: null
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      toast.success('✅ Nome atualizado com sucesso', {
        description: `Nome alterado para: ${data.name}`
      });
      
      // Se o usuário editou o próprio nome, atualizar imediatamente
      if (selectedUser.email === currentUser?.email) {
        // Atualizar nome na sessão local (aparece imediatamente no header)
        updateUserName(data.name);
        // Forçar atualização do contexto sem relogar
        await refreshUser();
      }
      
      setShowEditDialog(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erro ao editar nome: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const analyzeAndConfirmDelete = async (user: User) => {
    if (user.email === currentUser?.email) {
      toast.error('❌ Não pode eliminar a sua própria conta', {
        description: 'Por motivos de segurança, não pode eliminar-se a si próprio.'
      });
      return;
    }

    setActionLoading(true);
    
    try {
      // Análise inteligente de dependências
      const { data: analysis, error } = await (supabase as any).rpc('analyze_user_dependencies_unified', {
        p_user_email: user.email
      });

      if (error) throw error;
      if (!analysis.success) throw new Error(analysis.error);

      setDeleteAnalysis(analysis);
      setSelectedUser(user);
      setShowDeleteDialog(true);

    } catch (error: any) {
      console.warn('Erro na análise de dependências:', error);
      // Fallback para confirmação básica se análise falhar
      setSelectedUser(user);
      setDeleteAnalysis({
        success: true,
        can_delete: true,
        risk_level: 'MEDIUM',
        user_info: {
          email: user.email,
          name: user.name || 'Sem nome',
          role: user.role,
          school_id: user.school_id
        },
        dependencies: { contents: 0, media_files: 0, chat_logs: 0, total: 0 },
        warnings: ['Análise detalhada não disponível'],
        recommended_action: 'REVIEW_REQUIRED',
        transfer_required: false
      });
      setShowDeleteDialog(true);
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    
    try {
      const { data, error } = await (supabase as any).rpc('hard_delete_user_unified', {
        p_user_email: selectedUser.email
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Notificação de sucesso estilo 2025
      toast.success('✅ Utilizador eliminado com sucesso', {
        description: `${selectedUser.name || selectedUser.email} foi removido do sistema`,
        duration: 5000
      });

      // Mostrar avisos sobre dados órfãos se existirem
      if (deleteAnalysis?.dependencies.total > 0) {
        setTimeout(() => {
          toast.warning('📋 Dados órfãos no sistema', {
            description: `${deleteAnalysis.dependencies.total} itens ficaram órfãos e podem ser limpos posteriormente`,
            duration: 8000
          });
        }, 1000);
      }

      setShowDeleteDialog(false);
      setSelectedUser(null);
      setDeleteAnalysis(null);
      fetchUsers();

    } catch (error: any) {
      toast.error('❌ Erro ao eliminar utilizador', {
        description: error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: User, activate: boolean) => {
    try {
      const { data: result, error } = await (supabase as any).rpc('toggle_user_status', {
        p_user_email: user.email,
        p_activate: activate
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      const actionText = activate ? 'ativado' : 'desativado';
      toast.success(`✅ Utilizador ${actionText}`, {
        description: `${user.name || user.email} foi ${actionText} com sucesso`
      });
      
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleConfirmEmail = async (user: User) => {
    try {
      setActionLoading(true);
      
      const { data: result, error } = await (supabase as any).rpc('auto_confirm_user_email', {
        user_email: user.email
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      toast.success('✅ Email Confirmado!', {
        description: `Email de ${user.name || user.email} foi confirmado automaticamente`,
        duration: 5000
      });
      
      fetchUsers();
    } catch (error: any) {
      toast.error('❌ Erro ao Confirmar Email', {
        description: error.message || 'Erro desconhecido',
        duration: 8000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAllEmails = async () => {
    try {
      setActionLoading(true);
      
      const { data: result, error } = await (supabase as any).rpc('confirm_all_pending_emails');

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      toast.success('✅ Todos os Emails Confirmados!', {
        description: `${result.confirmed_count} emails foram confirmados automaticamente`,
        duration: 5000
      });
      
      fetchUsers();
    } catch (error: any) {
      toast.error('❌ Erro ao Confirmar Emails', {
        description: error.message || 'Erro desconhecido',
        duration: 8000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    resetForm.setValue('newPassword', password);
    resetForm.setValue('confirmPassword', password);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      super_admin: { label: 'Super Admin', variant: 'default' as const },
      diretor: { label: 'Diretor', variant: 'secondary' as const },
      coordenador: { label: 'Coordenador', variant: 'outline' as const },
      professor: { label: 'Professor', variant: 'secondary' as const }
    };
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.email_confirmed_at).length,
    superAdmins: users.filter(u => u.role.includes('super_admin')).length,
    pending: users.filter(u => !u.email_confirmed_at).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando utilizadores...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Gestão de Utilizadores"
        subtitle="Gerencie todos os utilizadores do sistema"
      />
      
      <main className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                <Shield className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.superAdmins}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <UsersIcon className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar utilizadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="diretor">Diretor</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Criar Utilizador
            </Button>
            {stats.pending > 0 && (
              <Button 
                onClick={handleConfirmAllEmails} 
                variant="outline" 
                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Confirmar Todos ({stats.pending})
              </Button>
            )}
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Utilizadores do Sistema</CardTitle>
              <CardDescription>
                {filteredUsers.length} de {users.length} utilizadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Escola</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead className="w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 loading-shimmer rounded w-full"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <UsersIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nenhum utilizador encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {getRoleBadge(user.role)}
                          </TableCell>
                          <TableCell>
                            {user.school_name ? (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {user.school_name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Global</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                              {user.email_confirmed_at ? "Ativo" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString('pt-PT')
                              : 'Nunca'
                            }
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={actionLoading}>
                                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    editForm.reset({
                                      name: user.name
                                    });
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowResetDialog(true);
                                  }}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Reset Password
                                </DropdownMenuItem>

                                {!user.email_confirmed_at && (
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmEmail(user)}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Confirmar Email
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => handleToggleUserStatus(user, !user.email_confirmed_at)}
                                >
                                  {user.email_confirmed_at ? (
                                    <>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem
                                  onClick={() => analyzeAndConfirmDelete(user)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={user.email === currentUser?.email}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar Utilizador
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Reset Password Dialog */}
          <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Resetar password para {selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              {...field} 
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={generatePassword}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Password</FormLabel>
                        <FormControl>
                          <Input type={showPassword ? "text" : "password"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowResetDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Reset Password</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Nome do Utilizador</DialogTitle>
                <DialogDescription>
                  Alterar o nome de {selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Informações do Utilizador (apenas leitura) */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-center mb-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                      📋 Informações do Utilizador
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <p className="text-sm text-slate-900 dark:text-slate-100 mt-1 font-mono bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-600">{selectedUser?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                    <div className="mt-1">
                      {getRoleBadge(selectedUser?.role || '')}
                    </div>
                  </div>
                  {selectedUser?.school_name && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Escola</label>
                      <p className="text-sm text-slate-900 dark:text-slate-100 mt-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-600">{selectedUser.school_name}</p>
                    </div>
                  )}
                </div>

                {/* Formulário de Edição */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-center mb-3">
                    <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
                      ✏️ Campo Editável
                    </span>
                  </div>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-800 dark:text-blue-200 font-semibold">Nome do Utilizador</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Digite o nome completo"
                                className="text-base border-2 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-900"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={actionLoading}>
                          {actionLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Nome'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create User Dialog */}
          <CreateUserDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            schools={schools}
            onUserCreated={fetchUsers}
          />

          {/* Dialog de confirmação de eliminação moderno */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {deleteAnalysis?.risk_level === 'BLOCKED' && <Ban className="h-5 w-5 text-red-500" />}
                  {deleteAnalysis?.risk_level === 'HIGH' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                  {deleteAnalysis?.risk_level === 'MEDIUM' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {deleteAnalysis?.risk_level === 'LOW' && <Trash2 className="h-5 w-5 text-muted-foreground" />}
                  
                  {deleteAnalysis?.risk_level === 'BLOCKED' ? 'Eliminação Bloqueada' : 'Confirmar Eliminação'}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      {deleteAnalysis?.risk_level === 'BLOCKED' 
                        ? `Não é possível eliminar ${selectedUser?.name || selectedUser?.email}.`
                        : `Tem a certeza que pretende eliminar ${selectedUser?.name || selectedUser?.email}?`
                      }
                    </p>

                    {deleteAnalysis?.dependencies && deleteAnalysis.dependencies.total > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-800 mb-2">⚠️ Dados que serão afetados:</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {deleteAnalysis.dependencies.contents > 0 && (
                            <li>• {deleteAnalysis.dependencies.contents} conteúdos educacionais</li>
                          )}
                          {deleteAnalysis.dependencies.media_files > 0 && (
                            <li>• {deleteAnalysis.dependencies.media_files} ficheiros de media</li>
                          )}
                          {deleteAnalysis.dependencies.chat_logs > 0 && (
                            <li>• {deleteAnalysis.dependencies.chat_logs} mensagens de chat</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {deleteAnalysis?.warnings && deleteAnalysis.warnings.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-800 mb-2">🚨 Avisos importantes:</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {deleteAnalysis.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {deleteAnalysis?.risk_level !== 'BLOCKED' && (
                      <p className="text-sm text-muted-foreground">
                        Esta ação não pode ser desfeita.
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                {deleteAnalysis?.can_delete && (
                  <AlertDialogAction
                    onClick={executeDeleteUser}
                    disabled={actionLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      'Eliminar Definitivamente'
                    )}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </>
  );
}