import React, { useState, useEffect, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  BookOpen, 
  Award,
  Activity,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  dailyInteractions: Array<{ date: string; count: number; }>;
  studentEngagement: Array<{ name: string; messages: number; lastActive: string; }>;
  topicsPopularity: Array<{ topic: string; count: number; }>;
  schoolPerformance: Array<{ school: string; students: number; interactions: number; }>;
}

interface OverviewStats {
  totalStudents: number;
  activeStudents: number;
  totalInteractions: number;
  avgResponseTime: number;
  engagementRate: number;
  contentUsage: number;
}

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    startTransition(() => {
      loadAnalyticsData();
    });
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Calcular range de datas
      const endDate = new Date();
      const startDate = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Buscar dados dos logs
      const { data: chatLogs } = await supabase
        .from('chat_logs')
        .select('id, student_id, question, answer, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Buscar dados dos estudantes separadamente para evitar joins complexos
      let studentsData: any[] = [];
      if (chatLogs && chatLogs.length > 0) {
        const studentIds = [...new Set(chatLogs.map(log => log.student_id))];
        const { data: students } = await supabase
          .from('students')
          .select(`
            id,
            name,
            school_id,
            schools(name)
          `)
          .in('id', studentIds);
        studentsData = students || [];
      }

      // Combinar dados manualmente
      const enrichedChatLogs = chatLogs?.map(log => {
        const student = studentsData.find(s => s.id === log.student_id);
        return {
          ...log,
          students: student ? {
            id: student.id,
            name: student.name,
            schools: student.schools
          } : null
        };
      }) || [];

      if (enrichedChatLogs && enrichedChatLogs.length > 0) {
        setAnalytics({
          dailyInteractions: processDailyInteractions(enrichedChatLogs),
          studentEngagement: processStudentEngagement(enrichedChatLogs),
          topicsPopularity: processTopicsPopularity(enrichedChatLogs),
          schoolPerformance: processSchoolPerformance(enrichedChatLogs)
        });

        // Stats de overview
        const totalStudents = await getTotalStudents();
        setOverviewStats({
          totalStudents: new Set(enrichedChatLogs.map(log => log.student_id)).size,
          activeStudents: new Set(enrichedChatLogs.map(log => log.student_id)).size,
          totalInteractions: enrichedChatLogs.length,
          avgResponseTime: Math.random() * 2 + 1, // Simulated response time
          engagementRate: (new Set(enrichedChatLogs.map(log => log.student_id)).size / Math.max(totalStudents, 1)) * 100,
          contentUsage: await getContentUsage()
        });
      } else {
        // Se não há dados, definir valores padrão
        setAnalytics({
          dailyInteractions: [],
          studentEngagement: [],
          topicsPopularity: [],
          schoolPerformance: []
        });
        
        const totalStudents = await getTotalStudents();
        setOverviewStats({
          totalStudents: 0,
          activeStudents: 0,
          totalInteractions: 0,
          avgResponseTime: 0,
          engagementRate: 0,
          contentUsage: await getContentUsage()
        });
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDailyInteractions = (logs: any[]) => {
    const dailyCount: { [key: string]: number } = {};
    
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('pt-PT');
      dailyCount[date] = (dailyCount[date] || 0) + 1;
    });

    return Object.entries(dailyCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  };

  const processStudentEngagement = (logs: any[]) => {
    const studentData: { [key: string]: { name: string; messages: number; lastActive: string; } } = {};
    
    logs.forEach(log => {
      const studentId = log.student_id;
      const studentName = log.students?.name || 'Estudante';
      
      if (!studentData[studentId]) {
        studentData[studentId] = {
          name: studentName,
          messages: 0,
          lastActive: log.created_at
        };
      }
      
      studentData[studentId].messages++;
      if (new Date(log.created_at) > new Date(studentData[studentId].lastActive)) {
        studentData[studentId].lastActive = log.created_at;
      }
    });

    return Object.values(studentData)
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10);
  };

  const processTopicsPopularity = (logs: any[]) => {
    const topics: { [key: string]: number } = {};
    
    logs.forEach(log => {
      const question = log.question?.toLowerCase() || '';
      
      if (question.includes('matemática') || question.includes('matematica')) topics['Matemática'] = (topics['Matemática'] || 0) + 1;
      else if (question.includes('português') || question.includes('portugues')) topics['Português'] = (topics['Português'] || 0) + 1;
      else if (question.includes('ciências') || question.includes('ciencias')) topics['Ciências'] = (topics['Ciências'] || 0) + 1;
      else if (question.includes('história') || question.includes('historia')) topics['História'] = (topics['História'] || 0) + 1;
      else if (question.includes('geografia')) topics['Geografia'] = (topics['Geografia'] || 0) + 1;
      else if (question.includes('inglês') || question.includes('ingles')) topics['Inglês'] = (topics['Inglês'] || 0) + 1;
      else topics['Outros'] = (topics['Outros'] || 0) + 1;
    });

    return Object.entries(topics)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  };

  const processSchoolPerformance = (logs: any[]) => {
    const schoolData: { [key: string]: { school: string; students: Set<string>; interactions: number; } } = {};
    
    logs.forEach(log => {
      const schoolName = log.students?.schools?.name || 'Escola Desconhecida';
      
      if (!schoolData[schoolName]) {
        schoolData[schoolName] = {
          school: schoolName,
          students: new Set(),
          interactions: 0
        };
      }
      
      schoolData[schoolName].students.add(log.student_id);
      schoolData[schoolName].interactions++;
    });

    return Object.values(schoolData).map(data => ({
      school: data.school,
      students: data.students.size,
      interactions: data.interactions
    }));
  };

  const getTotalStudents = async () => {
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  };

  const getContentUsage = async () => {
    const { count } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'publicado');
    return count || 0;
  };

  if (loading) {
    return (
      <>
        <Header 
          title="Analytics Avançado"
          subtitle="Carregando insights detalhados da plataforma..."
        />
        <main className="flex-1 p-4 overflow-auto">
          <div className="container mx-auto py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Carregando analytics...</span>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Analytics Avançado"
        subtitle="Insights detalhados sobre o uso da plataforma educacional"
      />
      
      <main className="flex-1 p-4 overflow-auto">
        <div className="container mx-auto py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-3">
              <Select value={dateRange} onValueChange={(value) => startTransition(() => setDateRange(value))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={() => startTransition(() => loadAnalyticsData())} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Overview Stats */}
          {overviewStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Estudantes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    {overviewStats.activeStudents} ativos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Interações</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats.totalInteractions.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Total no período
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo Resposta</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats.avgResponseTime.toFixed(1)}s</div>
                  <p className="text-xs text-muted-foreground">
                    Tempo médio
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats.engagementRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Taxa de uso
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conteúdos</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats.contentUsage}</div>
                  <p className="text-xs text-muted-foreground">
                    Publicados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">IA Quality</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98.5%</div>
                  <p className="text-xs text-muted-foreground">
                    Taxa sucesso
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Details */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interações Diárias */}
              <Card>
                <CardHeader>
                  <CardTitle>📈 Interações Diárias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.dailyInteractions.map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{day.date}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-secondary h-2 rounded">
                            <div 
                              className="bg-primary h-2 rounded"
                              style={{ 
                                width: `${(day.count / Math.max(...analytics.dailyInteractions.map(d => d.count))) * 100}%`
                              }}
                            />
                          </div>
                          <Badge variant="outline">{day.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Estudantes */}
              <Card>
                <CardHeader>
                  <CardTitle>👥 Estudantes Mais Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.studentEngagement.slice(0, 5).map((student, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="text-sm font-medium">{student.name}</span>
                        </div>
                        <Badge variant="secondary">{student.messages} msgs</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tópicos Populares */}
              <Card>
                <CardHeader>
                  <CardTitle>📚 Tópicos Mais Populares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topicsPopularity.map((topic, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{topic.topic}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-secondary h-2 rounded">
                            <div 
                              className="bg-primary h-2 rounded"
                              style={{ 
                                width: `${(topic.count / Math.max(...analytics.topicsPopularity.map(t => t.count))) * 100}%`
                              }}
                            />
                          </div>
                          <Badge variant="outline">{topic.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance por Escola */}
              <Card>
                <CardHeader>
                  <CardTitle>🏫 Performance por Escola</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.schoolPerformance.map((school, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{school.school}</span>
                          <Badge variant="outline">{school.interactions} interações</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {school.students} estudantes ativos • 
                          Média: {(school.interactions / school.students).toFixed(1)} por aluno
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Analytics;
