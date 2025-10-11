import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Header from "@/components/layout/Header";
import { 
  Brain, 
  Building, 
  Users, 
  User, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  AlertCircle,
  Info,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SchoolContext {
  id: string;
  school_id: string;
  context_type: string;
  title: string;
  content: string;
  priority: number;
  active: boolean;
}

interface ClassContext {
  id: string;
  name: string;
  grade: string;
  general_context: string;
  school_name: string;
  student_count: number;
}

interface StudentContext {
  id: string;
  name: string;
  special_context: string;
  class_name: string;
  school_name: string;
  class_id: string;
}

interface School {
  id: string;
  name: string;
}

const contextExplanations = {
  school: {
    title: "Contextos da Escola",
    description: "Informações gerais que o agente IA deve conhecer sobre toda a escola",
    examples: [
      "📅 Horários de funcionamento (8h-17h30)",
      "🏛️ História e valores da escola",
      "📋 Políticas e regras gerais",
      "🍽️ Informações da cantina",
      "📞 Contactos importantes",
      "🎉 Eventos e feriados escolares"
    ],
    usage: "Usado em TODAS as conversas do agente IA para contextualizar a escola"
  },
  class: {
    title: "Contextos das Turmas",
    description: "Informações específicas de cada turma que ajudam o agente IA",
    examples: [
      "📝 Próximos testes e avaliações",
      "📚 Projetos em andamento",
      "👥 Características da turma",
      "📖 Matérias em foco no período",
      "🎯 Objetivos específicos da turma"
    ],
    usage: "Usado quando o aluno pertence a esta turma específica"
  },
  student: {
    title: "Contextos dos Alunos",
    description: "Necessidades educacionais especiais e adaptações individuais",
    examples: [
      "🧠 Autismo, TDAH, Dislexia",
      "👁️ Dificuldades visuais/auditivas",
      "⏰ Ritmo de aprendizagem",
      "🎨 Preferências de ensino (visual, prático)",
      "💬 Linguagem adaptada necessária"
    ],
    usage: "Usado apenas para este aluno específico em todas as suas conversas"
  }
};

export default function ContextManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolContexts, setSchoolContexts] = useState<SchoolContext[]>([]);
  const [classContexts, setClassContexts] = useState<ClassContext[]>([]);
  const [studentContexts, setStudentContexts] = useState<StudentContext[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [showSchoolContextDialog, setShowSchoolContextDialog] = useState(false);
  const [showClassContextDialog, setShowClassContextDialog] = useState(false);
  const [showStudentContextDialog, setShowStudentContextDialog] = useState(false);
  const [editingSchoolContext, setEditingSchoolContext] = useState<SchoolContext | null>(null);
  const [editingClassContext, setEditingClassContext] = useState<ClassContext | null>(null);
  const [editingStudentContext, setEditingStudentContext] = useState<StudentContext | null>(null);
  
  // Form states
  const [schoolContextForm, setSchoolContextForm] = useState({
    context_type: 'general',
    title: '',
    content: '',
    priority: 1,
    active: true
  });

  const [classContextForm, setClassContextForm] = useState({
    general_context: ''
  });

  const [studentContextForm, setStudentContextForm] = useState({
    special_context: ''
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchContexts();
      // Reset filters when school changes
      setSelectedGrade("all");
      setSelectedClass("all");
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
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

  const fetchContexts = async () => {
    if (!selectedSchool) return;

    setIsLoading(true);
    try {
      // Fetch school contexts
      const { data: schoolData, error: schoolError } = await supabase
        .from('school_context')
        .select('*')
        .eq('school_id', selectedSchool)
        .order('priority');

      if (schoolError) throw schoolError;
      setSchoolContexts(schoolData || []);

      // Fetch class contexts with student count
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade,
          general_context,
          schools(name),
          students(count)
        `)
        .eq('school_id', selectedSchool);

      if (classError) throw classError;
      setClassContexts(classData?.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        general_context: c.general_context || '',
        school_name: c.schools?.name || '',
        student_count: c.students?.length || 0
      })) || []);

      // Fetch student contexts
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          special_context,
          class_id,
          classes(id, name),
          schools(name)
        `)
        .eq('school_id', selectedSchool)
        .not('special_context', 'is', null)
        .neq('special_context', '');

      if (studentError) throw studentError;
      setStudentContexts(studentData?.map(s => ({
        id: s.id,
        name: s.name,
        special_context: s.special_context || '',
        class_name: s.classes?.name || '',
        school_name: s.schools?.name || '',
        class_id: s.classes?.id || ''
      })) || []);

    } catch (error) {
      console.error('Erro ao carregar contextos:', error);
      toast.error('Erro ao carregar contextos');
    } finally {
      setIsLoading(false);
    }
  };

  // School Context Functions
  const handleSaveSchoolContext = async () => {
    if (!selectedSchool || !schoolContextForm.title || !schoolContextForm.content) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const contextData = {
        school_id: selectedSchool,
        context_type: schoolContextForm.context_type,
        title: schoolContextForm.title,
        content: schoolContextForm.content,
        priority: schoolContextForm.priority,
        active: schoolContextForm.active
      };

      if (editingSchoolContext) {
        const { error } = await supabase
          .from('school_context')
          .update(contextData)
          .eq('id', editingSchoolContext.id);

        if (error) throw error;
        toast.success('Contexto da escola atualizado!');
      } else {
        const { error } = await supabase
          .from('school_context')
          .insert(contextData);

        if (error) throw error;
        toast.success('Contexto da escola criado!');
      }

      setShowSchoolContextDialog(false);
      setEditingSchoolContext(null);
      resetSchoolContextForm();
      fetchContexts();
    } catch (error) {
      console.error('Erro ao salvar contexto:', error);
      toast.error('Erro ao salvar contexto');
    }
  };

  const handleDeleteSchoolContext = async (id: string) => {
    try {
      const { error } = await supabase
        .from('school_context')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Contexto excluído!');
      fetchContexts();
    } catch (error) {
      console.error('Erro ao excluir contexto:', error);
      toast.error('Erro ao excluir contexto');
    }
  };

  const handleToggleSchoolContext = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('school_context')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Contexto ${!currentActive ? 'ativado' : 'desativado'}!`);
      await fetchContexts();
    } catch (error) {
      console.error('Erro ao alterar estado do contexto:', error);
      toast.error('Erro ao alterar estado do contexto');
    }
  };

  // Class Context Functions
  const handleSaveClassContext = async () => {
    if (!editingClassContext || !classContextForm.general_context) {
      toast.error('Preencha o contexto da turma');
      return;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .update({ general_context: classContextForm.general_context })
        .eq('id', editingClassContext.id);

      if (error) throw error;
      toast.success('Contexto da turma atualizado!');
      setShowClassContextDialog(false);
      setEditingClassContext(null);
      resetClassContextForm();
      fetchContexts();
    } catch (error) {
      console.error('Erro ao salvar contexto da turma:', error);
      toast.error('Erro ao salvar contexto da turma');
    }
  };

  // Student Context Functions
  const handleSaveStudentContext = async () => {
    if (!editingStudentContext || !studentContextForm.special_context) {
      toast.error('Preencha o contexto especial do aluno');
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({ special_context: studentContextForm.special_context })
        .eq('id', editingStudentContext.id);

      if (error) throw error;
      toast.success('Contexto do aluno atualizado!');
      setShowStudentContextDialog(false);
      setEditingStudentContext(null);
      resetStudentContextForm();
      fetchContexts();
    } catch (error) {
      console.error('Erro ao salvar contexto do aluno:', error);
      toast.error('Erro ao salvar contexto do aluno');
    }
  };

  // Reset Functions
  const resetSchoolContextForm = () => {
    setSchoolContextForm({
      context_type: 'general',
      title: '',
      content: '',
      priority: 1,
      active: true
    });
  };

  const resetClassContextForm = () => {
    setClassContextForm({ general_context: '' });
  };

  const resetStudentContextForm = () => {
    setStudentContextForm({ special_context: '' });
  };

  // Open Edit Functions
  const openEditSchoolContext = (context: SchoolContext) => {
    setEditingSchoolContext(context);
    setSchoolContextForm({
      context_type: context.context_type,
      title: context.title,
      content: context.content,
      priority: context.priority,
      active: context.active
    });
    setShowSchoolContextDialog(true);
  };

  const openEditClassContext = (classCtx: ClassContext) => {
    setEditingClassContext(classCtx);
    setClassContextForm({ general_context: classCtx.general_context });
    setShowClassContextDialog(true);
  };

  const openEditStudentContext = (student: StudentContext) => {
    setEditingStudentContext(student);
    setStudentContextForm({ special_context: student.special_context });
    setShowStudentContextDialog(true);
  };

  // Open Create Functions
  const openCreateSchoolContext = () => {
    setEditingSchoolContext(null);
    resetSchoolContextForm();
    setShowSchoolContextDialog(true);
  };

  // Filter students by class
  const filteredStudentContexts = selectedClass === "all" 
    ? studentContexts 
    : studentContexts.filter(s => s.class_id === selectedClass);

  // Filter classes by grade
  const filteredClassContexts = selectedGrade === "all" 
    ? classContexts 
    : classContexts.filter(c => c.grade === selectedGrade);

  // Get unique grades for filter options
  const uniqueGrades = [...new Set(classContexts.map(c => c.grade))].sort();

  const ContextExplanationCard = ({ type }: { type: keyof typeof contextExplanations }) => {
    const info = contextExplanations[type];
    return (
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Como usar este contexto?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Propósito:</strong> {info.description}</p>
          <div>
            <strong>Exemplos:</strong>
            <ul className="mt-1 space-y-1">
              {info.examples.map((example, index) => (
                <li key={index} className="text-xs">• {example}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs bg-blue-100 p-2 rounded">
            <strong>💡 Uso:</strong> {info.usage}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Header title="Gerenciamento de Contextos" subtitle="Configure contextos hierárquicos para personalizar respostas da IA" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-heading font-bold text-foreground">
                    Contextos do Agente IA
                  </h1>
                </div>
              </div>

              <Card className="border-l-4 border-l-green-500 bg-green-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-800 mb-1">Sistema de Contextos Hierárquicos</h3>
                      <p className="text-sm text-green-700">
                        O agente IA usa os contextos em ordem: <strong>Escola</strong> (sempre) → <strong>Turma</strong> (se aplicável) → <strong>Aluno</strong> (individual).
                        Isso garante respostas personalizadas e adequadas para cada situação.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Selecionar Escola</CardTitle>
                  <CardDescription>
                    Escolha uma escola para gerir os seus contextos hierárquicos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Selecione uma escola..." />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedSchool && (
                <Tabs defaultValue="school" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="school" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Contexto Escola
                    </TabsTrigger>
                    <TabsTrigger value="class" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contexto Turmas
                    </TabsTrigger>
                    <TabsTrigger value="student" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contexto Alunos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="school" className="space-y-4">
                    <ContextExplanationCard type="school" />
                    
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Building className="h-5 w-5" />
                              Contextos da Escola
                            </CardTitle>
                            <CardDescription>
                              Informações que o agente IA usará em TODAS as conversas desta escola
                            </CardDescription>
                          </div>
                          <Button onClick={openCreateSchoolContext} className="btn-gradient">
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Contexto
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="text-center py-8">Carregando...</div>
                        ) : schoolContexts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum contexto configurado para esta escola</p>
                            <p className="text-sm mt-2">Crie contextos como horários, políticas, eventos...</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {schoolContexts.map((context) => (
                              <Card key={context.id} className={`border-l-4 ${context.active ? 'border-l-primary' : 'border-l-gray-300'} ${!context.active ? 'opacity-60 bg-gray-50' : ''}`}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <CardTitle className={`text-lg ${!context.active ? 'text-gray-500' : ''}`}>{context.title}</CardTitle>
                                      <Badge variant={context.active ? "default" : "secondary"}>
                                        {context.active ? "Ativo" : "Inativo"}
                                      </Badge>
                                      <Badge variant="outline">
                                        Prioridade {context.priority}
                                      </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant={context.active ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => handleToggleSchoolContext(context.id, context.active)}
                                        className={context.active ? "" : "opacity-60"}
                                        title={context.active ? "Clique para desativar" : "Clique para ativar"}
                                      >
                                        {context.active ? "🟢" : "⚪"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditSchoolContext(context)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteSchoolContext(context.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <p className={`text-sm mb-2 ${!context.active ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                    Tipo: {context.context_type}
                                  </p>
                                  <p className={`text-sm ${!context.active ? 'text-gray-500' : ''}`}>{context.content}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="class" className="space-y-4">
                    <ContextExplanationCard type="class" />
                    
                    <div className="flex gap-4 items-center">
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filtrar por ano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os anos</SelectItem>
                          {uniqueGrades.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {filteredClassContexts.length} turmas encontradas
                      </p>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Contextos das Turmas
                        </CardTitle>
                        <CardDescription>
                          Informações específicas que o agente IA usará apenas para alunos desta turma
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {filteredClassContexts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{classContexts.length === 0 ? 'Nenhuma turma encontrada para esta escola' : 'Nenhuma turma encontrada para este ano'}</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredClassContexts.map((classCtx) => (
                              <Card key={classCtx.id} className="border-l-4 border-l-blue-500">
                                <CardHeader>
                                  <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span>{classCtx.name}</span>
                                      <Badge variant="secondary">{classCtx.grade}</Badge>
                                      <Badge variant="outline">{classCtx.student_count} alunos</Badge>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openEditClassContext(classCtx)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm">
                                    {classCtx.general_context || 'Nenhum contexto específico definido'}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="student" className="space-y-4">
                    <ContextExplanationCard type="student" />
                    
                    <div className="flex gap-4 items-center">
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filtrar por turma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as turmas</SelectItem>
                          {classContexts.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {filteredStudentContexts.length} alunos com necessidades especiais
                      </p>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Contextos dos Alunos
                        </CardTitle>
                        <CardDescription>
                          Necessidades especiais e adaptações individuais para o agente IA
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {filteredStudentContexts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum aluno com necessidades especiais registadas</p>
                            <p className="text-sm mt-2">Configure contextos especiais na página de alunos</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredStudentContexts.map((student) => (
                              <Card key={student.id} className="border-l-4 border-l-orange-500">
                                <CardHeader>
                                  <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span>{student.name}</span>
                                      <Badge variant="outline">{student.class_name}</Badge>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openEditStudentContext(student)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm">{student.special_context}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
        </div>
      </main>

      {/* School Context Dialog */}
      <Dialog open={showSchoolContextDialog} onOpenChange={setShowSchoolContextDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchoolContext ? 'Editar' : 'Criar'} Contexto da Escola
            </DialogTitle>
            <DialogDescription>
              Configure informações que o agente IA deve conhecer sobre esta escola
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="context_type">Tipo de Contexto</Label>
                <Select 
                  value={schoolContextForm.context_type} 
                  onValueChange={(value) => setSchoolContextForm({...schoolContextForm, context_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="holidays">Feriados</SelectItem>
                    <SelectItem value="events">Eventos</SelectItem>
                    <SelectItem value="policies">Políticas</SelectItem>
                    <SelectItem value="schedules">Horários</SelectItem>
                    <SelectItem value="contacts">Contactos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select 
                  value={schoolContextForm.priority.toString()} 
                  onValueChange={(value) => setSchoolContextForm({...schoolContextForm, priority: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta (1)</SelectItem>
                    <SelectItem value="2">Média (2)</SelectItem>
                    <SelectItem value="3">Baixa (3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={schoolContextForm.title}
                onChange={(e) => setSchoolContextForm({...schoolContextForm, title: e.target.value})}
                placeholder="Ex: Horários de Funcionamento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={schoolContextForm.content}
                onChange={(e) => setSchoolContextForm({...schoolContextForm, content: e.target.value})}
                placeholder="Ex: A escola funciona de segunda a sexta-feira, das 8h00 às 17h30..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={schoolContextForm.active}
                onChange={(e) => setSchoolContextForm({...schoolContextForm, active: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="active">Contexto ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSchoolContextDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSchoolContext} className="btn-gradient">
              <Save className="h-4 w-4 mr-2" />
              {editingSchoolContext ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Context Dialog */}
      <Dialog open={showClassContextDialog} onOpenChange={setShowClassContextDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Contexto da Turma {editingClassContext?.name}
            </DialogTitle>
            <DialogDescription>
              Configure informações específicas que o agente IA deve saber sobre esta turma
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="general_context">Contexto da Turma</Label>
              <Textarea
                id="general_context"
                value={classContextForm.general_context}
                onChange={(e) => setClassContextForm({general_context: e.target.value})}
                placeholder="Ex: Próximo teste de matemática dia 15. Projeto de ciências em andamento sobre o sistema solar..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Usado apenas quando o agente IA conversar com alunos desta turma específica
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowClassContextDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveClassContext} className="btn-gradient">
              <Save className="h-4 w-4 mr-2" />
              Atualizar Contexto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Context Dialog */}
      <Dialog open={showStudentContextDialog} onOpenChange={setShowStudentContextDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Contexto do Aluno {editingStudentContext?.name}
            </DialogTitle>
            <DialogDescription>
              Configure necessidades especiais e adaptações para o agente IA
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="special_context">Contexto Especial</Label>
              <Textarea
                id="special_context"
                value={studentContextForm.special_context}
                onChange={(e) => setStudentContextForm({special_context: e.target.value})}
                placeholder="Ex: Aluno com autismo, precisa de explicações claras e tempo extra. Prefere exemplos visuais..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Usado em TODAS as conversas deste aluno específico
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowStudentContextDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStudentContext} className="btn-gradient">
              <Save className="h-4 w-4 mr-2" />
              Atualizar Contexto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}