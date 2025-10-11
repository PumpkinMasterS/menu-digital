import { useState, useEffect, startTransition } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Shield, CheckCircle, AlertCircle, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TokenData {
  email: string;
  admin_name: string;
  admin_role: string;
  is_valid: boolean;
}

export default function FirstAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Token de acesso não fornecido");
      setIsValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log("Validando token:", token?.substring(0, 10) + '...');
      }
      
      // @ts-expect-error - Função RPC personalizada
      const { data, error } = await supabase.rpc('check_token_validity', {
        token_input: token
      });

      if (import.meta.env.DEV) {
        console.log("Resultado da validação:", { data: data ? 'Success' : 'Failed', error: error?.message });
      }

      if (error) {
        console.error("Erro na consulta:", error);
        setError("Erro ao validar token");
        setIsValidating(false);
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const tokenInfo = data[0] as any;
        
        if (import.meta.env.DEV) {
          console.log("Token data:", { email: tokenInfo.email, role: tokenInfo.admin_role });
        }

        if (tokenInfo.is_valid) {
          setTokenData({
            email: tokenInfo.email,
            admin_name: tokenInfo.admin_name,
            admin_role: tokenInfo.admin_role,
            is_valid: true
          });
        } else {
          setError("Token expirado ou já utilizado");
        }
      } else {
        setError("Token não encontrado");
      }
    } catch (err) {
      console.error("Erro ao validar token:", err);
      setError("Erro ao validar token de acesso");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validações
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("A senha deve conter pelo menos: 1 minúscula, 1 maiúscula e 1 número");
      return;
    }

    setIsLoading(true);

    try {
      if (import.meta.env.DEV) {
        console.log("Ativando admin...");
      }

      // @ts-expect-error - Função RPC personalizada
      const { data, error } = await supabase.rpc('activate_admin_simple', {
        token_input: token,
        password_input: password
      });

      if (import.meta.env.DEV) {
        console.log("Resultado da ativação:", { data: data ? 'Success' : 'Failed', error: error?.message });
      }

      if (error) {
        console.error("Erro ao ativar admin:", error);
        setError("Erro ao criar conta de administrador");
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0] as any;
        if (result.success) {
          setSuccess("Conta ativada com sucesso! Redirecionando...");
          setTimeout(() => {
            startTransition(() => {
              navigate("/login");
            });
          }, 2000);
        } else {
          setError(result.message || "Erro ao ativar conta");
        }
      } else {
        setError("Resposta inesperada do servidor");
      }

    } catch (err) {
      console.error("Erro ao ativar conta:", err);
      setError("Erro interno do servidor");
    } finally {
      setIsLoading(false);
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

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Validando token de acesso...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenData || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
          </div>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || "Token de acesso inválido"}</AlertDescription>
              </Alert>
              
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => startTransition(() => navigate("/login"))}
                  className="w-full"
                >
                  Voltar ao Login
                </Button>
              </div>

              {/* Debug info - apenas em desenvolvimento */}
              {import.meta.env.DEV && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                  <div><strong>Token:</strong> {token?.substring(0, 10)}...</div>
                  <div><strong>Erro:</strong> {error}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
          </div>
                          <h1 className="text-2xl font-bold text-gray-900">Connect AI</h1>
          <p className="text-gray-600">Primeiro Acesso - Ativação de Conta</p>
        </div>

        {/* User Info */}
        <Card className="shadow-lg border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Token Válido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{tokenData.admin_name}</div>
                <div className="text-sm text-gray-600">{tokenData.email}</div>
              </div>
              {getRoleBadge(tokenData.admin_role)}
            </div>
          </CardContent>
        </Card>

        {/* Activation Form */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              Definir Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-gray-600 space-y-1">
                <div>A senha deve conter:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Pelo menos 8 caracteres</li>
                  <li>1 letra minúscula</li>
                  <li>1 letra maiúscula</li>
                  <li>1 número</li>
                </ul>
              </div>

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

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ativando Conta...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Ativar Conta
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
                      © 2024 Connect AI. Sistema Multi-Tenant.
        </div>
      </div>
    </div>
  );
}
