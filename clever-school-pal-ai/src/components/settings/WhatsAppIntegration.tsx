import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Settings, BarChart3, Send, CheckCircle, AlertTriangle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppConfig {
  access_token: string;
  phone_number_id: string;
  business_account_id: string;
  verify_token: string;
  webhook_url?: string;
  status: 'active' | 'inactive' | 'pending';
}

interface WhatsAppStats {
  messages_sent_today: number;
  messages_delivered_today: number;
  cost_today: number;
  cost_month: number;
}

export function WhatsAppIntegration() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string>('');
  const [testPhone, setTestPhone] = useState('');

  const [formData, setFormData] = useState({
    access_token: '',
    phone_number_id: '',
    business_account_id: '',
    verify_token: ''
  });

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
        setFormData({
          access_token: data.access_token || '',
          phone_number_id: data.phone_number_id || '',
          business_account_id: data.business_account_id || '',
          verify_token: data.verify_token || ''
        });
      }
    } catch (err) {
      setError(`Erro ao carregar configuração: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      const { data: todayStats } = await supabase
        .from('whatsapp_analytics')
        .select('messages_sent, messages_delivered, total_cost')
        .eq('date', today)
        .single();

      // Get month stats
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data: monthStats } = await supabase
        .from('whatsapp_analytics')
        .select('total_cost')
        .gte('date', monthStart);

      const monthTotal = monthStats?.reduce((sum, day) => sum + (day.total_cost || 0), 0) || 0;

      setStats({
        messages_sent_today: todayStats?.messages_sent || 0,
        messages_delivered_today: todayStats?.messages_delivered || 0,
        cost_today: todayStats?.total_cost || 0,
        cost_month: monthTotal
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const saveConfig = async () => {
    if (!formData.access_token || !formData.phone_number_id || !formData.business_account_id) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      // Generate verify token if not provided
      const verifyToken = formData.verify_token || `verify_${Math.random().toString(36).substring(2, 15)}`;
      
      const configData = {
        ...formData,
        verify_token: verifyToken,
        webhook_url: `${window.location.origin}/api/whatsapp/webhook`
      };

      const { error } = await supabase.functions.invoke('whatsapp-integration/setup-config', {
        body: configData
      });

      if (error) throw error;

      await loadConfig();
      toast.success('🎉 Configuração WhatsApp salva com sucesso!');
    } catch (err) {
      setError(`Erro ao salvar configuração: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsTesting(true);
      setError('');

      const { data, error } = await supabase.functions.invoke('whatsapp-integration/test-connection');

      if (error) throw error;

      if (data.success) {
        toast.success('✅ Conexão WhatsApp testada com sucesso!');
      } else {
        throw new Error(data.message || 'Falha no teste de conexão');
      }
    } catch (err) {
      setError(`Erro no teste: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone) {
      setError('Por favor, insira um número de telefone para teste');
      return;
    }

    try {
      setError('');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-integration/send-message', {
        body: {
          to: testPhone,
          message_type: 'utility',
          template_name: 'assignment_reminder',
          parameters: [
            { type: 'text', text: 'Teste' },
            { type: 'text', text: 'Matemática' },
            { type: 'text', text: 'amanhã' }
          ]
        }
      });

      if (error) throw error;

      toast.success(`📱 Mensagem de teste enviada! ID: ${data.message_id}`);
      setTestPhone('');
      await loadStats();
    } catch (err) {
      setError(`Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL do webhook copiada!');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Integração WhatsApp Business API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Integração WhatsApp Business API
          {config?.status === 'active' && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure a integração com WhatsApp Business API (Modelo PMP - Julho 2025)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="test">
              <Send className="h-4 w-4 mr-2" />
              Teste
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token *</Label>
                <Input
                  id="access_token"
                  type="password"
                  placeholder="EAAYour-Access-Token..."
                  value={formData.access_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                <Input
                  id="phone_number_id"
                  placeholder="1234567890123456"
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number_id: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_account_id">Business Account ID *</Label>
                <Input
                  id="business_account_id"
                  placeholder="1234567890123456"
                  value={formData.business_account_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_account_id: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify_token">Verify Token</Label>
                <Input
                  id="verify_token"
                  placeholder="Auto-gerado se vazio"
                  value={formData.verify_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, verify_token: e.target.value }))}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/api/whatsapp/webhook`}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure esta URL no seu Meta App Dashboard
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
                  {isSaving ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
                <Button variant="outline" onClick={testConnection} disabled={isTesting}>
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            {!config || config.status !== 'active' ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Configure e ative a integração WhatsApp primeiro para testar mensagens.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test_phone">Número de Teste</Label>
                  <Input
                    id="test_phone"
                    placeholder="+351XXXXXXXXX"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Formato: +[código país][número] (ex: +351XXXXXXXXX)
                  </p>
                </div>

                <Button onClick={sendTestMessage} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem de Teste
                </Button>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Modelo PMP (Julho 2025):</strong> Mensagens utility custam €0.0164 cada.
                    Mensagens service são gratuitas dentro da janela de 24h.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.messages_sent_today}</div>
                    <p className="text-xs text-muted-foreground">Mensagens Hoje</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.messages_delivered_today}</div>
                    <p className="text-xs text-muted-foreground">Entregues Hoje</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">€{stats.cost_today.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Custo Hoje</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">€{stats.cost_month.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Custo Mês</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Sem dados estatísticos ainda</p>
              </div>
            )}

            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                <strong>Preços PMP Portugal (Julho 2025):</strong><br />
                • Marketing: €0.0514/mensagem<br />
                • Utility: €0.0164/mensagem<br />
                • Authentication: €0.0164/mensagem<br />
                • Service: Gratuito (janela 24h)
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 