import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  FolderTree, 
  Layout,
  BookOpen,
  Video,
  Image,
  FileIcon,
  Link,
  Sparkles,
  Wand2,
  Eye,
  Plus,
  Clock,
  Users,
  Star,
  TrendingUp
} from 'lucide-react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { Content } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'pdf' | 'image' | 'video' | 'link' | 'topic';
  template: string;
  category: 'lesson' | 'exercise' | 'assessment' | 'resource';
  icon: React.ReactNode;
  preview?: string;
}

interface ContentStats {
  total: number;
  active: number;
  views: number;
  popular: Content[];
  recent: Content[];
}

const contentTemplates: ContentTemplate[] = [
  {
    id: 'lesson-plan',
    name: 'Plano de Aula',
    description: 'Template estruturado para criar planos de aula completos',
    type: 'text',
    category: 'lesson',
    icon: <BookOpen className="w-5 h-5" />,
    template: `# Plano de Aula: [TÍTULO]

## Objetivos de Aprendizagem
- Objetivo 1
- Objetivo 2
- Objetivo 3

## Conteúdo Programático
### Introdução (10 min)
- Revisão do conteúdo anterior
- Apresentação do novo tópico

### Desenvolvimento (25 min)
- Explicação teórica
- Exemplos práticos
- Exercícios guiados

### Conclusão (10 min)
- Síntese dos pontos principais
- Esclarecimento de dúvidas
- Preparação para próxima aula

## Recursos Necessários
- Material didático
- Equipamentos
- Exercícios

## Avaliação
- Critérios de avaliação
- Métodos de verificação`
  },
  {
    id: 'exercise-set',
    name: 'Lista de Exercícios',
    description: 'Template para criar listas de exercícios organizadas',
    type: 'text',
    category: 'exercise',
    icon: <FileText className="w-5 h-5" />,
    template: `# Lista de Exercícios: [TÍTULO]

## Instruções
- Leia atentamente cada questão
- Mostre todos os cálculos
- Tempo estimado: [X] minutos

## Exercícios

### Exercício 1
**Enunciado:** [Descrição do problema]

**Resolução:**
[Espaço para resolução]

### Exercício 2
**Enunciado:** [Descrição do problema]

**Resolução:**
[Espaço para resolução]

## Respostas
1. [Resposta 1]
2. [Resposta 2]`
  },
  {
    id: 'assessment',
    name: 'Teste de Avaliação',
    description: 'Template para criar testes e avaliações formais',
    type: 'text',
    category: 'assessment',
    icon: <Star className="w-5 h-5" />,
    template: `# Teste de Avaliação: [DISCIPLINA]

**Nome:** _________________________ **Turma:** _____
**Data:** _________ **Duração:** [X] minutos

## Instruções
- Leia todas as questões antes de começar
- Responda com clareza e objetividade
- Cotação total: [X] pontos

## Parte I - Questões de Escolha Múltipla ([X] pontos)

### Questão 1 ([X] pontos)
[Enunciado da questão]

a) [Opção A]
b) [Opção B]
c) [Opção C]
d) [Opção D]

## Parte II - Questões de Desenvolvimento ([X] pontos)

### Questão 2 ([X] pontos)
[Enunciado da questão de desenvolvimento]

## Critérios de Avaliação
- Clareza na apresentação
- Correção dos conceitos
- Organização das respostas`
  },
  {
    id: 'study-guide',
    name: 'Guia de Estudo',
    description: 'Template para criar guias de estudo e resumos',
    type: 'text',
    category: 'resource',
    icon: <Sparkles className="w-5 h-5" />,
    template: `# Guia de Estudo: [TÓPICO]

## Conceitos Fundamentais

### Conceito 1: [Nome]
**Definição:** [Explicação clara e concisa]
**Exemplo:** [Exemplo prático]
**Aplicação:** [Onde e como usar]

### Conceito 2: [Nome]
**Definição:** [Explicação clara e concisa]
**Exemplo:** [Exemplo prático]
**Aplicação:** [Onde e como usar]

## Fórmulas e Regras Importantes
- Fórmula 1: [Descrição]
- Fórmula 2: [Descrição]

## Dicas de Estudo
1. [Dica 1]
2. [Dica 2]
3. [Dica 3]

## Exercícios Recomendados
- [Referência 1]
- [Referência 2]

## Recursos Adicionais
- [Link ou referência 1]
- [Link ou referência 2]`
  }
];

export const ContentManagementAdvanced: React.FC = () => {
  const { user } = useUnifiedAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Fetch content statistics
  const { data: contentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['content-stats'],
    queryFn: async (): Promise<ContentStats> => {
      const { data: contents, error } = await supabase
        .from('contents')
        .select(`
          id, title, status, views, created_at, content_type,
          subjects(name),
          content_classes(classes(name))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const total = contents?.length || 0;
      const active = contents?.filter(c => c.status === 'ativo').length || 0;
      const totalViews = contents?.reduce((sum, c) => sum + (c.views || 0), 0) || 0;
      
      const popular = contents
        ?.sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          title: c.title,
          views: c.views || 0,
          contentType: c.content_type,
          subjectName: c.subjects?.name || 'Sem disciplina'
        })) || [];
      
      const recent = contents?.slice(0, 5) || [];
      
      return {
        total,
        active,
        views: totalViews,
        popular: popular as any,
        recent: recent as any
      };
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch all contents for management
  const { data: contents, isLoading: contentsLoading } = useQuery({
    queryKey: ['contents-advanced'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contents')
        .select(`
          *,
          subjects(name, school_id, schools(name)),
          content_classes(
            class_id,
            classes(id, name, grade)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const createFromTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'pdf': return <FileIcon className="w-4 h-4" />;
      case 'link': return <Link className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? contentTemplates 
    : contentTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
              <FolderTree className="w-6 h-6 text-white" />
            </div>
            Gestão Avançada de Conteúdos
          </h2>
          <p className="text-muted-foreground mt-1">
            Interface completa para criação, organização e gestão de materiais educacionais
          </p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
          Sistema Avançado
        </Badge>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && contentStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Conteúdos</p>
                  <p className="text-2xl font-bold">{contentStats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conteúdos Ativos</p>
                  <p className="text-2xl font-bold">{contentStats.active}</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Visualizações</p>
                  <p className="text-2xl font-bold">{contentStats.views}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Ativação</p>
                  <p className="text-2xl font-bold">
                    {contentStats.total > 0 ? Math.round((contentStats.active / contentStats.total) * 100) : 0}%
                  </p>
                </div>
                <Star className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Organização
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Conteúdos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contentStats?.recent.slice(0, 5).map((content, index) => (
                    <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getContentTypeIcon(content.contentType)}
                        <div>
                          <p className="font-medium text-sm">{content.title}</p>
                          <p className="text-xs text-muted-foreground">{content.subjectName}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{content.status}</Badge>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            {/* Popular Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Conteúdos Populares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contentStats?.popular.map((content, index) => (
                    <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getContentTypeIcon(content.contentType)}
                        <div>
                          <p className="font-medium text-sm">{content.title}</p>
                          <p className="text-xs text-muted-foreground">{content.subjectName}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{content.views} views</Badge>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Templates de Conteúdo</h3>
              <p className="text-sm text-muted-foreground">
                Use templates prontos para acelerar a criação de conteúdos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="lesson">Aulas</SelectItem>
                  <SelectItem value="exercise">Exercícios</SelectItem>
                  <SelectItem value="assessment">Avaliações</SelectItem>
                  <SelectItem value="resource">Recursos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        {template.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline" className="text-xs mt-1">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {template.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => createFromTemplate(template)}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Usar Template
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="w-5 h-5" />
                Organização Hierárquica
              </CardTitle>
              <CardDescription>
                Organize conteúdos por anos letivos, disciplinas e tópicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FolderTree className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Organização por Tópicos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Funcionalidade em desenvolvimento para organizar conteúdos hierarquicamente
                </p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Estrutura
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Estatísticas de Uso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Conteúdos Ativos</span>
                    <span className="font-medium">{contentStats?.active || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total de Visualizações</span>
                    <span className="font-medium">{contentStats?.views || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Média por Conteúdo</span>
                    <span className="font-medium">
                      {contentStats?.total ? Math.round((contentStats.views || 0) / contentStats.total) : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Engajamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Métricas de engajamento em desenvolvimento
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 