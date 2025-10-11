import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, FolderOpen, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Content, Topic, YearContent } from '@/types';
import { cn } from '@/lib/utils';

interface YearContentNavigatorProps {
  yearContents: YearContent[];
  selectedYear: 5 | 6 | 7 | 8 | 9 | null;
  selectedTopicId: string | null;
  selectedSubtopicId: string | null;
  onYearSelect: (year: 5 | 6 | 7 | 8 | 9) => void;
  onTopicSelect: (topicId: string) => void;
  onSubtopicSelect: (subtopicId: string) => void;
  onContentSelect: (content: Content) => void;
  className?: string;
}

const YearContentNavigator = ({
  yearContents,
  selectedYear,
  selectedTopicId,
  selectedSubtopicId,
  onYearSelect,
  onTopicSelect,
  onSubtopicSelect,
  onContentSelect,
  className
}: YearContentNavigatorProps) => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([selectedYear].filter(Boolean)));
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set([selectedTopicId].filter(Boolean)));

  const toggleYear = (year: 5 | 6 | 7 | 8 | 9) => {
    const newExpanded = new Set(expandedYears);
    if (expandedYears.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
    onYearSelect(year);
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (expandedTopics.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
    onTopicSelect(topicId);
  };

  const getYearLabel = (year: number) => {
    switch (year) {
      case 5: return '5º Ano';
      case 6: return '6º Ano';
      case 7: return '7º Ano';
      case 8: return '8º Ano';
      case 9: return '9º Ano';
      default: return `${year}º Ano`;
    }
  };

  const getContentCount = (yearData: YearContent) => {
    return Object.values(yearData.subjects).reduce(
      (total, subject) => total + subject.contents.length,
      0
    );
  };

  const getTopicContents = (yearData: YearContent, topicId: string) => {
    return Object.values(yearData.subjects).flatMap(subject =>
      subject.contents.filter(content => content.topicId === topicId)
    );
  };

  const getSubtopicContents = (yearData: YearContent, subtopicId: string) => {
    return Object.values(yearData.subjects).flatMap(subject =>
      subject.contents.filter(content => content.subtopicId === subtopicId)
    );
  };

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Conteúdos por Ano</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {yearContents.map((yearData) => {
            const isYearExpanded = expandedYears.has(yearData.year);
            const contentCount = getContentCount(yearData);

            return (
              <Collapsible
                key={yearData.year}
                open={isYearExpanded}
                onOpenChange={() => toggleYear(yearData.year)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant={selectedYear === yearData.year ? 'secondary' : 'ghost'}
                    className="w-full justify-between px-4 py-3 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      {isYearExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium">{getYearLabel(yearData.year)}</span>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {contentCount} conteúdos
                    </Badge>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-1 pl-4">
                  {Object.entries(yearData.subjects).map(([subjectId, subjectData]) => (
                    <div key={subjectId} className="space-y-1">
                      {/* Subject Header */}
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {subjectData.name}
                      </div>

                      {/* Topics */}
                      {subjectData.topics
                        .filter(topic => !topic.parentTopicId) // Main topics only
                        .sort((a, b) => a.order - b.order)
                        .map((topic) => {
                          const isTopicExpanded = expandedTopics.has(topic.id);
                          const subtopics = subjectData.topics.filter(t => t.parentTopicId === topic.id);
                          const topicContents = getTopicContents(yearData, topic.id);

                          return (
                            <div key={topic.id} className="space-y-1">
                              <Collapsible
                                open={isTopicExpanded}
                                onOpenChange={() => toggleTopic(topic.id)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant={selectedTopicId === topic.id ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-between px-6 py-2 h-auto"
                                  >
                                    <div className="flex items-center gap-2">
                                      {subtopics.length > 0 || topicContents.length > 0 ? (
                                        isTopicExpanded ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />
                                      ) : (
                                        <div className="w-3 h-3" />
                                      )}
                                      <span className="text-xs">{topic.name}</span>
                                    </div>
                                    {(subtopics.length > 0 || topicContents.length > 0) && (
                                      <Badge variant="outline">
                                        {subtopics.length + topicContents.length}
                                      </Badge>
                                    )}
                                  </Button>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="space-y-1 pl-4">
                                  {/* Subtopics */}
                                  {subtopics
                                    .sort((a, b) => a.order - b.order)
                                    .map((subtopic) => {
                                      const subtopicContents = getSubtopicContents(yearData, subtopic.id);
                                      
                                      return (
                                        <div key={subtopic.id} className="space-y-1">
                                          <Button
                                            variant={selectedSubtopicId === subtopic.id ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="w-full justify-between px-8 py-1 h-auto text-xs"
                                            onClick={() => onSubtopicSelect(subtopic.id)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                              {subtopic.name}
                                            </div>
                                            {subtopicContents.length > 0 && (
                                              <Badge variant="outline">
                                                {subtopicContents.length}
                                              </Badge>
                                            )}
                                          </Button>

                                          {/* Contents in subtopic */}
                                          {selectedSubtopicId === subtopic.id &&
                                            subtopicContents.map((content) => (
                                              <Button
                                                key={content.id}
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start px-12 py-1 h-auto text-xs text-muted-foreground"
                                                onClick={() => onContentSelect(content)}
                                              >
                                                <FileText className="h-3 w-3 mr-2" />
                                                {content.title}
                                              </Button>
                                            ))
                                          }
                                        </div>
                                      );
                                    })}

                                  {/* Direct topic contents (no subtopic) */}
                                  {topicContents.map((content) => (
                                    <Button
                                      key={content.id}
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start px-8 py-1 h-auto text-xs text-muted-foreground"
                                      onClick={() => onContentSelect(content)}
                                    >
                                      <FileText className="h-3 w-3 mr-2" />
                                      {content.title}
                                    </Button>
                                  ))}
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          );
                        })}

                      {/* Contents without topics */}
                      {subjectData.contents
                        .filter(content => !content.topicId)
                        .map((content) => (
                          <Button
                            key={content.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-6 py-1 h-auto text-xs text-muted-foreground"
                            onClick={() => onContentSelect(content)}
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            {content.title}
                          </Button>
                        ))}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default YearContentNavigator; 