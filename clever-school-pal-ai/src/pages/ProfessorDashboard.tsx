import React, { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { teacherAPI } from '@/lib/teacher-api';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  School
} from 'lucide-react';

interface TeacherAssignment {
  assignment_id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  assigned_at: string;
  notes?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  class_id: string;
  created_at: string;
}

interface Content {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  created_at: string;
  updated_at: string;
}

export default function ProfessorDashboard() {
  const { user } = useUnifiedAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSubjects: 0,
    totalStudents: 0,
    totalContents: 0
  });

  useEffect(() => {
    if (user?.role === 'professor') {
      loadProfessorData();
    }
  }, [user]);

  const loadProfessorData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadAssignments(),
        loadStudents(),
        loadContents()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do professor:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await teacherAPI.getTeacherAssignments(user!.id);
      setAssignments(response.assignments);
      
      // Calcular estatísticas
      const uniqueClasses = new Set(response.assignments.map(a => a.class_id));
      const uniqueSubjects = new Set(response.assignments.map(a => a.subject_id));
      
      setStats(prev => ({
        ...prev,
        totalClasses: uniqueClasses.size,
        totalSubjects: uniqueSubjects.size
      }));
    } catch (error) {
      console.error('Erro ao carregar atribuições:', error);
    }
  };

  const loadStudents = async () => {
    try {
      // Carregar alunos das turmas atribuídas ao professor
      const classIds = [...new Set(assignments.map(a => a.class_id))];
      
      if (classIds.length === 0) return;

      const { data, error } = await supabase
        .from('students')
        .select('id, name, email, class_id, created_at')
        .in('class_id', classIds)
        .order('name');

      if (error) throw error;

      setStudents(data || []);
      setStats(prev => ({
        ...prev,
        totalStudents: data?.length || 0
      }));
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const loadContents = async () => {
    try {
      // Carregar conteúdos das disciplinas do professor
      const subjectIds = [...new Set(assignments.map(a => a.subject_id))];
      
      if (subjectIds.length === 0) return;

      const { data, error } = await supabase
        .from('contents')
        .select('id, title, description, subject_id, created_at, updated_at')
        .in('subject_id', subjectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContents(data || []);
      setStats(prev => ({
        ...prev,
        totalContents: data?.length || 0
      }));
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
    }
  };

  const getSubjectName = (subjectId: string) => {
    const assignment = assignments.find(a => a.subject_id === subjectId);
    return assignment?.subject_name || 'Disciplina';
  };

  const getClassName = (classId: string) => {
    const assignment = assignments.find(a => a.class_id === classId);
    return assignment?.class_name || 'Turma';
  };

  const getStudentsByClass = (classId: string) => {
    return students.filter(s => s.class_id === classId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard do Professor</h1>
          <p className="text-muted-foreground">Bem-vindo, {user?.name}!</p>
        </div>
        <div className="flex items-center space-x-2">
          <School className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user?.school_name || 'Escola'}</span>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              Turmas atribuídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disciplinas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            <p className="text-xs text-muted-foreground">
              Disciplinas lecionadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Total de alunos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conteúdos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContents}</div>
            <p className="text-xs text-muted-foreground">
              Conteúdos disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignments">Minhas Atribuições</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
          <TabsTrigger value="contents">Conteúdos</TabsTrigger>
        </TabsList>

        {/* Atribuições */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Minhas Atribuições
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atribuição encontrada
                </p>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.assignment_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {assignment.subject_name}
                          </h3>
                          <p className="text-muted-foreground">
                            Turma: {assignment.class_name}
                          </p>
                          {assignment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {assignment.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {getStudentsByClass(assignment.class_id).length} alunos
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Desde {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alunos */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Meus Alunos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum aluno encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {[...new Set(students.map(s => s.class_id))].map((classId) => (
                    <div key={classId} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3">
                        {getClassName(classId)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {getStudentsByClass(classId).map((student) => (
                          <div key={student.id} className="bg-gray-50 rounded-lg p-3">
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdos */}
        <TabsContent value="contents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Conteúdos das Minhas Disciplinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum conteúdo encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {contents.map((content) => (
                    <div key={content.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {content.title}
                          </h3>
                          <p className="text-muted-foreground">
                            {getSubjectName(content.subject_id)}
                          </p>
                          {content.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {content.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {getSubjectName(content.subject_id)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(content.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}