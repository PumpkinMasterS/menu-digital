import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import { DataExportDialog } from "@/components/forms/DataExportDialog";
import { BulkImportDialog } from "@/components/forms/BulkImportDialog";
import { TOTPSettings } from "@/components/settings/TOTPSettings";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { ApiTester } from "@/components/settings/ApiTester";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Download,
  Upload,
  Monitor,
  Sun,
  Moon,
  Palette,
  Save,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap
} from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { toast } from "sonner";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);

  // Verificar se há parâmetro de aba na URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'security', 'notifications', 'appearance', 'data', 'system'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  // Form states
  const [profileSettings, setProfileSettings] = useState({
    name: "Administrador",
    email: "admin@escola.com",
    phone: "+351 900 123 456",
    language: "pt-PT"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    whatsappNotifications: true,
    systemAlerts: true,
    weeklyReports: false,
    newStudentAlerts: true,
    contentPublishedAlerts: false
  });

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    dataRetention: "2years",
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true
  });

  const handleSaveProfile = () => {
    toast.success("Configurações do perfil salvas com sucesso!");
  };

  const handleSaveNotifications = () => {
    toast.success("Configurações de notificação salvas com sucesso!");
  };

  const handleSaveSystem = () => {
    toast.success("Configurações do sistema salvas com sucesso!");
  };

  const handleBulkImport = async (data: any[]) => {
    // Mock implementation
    toast.success(`${data.length} registros importados com sucesso!`);
  };

  return (
    <>
      <Header 
        title="Configurações" 
        subtitle="Gerencie as configurações do sistema e preferências"
      />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-foreground">Configurações</h1>
          </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
                  <TabsTrigger value="profile" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Perfil</span>
                    <span className="sm:hidden">👤</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <Shield className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Segurança</span>
                    <span className="sm:hidden">🔐</span>
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <Bell className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Notificações</span>
                    <span className="sm:hidden">🔔</span>
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <Palette className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Aparência</span>
                    <span className="sm:hidden">🎨</span>
                  </TabsTrigger>
                  <TabsTrigger value="data" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <Database className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Dados</span>
                    <span className="sm:hidden">💾</span>
                  </TabsTrigger>
                  <TabsTrigger value="system" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                    <Shield className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Sistema</span>
                    <span className="sm:hidden">🛡️</span>
                  </TabsTrigger>
                </TabsList>

                {/* Profile Settings */}
                <TabsContent value="profile" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Informações Pessoais
                      </CardTitle>
                      <CardDescription>
                        Atualize suas informações pessoais e preferências de conta
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            value={profileSettings.name}
                            onChange={(e) => setProfileSettings({...profileSettings, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileSettings.email}
                            onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={profileSettings.phone}
                            onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="language">Idioma</Label>
                          <Input
                            id="language"
                            value={profileSettings.language}
                            onChange={(e) => setProfileSettings({...profileSettings, language: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleSaveProfile} className="btn-gradient">
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-6 mt-6">
                  <TOTPSettings />
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Preferências de Notificação
                      </CardTitle>
                      <CardDescription>
                        Configure como e quando deseja receber notificações
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Notificações por Email</Label>
                            <p className="text-sm text-muted-foreground">
                              Receba atualizações importantes por email
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.emailNotifications}
                            onCheckedChange={(checked) => 
                              setNotificationSettings({...notificationSettings, emailNotifications: checked})
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Alertas WhatsApp</Label>
                            <p className="text-sm text-muted-foreground">
                              Notificações sobre atividade do bot
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.whatsappNotifications}
                            onCheckedChange={(checked) => 
                              setNotificationSettings({...notificationSettings, whatsappNotifications: checked})
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Alertas do Sistema</Label>
                            <p className="text-sm text-muted-foreground">
                              Notificações sobre o status do sistema
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.systemAlerts}
                            onCheckedChange={(checked) => 
                              setNotificationSettings({...notificationSettings, systemAlerts: checked})
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Relatórios Semanais</Label>
                            <p className="text-sm text-muted-foreground">
                              Resumo semanal de atividades
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.weeklyReports}
                            onCheckedChange={(checked) => 
                              setNotificationSettings({...notificationSettings, weeklyReports: checked})
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button onClick={handleSaveNotifications} className="btn-gradient">
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Preferências
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Appearance */}
                <TabsContent value="appearance" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Tema e Aparência
                      </CardTitle>
                      <CardDescription>
                        Personalize a aparência da interface do sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Tema da Interface</Label>
                          <p className="text-sm text-muted-foreground mb-4">
                            Escolha entre modo claro, escuro ou automático
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setTheme('light')}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Sun className="h-4 w-4" />
                                <span className="font-medium">Claro</span>
                              </div>
                              <div className="w-full h-16 bg-background rounded border flex items-center justify-center">
                                <div className="w-8 h-8 bg-foreground rounded"></div>
                              </div>
                            </div>
                            
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setTheme('dark')}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Moon className="h-4 w-4" />
                                <span className="font-medium">Escuro</span>
                              </div>
                              <div className="w-full h-16 bg-gray-900 rounded border flex items-center justify-center">
                                <div className="w-8 h-8 bg-gray-100 rounded"></div>
                              </div>
                            </div>
                            
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setTheme('system')}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Monitor className="h-4 w-4" />
                                <span className="font-medium">Sistema</span>
                              </div>
                              <div className="w-full h-16 bg-gradient-to-r from-background to-gray-900 rounded border flex items-center justify-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-foreground to-gray-100 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Data Management */}
                <TabsContent value="data" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5 text-blue-600" />
                          Exportar Dados
                        </CardTitle>
                        <CardDescription>
                          Exporte dados do sistema em diferentes formatos (CSV, JSON, Excel)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Exporte estudantes, conteúdos, escolas, turmas e disciplinas com filtros avançados.
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Múltiplos formatos de exportação</li>
                            <li>• Filtros por escola, status e data</li>
                            <li>• Seleção customizada de campos</li>
                            <li>• Download automático do arquivo</li>
                          </ul>
                        </div>
                        <Button 
                          onClick={() => setIsExportDialogOpen(true)} 
                          className="w-full btn-gradient"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Dados
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Upload className="h-5 w-5 text-green-600" />
                          Importar Dados
                        </CardTitle>
                        <CardDescription>
                          Importe dados em massa através de arquivos CSV
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Importação em massa de estudantes, conteúdos e escolas.
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Upload por drag-and-drop</li>
                            <li>• Validação em tempo real</li>
                            <li>• Pré-visualização dos dados</li>
                            <li>• Relatório de erros detalhado</li>
                          </ul>
                        </div>
                        <Button 
                          onClick={() => setIsBulkImportDialogOpen(true)} 
                          variant="outline" 
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Importar Dados
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Estatísticas de Armazenamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">2.1GB</p>
                          <p className="text-xs text-muted-foreground">Armazenamento usado</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">1,247</p>
                          <p className="text-xs text-muted-foreground">Arquivos totais</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">856</p>
                          <p className="text-xs text-muted-foreground">Conteúdos ativos</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">98%</p>
                          <p className="text-xs text-muted-foreground">Disponibilidade</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* System Settings */}
                <TabsContent value="system" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Configurações do Sistema
                      </CardTitle>
                      <CardDescription>
                        Configurações avançadas que afetam o funcionamento do sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Backup Automático</Label>
                            <p className="text-sm text-muted-foreground">
                              Realiza backup automático dos dados diariamente
                            </p>
                          </div>
                          <Switch
                            checked={systemSettings.autoBackup}
                            onCheckedChange={(checked) => 
                              setSystemSettings({...systemSettings, autoBackup: checked})
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Cache do Sistema</Label>
                            <p className="text-sm text-muted-foreground">
                              Ativa cache para melhor performance
                            </p>
                          </div>
                          <Switch
                            checked={systemSettings.cacheEnabled}
                            onCheckedChange={(checked) => 
                              setSystemSettings({...systemSettings, cacheEnabled: checked})
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label className="flex items-center gap-2">
                              Modo de Manutenção
                              <Badge variant="destructive" className="text-xs">Crítico</Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Desativa temporariamente o acesso ao sistema
                            </p>
                          </div>
                          <Switch
                            checked={systemSettings.maintenanceMode}
                            onCheckedChange={(checked) => 
                              setSystemSettings({...systemSettings, maintenanceMode: checked})
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button onClick={handleSaveSystem} className="btn-gradient">
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Configurações
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        Status do Sistema
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">Servidor Online</p>
                            <p className="text-xs text-muted-foreground">Uptime: 99.9%</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                          <Info className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Base de Dados</p>
                            <p className="text-xs text-muted-foreground">Resposta: 45ms</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-medium">API WhatsApp</p>
                            <p className="text-xs text-muted-foreground">Limitado: 85%</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Chaves de API</CardTitle>
                      <CardDescription>Gerencie e teste chaves de API internas e externas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ApiKeyManager />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Testes de API</CardTitle>
                      <CardDescription>
                        Use o testador abaixo para validar endpoints via proxy de desenvolvimento (/functions/v1)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ApiTester />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>

      {/* Export Dialog */}
      <DataExportDialog 
        open={isExportDialogOpen} 
        onOpenChange={setIsExportDialogOpen} 
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isBulkImportDialogOpen}
        onOpenChange={setIsBulkImportDialogOpen}
        type="students"
        onImport={handleBulkImport}
      />
    </>
  );
}
