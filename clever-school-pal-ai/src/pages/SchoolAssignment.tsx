import { useState, useEffect, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Building,
  AlertCircle,
  CheckCircle,
  School,
  ArrowRight,
  Users,
  MapPin,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { logger } from "@/lib/logger";

interface School {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  description?: string;
  address?: string;
}

export default function SchoolAssignment() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useUnifiedAuth();
  
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingSchools, setFetchingSchools] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Se o usuário já tem school_id, redirecionar
    if (user?.school_id) {
      logger.info('User already has school_id, redirecting', { school_id: user.school_id });
      startTransition(() => {
        navigate(`/escola/${user.school_id}`, { replace: true });
      });
      return;
    }

    fetchSchools();
  }, [user, navigate]);

  const fetchSchools = async () => {
    try {
      setFetchingSchools(true);
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, slug, created_at, description, address')
        .order('name');

      if (error) {
        logger.error('Error fetching schools', { error });
        setError('Erro ao carregar escolas disponíveis');
        return;
      }

      setSchools(data || []);
    } catch (err) {
      logger.error('Unexpected error fetching schools', { err });
      setError('Erro inesperado ao carregar escolas');
    } finally {
      setFetchingSchools(false);
    }
  };

  const handleAssignSchool = async () => {
    if (!selectedSchool || !user) {
      setError("Por favor, selecione uma escola");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      logger.info('Assigning school to user', { 
        userId: user.id, 
        schoolId: selectedSchool,
        userRole: user.role 
      });

      // Primeiro, vamos tentar atualizar os metadados do usuário no Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          school_id: selectedSchool
        }
      });

      if (updateError) {
        logger.error('Error updating user metadata', { updateError });
        setError('Erro ao atribuir escola ao usuário');
        return;
      }

      // Aguardar um pouco para garantir que os metadados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar o contexto de autenticação
      await refreshUser();

      setSuccess("Escola atribuída com sucesso! Redirecionando...");
      
      // Redirecionar após sucesso
      setTimeout(() => {
        startTransition(() => {
          navigate(`/escola/${selectedSchool}`, { replace: true });
        });
      }, 2000);

    } catch (err) {
      logger.error('Unexpected error assigning school', { err });
      setError('Erro inesperado ao atribuir escola');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      super_admin: { label: "Super Admin", className: "bg-red-100 text-red-700" },
      admin: { label: "Admin", className: "bg-blue-100 text-blue-700" },
      diretor: { label: "Diretor", className: "bg-green-100 text-green-700" },
      coordenador: { label: "Coordenador", className: "bg-purple-100 text-purple-700" }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || 
                  { label: role, className: "bg-gray-100 text-gray-700" };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (fetchingSchools) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Carregando escolas disponíveis...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1"></div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <School className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Atribuição de Escola</h1>
          <p className="text-gray-600">Selecione a escola para continuar</p>
        </div>

        {/* User Info Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Informações do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <div>
                {user?.role && getRoleBadge(user.role)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Selection Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-green-600" />
              Escolas Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            {schools.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma escola encontrada. Entre em contato com o administrador do sistema.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Selecione a escola que você administra:
                </p>
                
                <div className="grid gap-3 max-h-64 overflow-y-auto">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedSchool === school.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedSchool(school.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{school.name}</h3>
                          {school.description && (
                            <p className="text-sm text-gray-600 mt-1">{school.description}</p>
                          )}
                          {school.address && (
                            <div className="flex items-center gap-1 mt-2">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{school.address}</span>
                            </div>
                          )}
                        </div>
                        {selectedSchool === school.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleAssignSchool}
                  disabled={loading || !selectedSchool}
                  className="w-full mt-4"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Atribuindo Escola...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Continuar para Escola
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="shadow-lg border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-yellow-800">
                  Importante
                </p>
                <p className="text-sm text-yellow-700">
                  Após selecionar a escola, você será redirecionado para o painel de administração 
                  específico da instituição. Esta atribuição pode ser alterada posteriormente 
                  pelo administrador do sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}