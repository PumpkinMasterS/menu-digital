import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Plus, Tag, Sparkles, Hash } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PedagogicalTag {
  id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  is_system: boolean;
}

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  contentType?: string;
  subjectName?: string;
  className?: string;
}

const tagCategories = {
  subject: { name: "Disciplinas", color: "blue" },
  activity: { name: "Atividades", color: "green" },
  difficulty: { name: "Dificuldade", color: "orange" },
  format: { name: "Formato", color: "purple" },
  context: { name: "Contexto", color: "pink" },
  duration: { name: "Duração", color: "indigo" }
};

const TagSelector = ({ selectedTags, onTagsChange, contentType, subjectName, className }: TagSelectorProps) => {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  // Use fallback tags temporarily until pedagogical_tags table is created
  const availableTags = getFallbackTags();
  
  // TODO: Uncomment this when pedagogical_tags table is created in Supabase
  // const { data: availableTags = [] } = useQuery({
  //   queryKey: ['pedagogical-tags'],
  //   queryFn: async () => {
  //     try {
  //       const { data, error } = await supabase
  //         .from('pedagogical_tags')
  //         .select('*')
  //         .order('category', { ascending: true })
  //         .order('name', { ascending: true });
  //       
  //       if (error) {
  //         console.warn('pedagogical_tags table not found, using fallback tags:', error.message);
  //         return getFallbackTags();
  //       }
  //       return data as PedagogicalTag[];
  //     } catch (err) {
  //       console.warn('Error fetching pedagogical tags, using fallback:', err);
  //       return getFallbackTags();
  //     }
  //   },
  //   retry: false, // Don't retry on 404 errors
  //   staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  // });

  // Fallback tags when database table doesn't exist
  const getFallbackTags = (): PedagogicalTag[] => [
    { id: '1', name: 'matemática', category: 'subject', color: '#EF4444', is_system: true },
    { id: '2', name: 'português', category: 'subject', color: '#10B981', is_system: true },
    { id: '3', name: 'ciências', category: 'subject', color: '#8B5CF6', is_system: true },
    { id: '4', name: 'história', category: 'subject', color: '#F59E0B', is_system: true },
    { id: '5', name: 'geografia', category: 'subject', color: '#06B6D4', is_system: true },
    { id: '6', name: 'exercício', category: 'activity', color: '#3B82F6', is_system: true },
    { id: '7', name: 'teoria', category: 'activity', color: '#6B7280', is_system: true },
    { id: '8', name: 'prática', category: 'activity', color: '#059669', is_system: true },
    { id: '9', name: 'básico', category: 'difficulty', color: '#22C55E', is_system: true },
    { id: '10', name: 'intermediário', category: 'difficulty', color: '#F59E0B', is_system: true },
    { id: '11', name: 'avançado', category: 'difficulty', color: '#EF4444', is_system: true }
  ];

  // Generate smart suggestions based on content
  const getSmartSuggestions = (): PedagogicalTag[] => {
    const suggestions: PedagogicalTag[] = [];
    
    // Add content type specific tags
    if (contentType) {
      const typeTag = availableTags.find(tag => 
        tag.category === 'format' && tag.name === contentType
      );
      if (typeTag && !selectedTags.includes(typeTag.name)) {
        suggestions.push(typeTag);
      }
    }

    // Add subject specific tags
    if (subjectName) {
      const subjectTag = availableTags.find(tag => 
        tag.category === 'subject' && 
        tag.name.toLowerCase().includes(subjectName.toLowerCase())
      );
      if (subjectTag && !selectedTags.includes(subjectTag.name)) {
        suggestions.push(subjectTag);
      }
    }

    // Add popular tags not yet selected
    const popularTags = availableTags
      .filter(tag => !selectedTags.includes(tag.name))
      .filter(tag => tag.category === 'activity' || tag.category === 'context')
      .slice(0, 3);
    
    suggestions.push(...popularTags);

    return suggestions.slice(0, 6); // Limit to 6 suggestions
  };

  const smartSuggestions = getSmartSuggestions();

  // Filter tags based on input
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedTags.includes(tag.name)
  );

  const addTag = (tagName: string) => {
    if (!selectedTags.includes(tagName) && tagName.trim()) {
      onTagsChange([...selectedTags, tagName.toLowerCase()]);
    }
    setInputValue("");
    setOpen(false);
  };

  const removeTag = (tagName: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagName));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  const getTagColorClass = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getTagInfo = (tagName: string) => {
    return availableTags.find(tag => tag.name === tagName);
  };

  return (
    <div className={className}>
      <Label className="text-sm font-medium block mb-2">
        Tags Pedagógicas
        <span className="text-xs text-muted-foreground ml-2">
          ({selectedTags.length} selecionadas)
        </span>
      </Label>
      
      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && selectedTags.length === 0 && (
        <Card className="mb-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Sugestões Inteligentes
            </CardTitle>
            <CardDescription className="text-xs">
              Tags recomendadas baseadas no conteúdo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1">
              {smartSuggestions.map(tag => (
                <Button
                  key={tag.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tag.name)}
                  className={`h-6 text-xs border ${getTagColorClass(tag.color)}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tag.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tagName) => {
            const tagInfo = getTagInfo(tagName);
            return (
              <Badge
                key={tagName}
                variant="secondary"
                className={`flex items-center gap-1 ${tagInfo ? getTagColorClass(tagInfo.color) : 'bg-muted text-muted-foreground'}`}
              >
                <Hash className="h-3 w-3" />
                {tagName}
                <button
                  onClick={() => removeTag(tagName)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Tag Input with Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              placeholder="Adicionar tags... (ex: exercício, básico, visual)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setOpen(true)}
              className="pr-10"
            />
            <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Pesquisar tags existentes..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Nenhuma tag encontrada
                  </p>
                  {inputValue.trim() && (
                    <Button
                      size="sm"
                      onClick={() => addTag(inputValue.trim())}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Criar "{inputValue.trim()}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              {Object.entries(tagCategories).map(([categoryId, categoryInfo]) => {
                const categoryTags = filteredTags.filter(tag => tag.category === categoryId);
                if (categoryTags.length === 0) return null;
                
                return (
                  <CommandGroup key={categoryId} heading={categoryInfo.name}>
                    {categoryTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => addTag(tag.name)}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-3 h-3 rounded-full ${getTagColorClass(tag.color).split(' ')[0]}`} />
                        <span>{tag.name}</span>
                        {tag.is_system && (
                          <Badge variant="outline" className="text-xs h-4 ml-auto">
                            Sistema
                          </Badge>
                        )}
                        {tag.description && (
                          <span className="text-xs text-muted-foreground ml-auto truncate max-w-32">
                            {tag.description}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
              
              {inputValue.trim() && !filteredTags.some(tag => tag.name === inputValue.trim()) && (
                <CommandGroup heading="Criar Nova">
                  <CommandItem onSelect={() => addTag(inputValue.trim())}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar "{inputValue.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <p className="text-xs text-muted-foreground mt-1">
        Digite para pesquisar tags existentes ou criar novas. Use Enter para adicionar.
      </p>
    </div>
  );
};

export default TagSelector;