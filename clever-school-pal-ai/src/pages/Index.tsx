import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, startTransition } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGlobalPreferences } from "@/hooks/useGlobalPreferences";
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Bot, 
  ArrowUp, 
  TrendingUp,
  Clock,
  Target,
  Zap,
  BarChart3,
  Activity,
  BookOpen,
  Star,
  CheckCircle,
  AlertTriangle,
  Image
} from "lucide-react";
import { toast } from 'sonner';

export default function Index() {
  const navigate = useNavigate();
  const { isAdminMode, currentSchool } = useApp();

  // Preferência global do modelo de visão (Discord/WhatsApp)
  const { getPreference, setPreference } = useGlobalPreferences();
  const [visionModel, setVisionModel] = useState<string>(
    getPreference('vision_ai_model', 'qwen/qwen3-vl-235b-a22b-instruct')
  );
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  useEffect(() => {
    // Persistir preferência para que Discord/WhatsApp leiam do mesmo local
    setPreference('vision_ai_model', visionModel);
  }, [visionModel, setPreference]);

  // Fetch dashboard data with error handling
  const { data: dashboardData, error: dashboardError, isLoading } = useQuery({
    queryKey: ["dashboard"],
    suspense: false, // Prevent suspense mode to avoid synchronous suspension
    queryFn: async () => {
      try {
            if (import.meta.env.DEV) {
      console.log("🔄 Iniciando busca de dados do dashboard...");
    }

        // Fetch all necessary data in parallel with basic error handling
        const [
          studentsResult,
          schoolsResult,
          classesResult,
          contentsResult,
          subjectsResult,
          recentActivities
        ] = await Promise.all([
          supabase.from("students").select("id, bot_active, school_id, class_id, created_at").order("created_at", { ascending: false }),
          supabase.from("schools").select("id, name").order("created_at", { ascending: false }),
          supabase.from("classes").select("id, name, school_id, grade").order("created_at", { ascending: false }),
          supabase.from("contents").select("id, title, status, created_at").order("created_at", { ascending: false }),
          supabase.from("subjects").select("id, name, school_id").order("created_at", { ascending: false }),
          supabase.from("students").select("id, name, created_at").order("created_at", { ascending: false }).limit(5)
        ]);

        const students = studentsResult.data || [];
        const schools = schoolsResult.data || [];
        const classes = classesResult.data || [];
        const contents = contentsResult.data || [];
        const subjects = subjectsResult.data || [];
        const recent = recentActivities.data || [];

        if (import.meta.env.DEV) {
          console.log("📊 Dados carregados:", {
            students: students.length,
            schools: schools.length,
            classes: classes.length,
            contents: contents.length,
            subjects: subjects.length
          });
        }

        // Calculate analytics with safe math
        const activeStudents = students.filter(s => s.bot_active === true).length;
        const totalContents = contents.length;
        const publishedContents = contents.filter(c => c.status === 'publicado').length;
        const contentViews = 0; // Static for now
        
        // Recent activity (last 7 days) with date validation
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentStudents = students.filter(s => {
          try {
            return s.created_at && new Date(s.created_at) > sevenDaysAgo;
          } catch {
            return false;
          }
        }).length;
        
        const recentContents = contents.filter(c => {
          try {
            return c.created_at && new Date(c.created_at) > sevenDaysAgo;
          } catch {
            return false;
          }
        }).length;

        // Performance metrics with safe division
        const botActivationRate = students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0;
        const contentPublishRate = totalContents > 0 ? Math.round((publishedContents / totalContents) * 100) : 0;
        const avgViewsPerContent = totalContents > 0 ? Math.round(contentViews / totalContents) : 0;

        // Trending content (most recent published)
        const trendingContent = contents
          .filter(c => c.status === 'publicado')
          .slice(0, 5);

        const result = {
          totals: {
            students: students.length,
            activeStudents,
            schools: schools.length,
            classes: classes.length,
            contents: totalContents,
            subjects: subjects.length,
            contentViews
          },
          recent: {
            students: recentStudents,
            contents: recentContents,
            activities: recent
          },
          performance: {
            botActivationRate,
            contentPublishRate,
            avgViewsPerContent,
            publishedContents
          },
          trending: trendingContent,
          growth: {
            studentsGrowth: recentStudents > 0 ? `+${recentStudents}` : '0',
            contentsGrowth: recentContents > 0 ? `+${recentContents}` : '0'
          },
          hasErrors: [studentsResult, schoolsResult, classesResult, contentsResult, subjectsResult]
            .some(result => result.error)
        };

        if (import.meta.env.DEV) {
          console.log("✅ Dashboard data processado com sucesso");
        }
        return result;
        
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("❌ Erro crítico no dashboard:", error);
        }
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Safe data extraction with fallbacks
  const stats = dashboardData?.totals || {
    students: 0,
    activeStudents: 0,
    schools: 0,
    classes: 0,
    contents: 0,
    subjects: 0,
    contentViews: 0
  };
  
  const recent = dashboardData?.recent || {
    students: 0,
    contents: 0,
    activities: []
  };
  
  const performance = dashboardData?.performance || {
    botActivationRate: 0,
    contentPublishRate: 0,
    avgViewsPerContent: 0,
    publishedContents: 0
  };
  
  const trending = dashboardData?.trending || [];
  const growth = dashboardData?.growth || {
    studentsGrowth: '0',
    contentsGrowth: '0'
  };

  // Quick actions baseadas no contexto
  const getQuickActions = () => {
    const baseUrl = isAdminMode ? '/admin' : `/escola/${currentSchool?.slug}`;
    
    const actions = [
      {
        title: "Novo Aluno",
        description: "Registrar um novo estudante",
        icon: <Users className="h-5 w-5" />,
        action: () => startTransition(() => navigate(`${baseUrl}/students`)),
        color: "bg-blue-500"
      },
      {
        title: "Novo Conteúdo",
        description: "Adicionar material educativo",
        icon: <FileText className="h-5 w-5" />,
        action: () => startTransition(() => navigate(`${baseUrl}/contents`)),
        color: "bg-green-500"
      },
      {
        title: "Nova Turma",
        description: "Criar uma nova turma",
        icon: <GraduationCap className="h-5 w-5" />,
        action: () => startTransition(() => navigate(`${baseUrl}/classes`)),
        color: "bg-purple-500"
      }
    ];

    // Bot config apenas para admin
    if (isAdminMode) {
      actions.push({
        title: "Configurar Bot",
        description: "Ajustar IA WhatsApp",
        icon: <Bot className="h-5 w-5" />,
        action: () => startTransition(() => navigate(`${baseUrl}/bot-config`)),
        color: "bg-orange-500"
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header 
          title={isAdminMode ? 'Painel Administrativo' : `${currentSchool?.name || 'Connect AI'}`}
          subtitle="Carregando dados..."
        />
        <main className="flex-1 p-4 overflow-auto">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-0 pb-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // Error state
  if (dashboardError) {
    return (
      <>
        <Header 
          title={isAdminMode ? 'Painel Administrativo' : `${currentSchool?.name || 'Connect AI'}`}
          subtitle="Erro ao carregar dados"
        />
                  <div className="flex flex-col min-h-screen">
            <Header 
              title={isAdminMode ? 'Painel Administrativo' : `${currentSchool?.name || 'Connect AI'}`}
              subtitle="Erro ao carregar dados"
            />
          <main className="flex-1 p-4 overflow-auto">
            <div className="space-y-6">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Erro ao Carregar Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-red-700">
                  <p>Ocorreu um erro ao carregar os dados do dashboard.</p>
                  <p className="text-sm mt-2 font-mono bg-red-100 p-2 rounded">
                    {dashboardError.message}
                  </p>
                  <button 
                    onClick={() => startTransition(() => window.location.reload())}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Tentar Novamente
                  </button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title={isAdminMode ? 'Painel Administrativo' : `${currentSchool?.name || 'Connect AI'}`}
        subtitle={isAdminMode 
          ? 'Gerencie todas as escolas e usuários da plataforma' 
          : 'Visão geral da atividade da sua escola'
        }
      />
      
      <main className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">
            {isAdminMode ? 'Painel Administrativo' : `Bem-vindo ao ${currentSchool?.name || 'Connect AI'}!`} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdminMode 
              ? 'Gerencie todas as escolas e usuários da plataforma'
              : 'Aqui está um resumo da atividade da sua escola'
            }
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Última atualização: {new Date().toLocaleTimeString('pt-PT')}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Sistema ativo</span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {stats.activeStudents} ativos
              </Badge>
              <span className="flex items-center gap-1 text-green-600">
                <ArrowUp className="h-3 w-3" />
                {growth.studentsGrowth}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conteúdos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contents}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {performance.publishedContents} publicados
              </Badge>
              <span className="flex items-center gap-1 text-green-600">
                <ArrowUp className="h-3 w-3" />
                {growth.contentsGrowth}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdminMode ? 'Escolas & Turmas' : 'Turmas'}
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAdminMode ? stats.schools : stats.classes}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {stats.classes} turmas
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.subjects} disciplinas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contentViews.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {performance.avgViewsPerContent.toFixed(1)} média
              </Badge>
              <span className="flex items-center gap-1 text-blue-600">
                <TrendingUp className="h-3 w-3" />
                Crescendo
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Taxa de Ativação do Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Estudantes com bot ativo</span>
                <span className="text-sm font-bold">{performance.botActivationRate.toFixed(1)}%</span>
              </div>
              <Progress value={performance.botActivationRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents} de {stats.students} estudantes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Taxa de Publicação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Conteúdos publicados</span>
                <span className="text-sm font-bold">{performance.contentPublishRate.toFixed(1)}%</span>
              </div>
              <Progress value={performance.contentPublishRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {performance.publishedContents} de {stats.contents} conteúdos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Últimos 7 dias</span>
                <Badge variant="outline">{recent.students + recent.contents} itens</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Novos estudantes</span>
                  <span className="font-medium">{recent.students}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Novos conteúdos</span>
                  <span className="font-medium">{recent.contents}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed sections */}
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Ações Rápidas
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Conteúdo em Destaque
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Atividade Recente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, _index) => (
              <Card key={_index} className="cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => startTransition(() => action.action())}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${action.color} text-white`}>
                      {action.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

{/* Admin: modelo de visão movido para a página OCR Vision */}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.length > 0 ? trending.map((content, _index) => (
              <Card key={content.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <CardTitle className="text-sm">#{_index + 1} Conteúdo Recente</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium mb-2 line-clamp-2">{content.title}</h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Publicado</span>
                    <Badge variant="secondary">{content.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum conteúdo em destaque</p>
                  <p className="text-sm text-muted-foreground">Publique conteúdos para ver as estatísticas</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Estudantes Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.activities && recent.activities.length > 0 ? (
                <div className="space-y-3">
                  {recent.activities.map((student, _index) => (
                    <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Registrado em {new Date(student.created_at).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Novo</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </main>

      {/* Modal de detalhes do modelo de visão */}
      {isAdminMode && (
        <Dialog open={isVisionModalOpen} onOpenChange={setIsVisionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modelo de Visão: Qwen VL 235B</DialogTitle>
              <DialogDescription>
                Escolha entre Instruct (rápido e econômico) ou Thinking (raciocínio profundo, custo maior).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>
                • Instruct: ideal para extração direta de texto e descrição de imagem com boa velocidade.
              </p>
              <p>
                • Thinking: melhor para problemas complexos (matemática, diagramas) com cadeias de raciocínio, porém pode ser mais lento e custoso.
              </p>
              <p className="text-blue-700 bg-blue-100 border border-blue-200 rounded p-2">
                Dica: mantenha Instruct como padrão e ative Thinking apenas quando necessário.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVisionModalOpen(false)}>Fechar</Button>
              <Button onClick={() => setIsVisionModalOpen(false)}>Entendi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
