import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, GripVertical, BookOpen, Calendar, FolderTree } from 'lucide-react';
import { Content, Topic, YearContent } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DragDropContentOrganizerProps {
  yearContents: YearContent[];
  onContentMove: (contentId: string, newYearLevel: number, newTopicId?: string) => Promise<void>;
  onTopicReorder: (topicId: string, newOrder: number) => Promise<void>;
  className?: string;
}

interface DragItem {
  id: string;
  type: 'content' | 'topic';
  yearLevel: number;
  topicId?: string;
  content?: Content;
  topic?: Topic;
}

const DragDropContentOrganizer = ({
  yearContents,
  onContentMove,
  onTopicReorder,
  className
}: DragDropContentOrganizerProps) => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);

  // Get organized data for the selected year
  const currentYearData = yearContents.find(yc => yc.year === selectedYear);

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'pdf': return '📄';
      case 'video': return '🎥';
      case 'image': return '🖼️';
      case 'link': return '🔗';
      case 'text': return '📝';
      default: return '📄';
    }
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    // Same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    setIsLoading(true);

    try {
      if (type === 'topic') {
        // Reordering topics within a subject
        await onTopicReorder(draggableId, destination.index);
        toast({
          title: "Tópico reordenado",
          description: "A ordem dos tópicos foi atualizada com sucesso."
        });
      } else if (type === 'content') {
        // Moving content between topics or years
        const [destType, destYearStr, destTopicId] = destination.droppableId.split('-');
        const newYearLevel = parseInt(destYearStr);
        
        await onContentMove(draggableId, newYearLevel, destTopicId !== 'no-topic' ? destTopicId : undefined);
        
        toast({
          title: "Conteúdo movido",
          description: `Conteúdo movido para ${newYearLevel}º ano com sucesso.`
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao reorganizar o conteúdo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [onContentMove, onTopicReorder, toast]);

  const renderContentItem = (content: Content, index: number) => (
    <Draggable key={content.id} draggableId={content.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group flex items-center gap-3 p-3 bg-card border rounded-lg transition-all",
            snapshot.isDragging ? "shadow-lg rotate-1 bg-blue-50 border-blue-200" : "hover:shadow-md",
            isLoading && "opacity-50"
          )}
        >
          <div
            {...provided.dragHandleProps}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <span className="text-lg">{getContentTypeIcon(content.contentType)}</span>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{content.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {content.subjectName}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {content.difficulty}
            </Badge>
            {content.estimatedDuration && (
              <Badge variant="secondary" className="text-xs">
                {content.estimatedDuration}min
              </Badge>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );

  const renderTopicSection = (subjectId: string, subjectData: any) => {
    const mainTopics = subjectData.topics.filter((topic: Topic) => !topic.parentTopicId);
    const unassignedContents = subjectData.contents.filter((content: Content) => !content.topicId);

    return (
      <div key={subjectId} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          {subjectData.name}
        </div>

        {/* Main Topics */}
        <Droppable droppableId={`topics-${selectedYear}-${subjectId}`} type="topic">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {mainTopics.map((topic: Topic, index: number) => {
                const topicContents = subjectData.contents.filter((content: Content) => content.topicId === topic.id);
                const subtopics = subjectData.topics.filter((t: Topic) => t.parentTopicId === topic.id);

                return (
                  <Draggable key={topic.id} draggableId={topic.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "transition-all",
                          snapshot.isDragging && "shadow-lg rotate-1 bg-blue-50 border-blue-200"
                        )}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <div
                              {...provided.dragHandleProps}
                              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <FolderTree className="h-4 w-4" />
                            <CardTitle className="text-sm">{topic.name}</CardTitle>
                            <Badge variant="outline">
                              {topicContents.length + subtopics.length} itens
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {/* Topic Contents */}
                          <Droppable droppableId={`content-${selectedYear}-${topic.id}`} type="content">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={cn(
                                  "space-y-2 min-h-[60px] p-2 rounded-md transition-colors",
                                  snapshot.isDraggingOver && "bg-blue-50 border-2 border-dashed border-blue-300"
                                )}
                              >
                                {topicContents.length === 0 && !snapshot.isDraggingOver && (
                                  <div className="text-center text-muted-foreground text-xs py-4">
                                    Arraste conteúdos aqui
                                  </div>
                                )}
                                {topicContents.map((content, index) => renderContentItem(content, index))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          {/* Subtopics */}
                          {subtopics.map((subtopic: Topic) => {
                            const subtopicContents = subjectData.contents.filter(
                              (content: Content) => content.subtopicId === subtopic.id
                            );

                            return (
                              <div key={subtopic.id} className="mt-3 pl-4 border-l-2 border-muted">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                  <span className="text-xs font-medium">{subtopic.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {subtopicContents.length}
                                  </Badge>
                                </div>
                                
                                <Droppable droppableId={`content-${selectedYear}-${subtopic.id}`} type="content">
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={cn(
                                        "space-y-2 min-h-[40px] p-2 rounded-md transition-colors",
                                        snapshot.isDraggingOver && "bg-blue-50 border-2 border-dashed border-blue-300"
                                      )}
                                    >
                                      {subtopicContents.length === 0 && !snapshot.isDraggingOver && (
                                        <div className="text-center text-muted-foreground text-xs py-2">
                                          Arraste conteúdos aqui
                                        </div>
                                      )}
                                      {subtopicContents.map((content, index) => renderContentItem(content, index))}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Unassigned Contents */}
        {unassignedContents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Conteúdos Sem Tópico
                <Badge variant="outline">{unassignedContents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Droppable droppableId={`content-${selectedYear}-no-topic`} type="content">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "space-y-2 min-h-[60px] p-2 rounded-md transition-colors",
                      snapshot.isDraggingOver && "bg-blue-50 border-2 border-dashed border-blue-300"
                    )}
                  >
                    {unassignedContents.map((content, index) => renderContentItem(content, index))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Organizar Conteúdos
          </CardTitle>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 6, 7, 8, 9].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}º Ano
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {currentYearData ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              {Object.entries(currentYearData.subjects).map(([subjectId, subjectData]) =>
                renderTopicSection(subjectId, subjectData)
              )}
            </div>
          </DragDropContext>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>Nenhum conteúdo encontrado para o {selectedYear}º ano.</p>
            <p className="text-sm">Adicione conteúdos ou selecione outro ano.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DragDropContentOrganizer; 