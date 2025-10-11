import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Shield, Edit, History, Users, AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_name: string;
  organization_id: string;
  created_at: string;
  role_changes_count: number;
  last_role_change: string;
}

interface RoleChange {
  id: string;
  old_role: string;
  new_role: string;
  reason: string;
  created_at: string;
  changed_by_email: string;
}

const roleColors = {
  customer: 'bg-blue-100 text-blue-800',
  restaurant_admin: 'bg-green-100 text-green-800',
  kitchen: 'bg-orange-100 text-orange-800',
  driver: 'bg-purple-100 text-purple-800',
  super_admin: 'bg-red-100 text-red-800',
  platform_owner: 'bg-gray-100 text-gray-800'
};

const roleLabels = {
  customer: 'Cliente',
  restaurant_admin: 'Admin Restaurante',
  kitchen: 'Cozinha',
  driver: 'Motorista',
  super_admin: 'Super Admin',
  platform_owner: 'Platform Owner'
};

export function UserRoleManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [roleHistory, setRoleHistory] = useState<RoleChange[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setCurrentUserRole(data.role);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          created_at,
          organization_id,
          organizations(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedUsers = data?.map(user => ({
        ...user,
        organization_name: user.organizations?.name || 'N/A',
        role_changes_count: 0,
        last_role_change: null
      })) || [];
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de utilizadores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleHistory = async (userId: string) => {
    try {
      // Temporariamente desabilitado até a migração role_changes ser aplicada
      console.log('Role history feature temporarily disabled for user:', userId);
      setRoleHistory([]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const changeUserRole = async () => {
    if (!selectedUser || !newRole || !changeReason.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use direct update instead of RPC for now
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Role alterado para ${roleLabels[newRole as keyof typeof roleLabels]}`,
      });
      
      // Atualizar lista
      fetchUsers();
      setSelectedUser(null);
      setNewRole('');
      setChangeReason('');
    } catch (error: any) {
      console.error('Erro ao alterar role:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar role do utilizador",
        variant: "destructive"
      });
    }
  };

  const canChangeRole = (userRole: string) => {
    if (currentUserRole === 'platform_owner') return true;
    if (currentUserRole === 'super_admin' && userRole !== 'platform_owner') return true;
    return false;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 animate-spin" />
            <span>Carregando utilizadores...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Gestão de Roles de Utilizadores</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Sistema de Roles</span>
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Signup automático:</strong> Novos utilizadores recebem role "Cliente" por defeito</li>
              <li>• <strong>Platform Owner:</strong> Pode alterar qualquer role em qualquer organização</li>
              <li>• <strong>Super Admin:</strong> Pode alterar roles dentro da sua organização</li>
              <li>• <strong>Auditoria:</strong> Todas as mudanças são registadas com razão e data</li>
            </ul>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role Atual</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Mudanças</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-gray-500">
                        Registado: {new Date(user.created_at).toLocaleDateString('pt-PT')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                      {roleLabels[user.role as keyof typeof roleLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.organization_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.role_changes_count} mudanças</div>
                      {user.last_role_change && (
                        <div className="text-gray-500">
                          Última: {new Date(user.last_role_change).toLocaleDateString('pt-PT')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {canChangeRole(user.role) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Alterar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Alterar Role - {user.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Novo Role</label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(roleLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Razão da Mudança *</label>
                                <Textarea
                                  value={changeReason}
                                  onChange={(e) => setChangeReason(e.target.value)}
                                  placeholder="Descreva o motivo da alteração..."
                                  rows={3}
                                />
                              </div>
                              <div className="flex space-x-2">
                                <Button onClick={changeUserRole} className="flex-1">
                                  Confirmar Alteração
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <Dialog open={showHistory} onOpenChange={setShowHistory}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fetchRoleHistory(user.id);
                              setShowHistory(true);
                            }}
                          >
                            <History className="h-3 w-3 mr-1" />
                            Histórico
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Histórico de Roles - {user.full_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {roleHistory.map((change) => (
                              <div key={change.id} className="border-l-4 border-blue-500 pl-4 py-2">
                                <div className="flex items-center space-x-2">
                                  <Badge className={roleColors[change.old_role as keyof typeof roleColors] || 'bg-gray-100'}>
                                    {roleLabels[change.old_role as keyof typeof roleLabels] || change.old_role}
                                  </Badge>
                                  <span>→</span>
                                  <Badge className={roleColors[change.new_role as keyof typeof roleColors]}>
                                    {roleLabels[change.new_role as keyof typeof roleLabels]}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  <div><strong>Por:</strong> {change.changed_by_email}</div>
                                  <div><strong>Data:</strong> {new Date(change.created_at).toLocaleString('pt-PT')}</div>
                                  <div><strong>Razão:</strong> {change.reason}</div>
                                </div>
                              </div>
                            ))}
                            {roleHistory.length === 0 && (
                              <div className="text-center text-gray-500 py-4">
                                Nenhuma mudança de role registada
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum utilizador encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 