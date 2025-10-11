import React, { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Search,
  School,
  Award
} from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  school_id: string;
  school_name: string;
  assignments?: TeacherAssignment[];
  class_count?: number;
  subject_count?: number;
  total_assignments?: number;
}

interface TeacherAssignment {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  assigned_at: string;
  notes?: string;
  is_active: boolean;
}

interface Class {
  id: string;
  name: string;
  grade: string;
  academic_year: string;
  school_id: string;
}

interface Subject {
  id: string;
  name: string;
  school_id: string;
  grade: string;
}

interface School {
  id: string;
  name: string;
}

import { teacherAPI } from '@/lib/teacher-api';

export default function TeacherManagement() {
  const { user } = useUnifiedAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [assignForm, setAssignForm] = useState({
    class_id: '',
    subject_id: '',
    notes: ''
  });
  const [teacherForm, setTeacherForm] = useState({
    school_id: '',
    selectedGrade: '',
    availableSubjects: [] as Subject[]
  });

  // Obter school_id do usuário
  const getSchoolId = () => {
    if (user?.role === 'super_admin') {
      return null; // Super admin pode ver todas as escolas
    }
    return user?.school_id;
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSchools(),
        loadTeachers(),
        loadClasses(),
        loadSubjects()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast.error('Erro ao carregar escolas');
    }
  };

  const loadTeacherAssignments = async (teacherId: string): Promise<TeacherAssignment[]> => {
    try {
      const response = await teacherAPI.getTeacherAssignments(teacherId);
      return response.assignments.map(assignment => ({
        id: assignment.assignment_id,
        class_id: assignment.class_id,
        class_name: assignment.class_name,
        subject_id: assignment.subject_id,
        subject_name: assignment.subject_name,
        assigned_at: assignment.assigned_at,
        notes: assignment.notes,
        is_active: true
      }));
    } catch (error) {
      console.error('Erro ao carregar atribuições:', error);
      return [];
    }
  };

  const loadTeachers = async () => {
    try {
      const schoolId = getSchoolId();
      
      if (!schoolId && user?.role !== 'super_admin') {
        toast.error('Escola não definida para o usuário');
        return;
      }

      // Para super admin, listar todas as escolas e seus professores
      if (user?.role === 'super_admin') {
        // Carregar todas as escolas e seus professores
        const { data: schools } = await supabase
          .from('schools')
          .select('id, name');

        let allTeachers: Teacher[] = [];
        
        for (const school of schools || []) {
          try {
            const response = await teacherAPI.getSchoolTeachers(school.id);
            const schoolTeachers = response.teachers.map((teacher: any) => ({
              id: teacher.teacher_id,
              name: teacher.teacher_name,
              email: teacher.teacher_email,
              school_id: school.id,
              school_name: school.name,
              class_count: teacher.class_count,
              subject_count: teacher.subject_count,
              total_assignments: teacher.total_assignments,
              created_at: new Date().toISOString(),
              assignments: []
            }));
            
            // Carregar atribuições detalhadas para cada professor
            for (const teacher of schoolTeachers) {
              teacher.assignments = await loadTeacherAssignments(teacher.id);
            }
            
            allTeachers = [...allTeachers, ...schoolTeachers];
          } catch (error) {
            console.error(`Erro ao carregar professores da escola ${school.name}:`, error);
          }
        }
        
        setTeachers(allTeachers);
      } else {
        // Carregar professores da escola específica
        const response = await teacherAPI.getSchoolTeachers(schoolId);
        const teachersData = response.teachers.map((teacher: any) => ({
          id: teacher.teacher_id,
          name: teacher.teacher_name,
          email: teacher.teacher_email,
          school_id: schoolId,
          school_name: 'Escola',
          class_count: teacher.class_count,
          subject_count: teacher.subject_count,
          total_assignments: teacher.total_assignments,
          created_at: new Date().toISOString(),
          assignments: []
        }));
        
        // Carregar atribuições detalhadas para cada professor
        for (const teacher of teachersData) {
          teacher.assignments = await loadTeacherAssignments(teacher.id);
        }
        
        setTeachers(teachersData);
      }
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
      toast.error('Erro ao carregar professores');
    }
  };

  const loadClasses = async () => {
    try {
      const schoolId = getSchoolId();
      
      let query = supabase
        .from('classes')
        .select('id, name, grade, academic_year, school_id')
        .order('name');

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const schoolId = getSchoolId();
      
      let query = supabase
        .from('subjects')
        .select('id, name, school_id, grade')
        .order('name');

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher || !assignForm.class_id || !assignForm.subject_id) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      await teacherAPI.assignTeacher(
        selectedTeacher.id,
        assignForm.class_id,
        assignForm.subject_id,
        assignForm.notes
      );

      toast.success('Professor atribuído com sucesso!');
      setShowAssignDialog(false);
      setAssignForm({ class_id: '', subject_id: '', notes: '' });
      await loadTeachers(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao atribuir professor:', error);
      toast.error('Erro ao atribuir professor');
    }
  };

  const handleRemoveAssignment = async (teacherId: string, classId: string, subjectId: string) => {
    try {
      await teacherAPI.removeAssignment(teacherId, classId, subjectId);

      toast.success('Atribuição removida com sucesso!');
      await loadTeachers(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao remover atribuição:', error);
      toast.error('Erro ao remover atribuição');
    }
  };

  const getTeacherStats = (teacher: Teacher) => {
    return {
      classes: teacher.class_count || teacher.assignments?.length || 0,
      subjects: teacher.subject_count || new Set(teacher.assignments?.map(a => a.subject_id)).size || 0,
      assignments: teacher.total_assignments || teacher.assignments?.length || 0
    };
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStats = {
    teachers: teachers.length,
    classes: new Set(teachers.flatMap(t => t.assignments?.map(a => a.class_id) || [])).size,
    subjects: new Set(teachers.flatMap(t => t.assignments?.map(a => a.subject_id) || [])).size,
    assignments: teachers.reduce((sum, t) => sum + (t.assignments?.length || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Professores</h1>
          <p className="text-gray-600">Gerencie professores e suas atribuições de turmas e disciplinas</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar professores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Professores</p>
                <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <School className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Turmas Atribuídas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalStats.classes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Disciplinas Atribuídas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalStats.subjects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Atribuições</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalStats.assignments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Professores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeachers.map((teacher) => {
          const stats = getTeacherStats(teacher);
          return (
            <Card key={teacher.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{teacher.name}</CardTitle>
                      <p className="text-sm text-gray-600">{teacher.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Dialog open={showAssignDialog && selectedTeacher?.id === teacher.id} onOpenChange={setShowAssignDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTeacher(teacher)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Atribuir Professor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="class">Turma</Label>
                            <Select value={assignForm.class_id} onValueChange={(value) => setAssignForm({...assignForm, class_id: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma turma" />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="subject">Disciplina</Label>
                            <Select value={assignForm.subject_id} onValueChange={(value) => setAssignForm({...assignForm, subject_id: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma disciplina" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="notes">Observações (opcional)</Label>
                            <Input
                              id="notes"
                              value={assignForm.notes}
                              onChange={(e) => setAssignForm({...assignForm, notes: e.target.value})}
                              placeholder="Ex: Responsável pela turma A"
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleAssignTeacher}>
                              Atribuir
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={showEditDialog && editingTeacher?.id === teacher.id} onOpenChange={setShowEditDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setTeacherForm({
                              school_id: teacher.school_id,
                              selectedGrade: '',
                              availableSubjects: []
                            });
                          }}
                        >
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Editar Professor - {editingTeacher?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="teacher-school">Escola</Label>
                            <Select 
                              value={teacherForm.school_id} 
                              onValueChange={(value) => setTeacherForm({...teacherForm, school_id: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma escola" />
                              </SelectTrigger>
                              <SelectContent>
                                {schools.map((school) => (
                                  <SelectItem key={school.id} value={school.id}>
                                    {school.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="teacher-grade">Ano Letivo</Label>
                            <Select 
                              value={teacherForm.selectedGrade} 
                              onValueChange={(value) => {
                                setTeacherForm({...teacherForm, selectedGrade: value});
                                // Filtrar disciplinas por ano
                                const filteredSubjects = subjects.filter(s => 
                                  s.school_id === teacherForm.school_id && s.grade === value
                                );
                                setTeacherForm(prev => ({...prev, availableSubjects: filteredSubjects}));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um ano" />
                              </SelectTrigger>
                              <SelectContent>
                                {['5º', '6º', '7º', '8º', '9º', '10º', '11º', '12º'].map((grade) => (
                                  <SelectItem key={grade} value={grade}>
                                    {grade} Ano
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {teacherForm.availableSubjects.length > 0 && (
                            <div>
                              <Label>Disciplinas Disponíveis ({teacherForm.selectedGrade} Ano)</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                                {teacherForm.availableSubjects.map((subject) => (
                                  <div key={subject.id} className="flex items-center space-x-2 p-2 border rounded">
                                    <span className="text-sm">{subject.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={() => {
                              toast.success('Funcionalidade de edição em desenvolvimento');
                              setShowEditDialog(false);
                            }}>
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Escola:</span>
                    <span className="font-medium">{teacher.school_name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Turmas:</span>
                    <Badge variant="secondary">{stats.classes}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Disciplinas:</span>
                    <Badge variant="secondary">{stats.subjects}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Atribuições:</span>
                    <Badge variant="secondary">{stats.assignments}</Badge>
                  </div>

                  {teacher.assignments && teacher.assignments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Atribuições:</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {teacher.assignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <span>
                              <strong>{assignment.class_name}</strong> - {assignment.subject_name}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveAssignment(teacher.id, assignment.class_id, assignment.subject_id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTeachers.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum professor encontrado</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Adicione professores através da gestão de usuários.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}