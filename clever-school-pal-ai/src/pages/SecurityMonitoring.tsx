import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVisibleInterval } from "@/hooks/use-page-visibility";
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Globe, 
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Eye
} from "lucide-react";

interface SecurityDashboard {
  active_alerts: number;
  recent_events: number;
  failed_logins_today: number;
  unique_ips_today: number;
  avg_response_time: number;
  system_health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export default function SecurityMonitoring() {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      // Simular dados para demonstração (em produção, usar RPC real)
      const mockDashboard: SecurityDashboard = {
        active_alerts: 0,
        recent_events: 12,
        failed_logins_today: 2,
        unique_ips_today: 5,
        avg_response_time: 245,
        system_health: 'HEALTHY'
      };

      setDashboard(mockDashboard);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Timer inteligente que para quando página está oculta
  useVisibleInterval(
    loadDashboardData,
    autoRefresh ? 30000 : null, // 30 segundos ou null para desabilitar
    false // não executar imediatamente
  );

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return <Badge className="bg-green-100 text-green-700">🟢 Saudável</Badge>;
      case 'WARNING':
        return <Badge className="bg-yellow-100 text-yellow-700">🟡 Atenção</Badge>;
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-700">🔴 Crítico</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">❓ Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span>Carregando dados de segurança...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Monitoramento de Segurança
          </h1>
          <p className="text-gray-600 mt-1">Monitoramento em tempo real - Nível Enterprise</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      {dashboard && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {getHealthBadge(dashboard.system_health)}
                </div>
                <div className="text-sm text-gray-600">
                  Última atualização: {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
              
              {dashboard.system_health !== 'HEALTHY' && (
                <Alert className="max-w-md">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Sistema requer atenção. Verifique os alertas ativos.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alertas Ativos</p>
                  <p className="text-3xl font-bold text-red-600">{dashboard.active_alerts}</p>
                </div>
                <Bell className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eventos (24h)</p>
                  <p className="text-3xl font-bold text-blue-600">{dashboard.recent_events}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Logins Falhados</p>
                  <p className="text-3xl font-bold text-orange-600">{dashboard.failed_logins_today}</p>
                </div>
                <XCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">IPs Únicos</p>
                  <p className="text-3xl font-bold text-green-600">{dashboard.unique_ips_today}</p>
                </div>
                <Globe className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Eventos Recentes Simulados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Eventos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-blue-600">Baixa</Badge>
                <div>
                  <p className="font-medium">login_success</p>
                  <p className="text-sm text-gray-600">admin@connectai.pt • [IP oculto]</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-yellow-600">Média</Badge>
                <div>
                  <p className="font-medium">password_reset_requested</p>
                  <p className="text-sm text-gray-600">user@example.com • 192.168.1.100</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{new Date(Date.now() - 300000).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      {dashboard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tempo Médio de Resposta</p>
                  <p className="text-2xl font-bold">{dashboard.avg_response_time}ms</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status da API</p>
                  <p className="text-2xl font-bold text-green-600">Online</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recursos Enterprise */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Shield className="w-5 h-5" />
            Recursos Enterprise Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">MFA Habilitado</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Auditoria de Segurança</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Detecção de Anomalias</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Alertas em Tempo Real</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Rate Limiting</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Criptografia Avançada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
