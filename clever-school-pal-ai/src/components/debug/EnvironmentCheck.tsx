import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const EnvironmentCheck: React.FC = () => {
  const requiredEnvVars = {
    'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const optionalEnvVars = {
    'VITE_APP_ENVIRONMENT': import.meta.env.VITE_APP_ENVIRONMENT,
    'VITE_DEBUG_MODE': import.meta.env.VITE_DEBUG_MODE,
    'VITE_WHATSAPP_ENABLED': import.meta.env.VITE_WHATSAPP_ENABLED,
  };

  const getStatusIcon = (value: string | undefined, required = false) => {
    if (!value) {
      return required ? 
        <XCircle className="h-4 w-4 text-red-500" /> : 
        <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (value: string | undefined, required = false) => {
    if (!value) {
      return required ? 
        <Badge variant="destructive">Missing</Badge> : 
        <Badge variant="secondary">Optional</Badge>;
    }
    return <Badge variant="default">OK</Badge>;
  };

  const hasAllRequired = Object.values(requiredEnvVars).every(val => val);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Environment Check</h1>
        <p className="text-muted-foreground">
          Verificação das variáveis de ambiente necessárias
        </p>
        {hasAllRequired ? (
          <Badge variant="default" className="bg-green-500">
            ✅ Todas as variáveis obrigatórias estão configuradas
          </Badge>
        ) : (
          <Badge variant="destructive">
            ❌ Algumas variáveis obrigatórias estão faltando
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variáveis Obrigatórias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(requiredEnvVars).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(value, true)}
                  <div>
                    <div className="font-medium">{key}</div>
                    <div className="text-sm text-muted-foreground">
                      {value ? `${value.slice(0, 20)}...` : 'Não configurada'}
                    </div>
                  </div>
                </div>
                {getStatusBadge(value, true)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variáveis Opcionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(optionalEnvVars).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(value, false)}
                  <div>
                    <div className="font-medium">{key}</div>
                    <div className="text-sm text-muted-foreground">
                      {value || 'Não configurada'}
                    </div>
                  </div>
                </div>
                {getStatusBadge(value, false)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Modo de Desenvolvimento</div>
              <div className="text-sm text-muted-foreground">
                {import.meta.env.DEV ? 'Ativado' : 'Desativado'}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Modo de Produção</div>
              <div className="text-sm text-muted-foreground">
                {import.meta.env.PROD ? 'Ativado' : 'Desativado'}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Base URL</div>
              <div className="text-sm text-muted-foreground">
                {import.meta.env.BASE_URL}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Mode</div>
              <div className="text-sm text-muted-foreground">
                {import.meta.env.MODE}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasAllRequired && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Como Corrigir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>Para corrigir os problemas encontrados:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Acesse o painel do Vercel do seu projeto</li>
                <li>Vá em Settings → Environment Variables</li>
                <li>Adicione as variáveis faltantes:</li>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li><code>VITE_SUPABASE_URL</code> - URL do seu projeto Supabase</li>
                  <li><code>VITE_SUPABASE_ANON_KEY</code> - Chave anônima do Supabase</li>
                </ul>
                <li>Faça um novo deploy para aplicar as mudanças</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnvironmentCheck; 