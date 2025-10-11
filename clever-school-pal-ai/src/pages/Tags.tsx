import { useState } from "react";
import { Plus, Tag, Search, Filter, Edit3, Trash2, Hash, Sparkles, BookOpen, Target, Clock, Users, Brain, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface PedagogicalTag {
  id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  created_at: string;
  updated_at?: string;
}

interface TagCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  color: string;
}

const tagCategories: TagCategory[] = [
  {
    id: "subject",
    name: "Disciplinas",
    description: "Tags relacionadas com disciplinas específicas",
    icon: BookOpen,
    color: "blue"
  },
  {
    id: "activity",
    name: "Atividades",
    description: "Tipos de atividades pedagógicas",
    icon: Target,
    color: "green"
  },
  {
    id: "difficulty",
    name: "Dificuldade",
    description: "Níveis de dificuldade do conteúdo",
    icon: Brain,
    color: "orange"
  },
  {
    id: "format",
    name: "Formato",
    description: "Formatos de apresentação do conteúdo",
    icon: Hash,
    color: "purple"
  },
  {
    id: "context",
    name: "Contexto",
    description: "Situações de uso do conteúdo",
    icon: Users,
    color: "pink"
  },
  {
    id: "duration",
    name: "Duração",
    description: "Tempo estimado de atividade",
    icon: Clock,
    color: "indigo"
  }
];

const predefinedTags = [
  // Disciplinas
  { name: "matemática", category: "subject", color: "blue" },
  { name: "português", category: "subject", color: "blue" },
  { name: "ciências", category: "subject", color: "blue" },
  { name: "história", category: "subject", color: "blue" },
  { name: "geografia", category: "subject", color: "blue" },
  { name: "inglês", category: "subject", color: "blue" },
  { name: "educação-física", category: "subject", color: "blue" },

  // Atividades
  { name: "exercício", category: "activity", color: "green" },
  { name: "teoria", category: "activity", color: "green" },
  { name: "prática", category: "activity", color: "green" },
  { name: "projeto", category: "activity", color: "green" },
  { name: "laboratório", category: "activity", color: "green" },
  { name: "discussão", category: "activity", color: "green" },
  { name: "pesquisa", category: "activity", color: "green" },

  // Dificuldade
  { name: "básico", category: "difficulty", color: "orange" },
  { name: "intermédio", category: "difficulty", color: "orange" },
  { name: "avançado", category: "difficulty", color: "orange" },
  { name: "iniciante", category: "difficulty", color: "orange" },
  { name: "expert", category: "difficulty", color: "orange" },

  // Formato
  { name: "visual", category: "format", color: "purple" },
  { name: "áudio", category: "format", color: "purple" },
  { name: "interativo", category: "format", color: "purple" },
  { name: "vídeo", category: "format", color: "purple" },
  { name: "texto", category: "format", color: "purple" },
  { name: "pdf", category: "format", color: "purple" },
  { name: "apresentação", category: "format", color: "purple" },

  // Contexto
  { name: "exame", category: "context", color: "pink" },
  { name: "teste", category: "context", color: "pink" },
  { name: "trabalho-casa", category: "context", color: "pink" },
  { name: "revisão", category: "context", color: "pink" },
  { name: "introdução", category: "context", color: "pink" },
  { name: "avaliação", category: "context", color: "pink" },
  { name: "recuperação", category: "context", color: "pink" },

  // Duração
  { name: "5-min", category: "duration", color: "indigo" },
  { name: "15-min", category: "duration", color: "indigo" },
  { name: "30-min", category: "duration", color: "indigo" },
  { name: "45-min", category: "duration", color: "indigo" },
  { name: "1-hora", category: "duration", color: "indigo" },
  { name: "2-horas", category: "duration", color: "indigo" }
];

const Tags = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<PedagogicalTag | null>(null);

  const [newTag, setNewTag] = useState({
    name: "",
    description: "",
    category: "subject",
    color: "blue"
  });

  // Fetch tags
  const { data: tags } = useQuery({
    queryKey: ['pedagogical-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedagogical_tags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Create tag mutation
  const createTag = useMutation({
    mutationFn: async (tagData: typeof newTag) => {
      const { data, error } = await supabase
        .from('pedagogical_tags')
        .insert({
          name: tagData.name.toLowerCase(),
          description: tagData.description || null,
          category: tagData.category,
          color: tagData.color,
          usage_count: 0,
          is_system: false,
          created_by: 'admin'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedagogical-tags'] });
      setShowCreateDialog(false);
      setNewTag({ name: "", description: "", category: "subject", color: "blue" });
      toast({
        title: "Tag criada",
        description: "A tag pedagógica foi criada com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update tag mutation
  const updateTag = useMutation({
    mutationFn: async (tagData: { id: string; name: string; description?: string; category: string; color: string }) => {
      const { data, error } = await supabase
        .from('pedagogical_tags')
        .update({
          name: tagData.name.toLowerCase(),
          description: tagData.description || null,
          category: tagData.category,
          color: tagData.color
        })
        .eq('id', tagData.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedagogical-tags'] });
      setEditingTag(null);
      toast({
        title: "Tag atualizada",
        description: "A tag pedagógica foi atualizada com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar tag",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete tag mutation
  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('pedagogical_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedagogical-tags'] });
      toast({
        title: "Tag removida",
        description: "A tag pedagógica foi removida com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover tag",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create predefined tags
  const createPredefinedTags = useMutation({
    mutationFn: async () => {
      const tagsToInsert = predefinedTags.map(tag => ({
        name: tag.name,
        category: tag.category,
        color: tag.color,
        usage_count: 0,
        is_system: true,
        created_by: 'system'
      }));

      const { error } = await supabase
        .from('pedagogical_tags')
        .upsert(tagsToInsert, { 
          onConflict: 'name',
          ignoreDuplicates: true 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedagogical-tags'] });
      toast({
        title: "Tags predefinidas criadas",
        description: `${predefinedTags.length} tags pedagógicas úteis foram adicionadas.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tags predefinidas",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Filter tags
  const filteredTags = tags?.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || tag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  // Group tags by category
  const tagsByCategory = filteredTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, PedagogicalTag[]>);

  const getTagColorClass = (color: string, variant: 'bg' | 'text' | 'border' = 'bg') => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    };
    return colorMap[color as keyof typeof colorMap]?.[variant] || colorMap.blue[variant];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tags Pedagógicas</h1>
          <p className="text-muted-foreground">
            Gerir tags para organizar e categorizar conteúdos educativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => createPredefinedTags.mutate()}
            variant="outline"
            disabled={createPredefinedTags.isPending}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Tags Úteis
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Tag</DialogTitle>
                <DialogDescription>
                  Adicione uma nova tag pedagógica para categorizar conteúdos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagName">Nome da Tag *</Label>
                  <Input
                    id="tagName"
                    value={newTag.name}
                    onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                    placeholder="Ex: exercícios-frações"
                  />
                </div>
                <div>
                  <Label htmlFor="tagDescription">Descrição</Label>
                  <Textarea
                    id="tagDescription"
                    value={newTag.description}
                    onChange={(e) => setNewTag({...newTag, description: e.target.value})}
                    placeholder="Descrição opcional da tag..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="tagCategory">Categoria</Label>
                  <Select
                    value={newTag.category}
                    onValueChange={(value) => setNewTag({...newTag, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tagCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <category.icon className="h-4 w-4" />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tagColor">Cor</Label>
                  <Select
                    value={newTag.color}
                    onValueChange={(value) => setNewTag({...newTag, color: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['blue', 'green', 'orange', 'purple', 'pink', 'indigo'].map(color => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getTagColorClass(color)}`}></div>
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createTag.mutate(newTag)}
                  disabled={!newTag.name.trim() || createTag.isPending}
                >
                  Criar Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquisar tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Todas as categorias
              </div>
            </SelectItem>
            {tagCategories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <category.icon className="h-4 w-4" />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tag className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tags?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tags?.filter(t => t.is_system).length || 0}</p>
                <p className="text-sm text-muted-foreground">Tags do Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tags?.filter(t => !t.is_system).length || 0}</p>
                <p className="text-sm text-muted-foreground">Tags Personalizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Hash className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(tagsByCategory).length}</p>
                <p className="text-sm text-muted-foreground">Categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags by Category */}
      <div className="space-y-6">
        {tagCategories.map(category => {
          const categoryTags = tagsByCategory[category.id] || [];
          if (selectedCategory !== "all" && selectedCategory !== category.id) return null;
          if (categoryTags.length === 0 && searchQuery) return null;
          
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.name}
                  <Badge variant="secondary">{categoryTags.length}</Badge>
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map(tag => (
                      <div
                        key={tag.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getTagColorClass(tag.color)} ${getTagColorClass(tag.color, 'text')} ${getTagColorClass(tag.color, 'border')}`}
                      >
                        <span className="text-sm font-medium">{tag.name}</span>
                        {tag.usage_count > 0 && (
                          <Badge variant="secondary" className="text-xs h-4">
                            {tag.usage_count}
                          </Badge>
                        )}
                        {tag.is_system && (
                          <Badge variant="outline" className="text-xs h-4">
                            Sistema
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingTag(tag)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          {!tag.is_system && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => deleteTag.mutate(tag.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma tag encontrada nesta categoria.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Tag Dialog */}
      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tag</DialogTitle>
              <DialogDescription>
                Modificar detalhes da tag pedagógica
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTagName">Nome da Tag *</Label>
                <Input
                  id="editTagName"
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({...editingTag, name: e.target.value})}
                  placeholder="Nome da tag"
                />
              </div>
              <div>
                <Label htmlFor="editTagDescription">Descrição</Label>
                <Textarea
                  id="editTagDescription"
                  value={editingTag.description || ""}
                  onChange={(e) => setEditingTag({...editingTag, description: e.target.value})}
                  placeholder="Descrição da tag..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="editTagCategory">Categoria</Label>
                <Select
                  value={editingTag.category}
                  onValueChange={(value) => setEditingTag({...editingTag, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tagCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <category.icon className="h-4 w-4" />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editTagColor">Cor</Label>
                <Select
                  value={editingTag.color}
                  onValueChange={(value) => setEditingTag({...editingTag, color: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['blue', 'green', 'orange', 'purple', 'pink', 'indigo'].map(color => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getTagColorClass(color)}`}></div>
                          {color.charAt(0).toUpperCase() + color.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTag(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => updateTag.mutate({
                  id: editingTag.id,
                  name: editingTag.name,
                  description: editingTag.description,
                  category: editingTag.category,
                  color: editingTag.color
                })}
                disabled={!editingTag.name.trim() || updateTag.isPending}
              >
                Atualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Tags; 
