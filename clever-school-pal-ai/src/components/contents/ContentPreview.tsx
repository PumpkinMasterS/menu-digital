import { File, Users, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Content } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import removido - Separator não usado

interface ContentPreviewProps {
  content: Content | null;
  onClose: () => void;
}

const ContentPreview = ({ content, onClose }: ContentPreviewProps) => {
  if (!content) return null;

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge for assignment
  const getAssignmentStatusBadge = (status: string, isRequired: boolean) => {
    switch (status) {
      case 'assigned':
        return (
          <Badge variant={isRequired ? "default" : "secondary"}>
            <Calendar className="h-3 w-3 mr-1" />
            {isRequired ? 'Obrigatório' : 'Opcional'}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Em Progresso
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Atrasado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Calendar className="h-3 w-3 mr-1" />
            Atribuído
          </Badge>
        );
    }
  };

  // Render content based on type
  const renderContentPreview = () => {
    switch (content.contentType) {
      case "text":
        return (
          <div className="whitespace-pre-wrap max-h-96 overflow-y-auto border rounded p-4 bg-card">
            {content.contentData}
          </div>
        );
      case "pdf":
        return (
          <iframe 
            src={content.contentData} 
            className="w-full h-[600px] border rounded"
            title={content.title}
          />
        );
      case "image":
        return (
          <div className="text-center">
            <img 
              src={content.contentData} 
              alt={content.title}
              className="max-w-full max-h-[600px] mx-auto border rounded"
            />
          </div>
        );
      case "video":
        return (
          <video 
            controls 
            className="w-full max-h-[600px] border rounded"
          >
            <source src={content.contentData} />
            Seu navegador não suporta vídeos.
          </video>
        );
      case "link":
        return (
          <div className="text-center">
            <a 
              href={content.contentData}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {content.contentData}
            </a>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <File className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
            <a 
              href={content.contentData}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visualizar/Baixar Ficheiro
            </a>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 my-4">
      {/* Content Description */}
      {content.description && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Descrição:</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{content.description}</p>
        </div>
      )}
      
      {/* Classes Assignment Section */}
      {content.classAssignments && content.classAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turmas Associadas ({content.classAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.classAssignments.map((assignment, index) => (
              <div key={assignment.classId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{assignment.className}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Atribuído em {formatDate(assignment.assignedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.isRequired && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Obrigatório
                    </Badge>
                  )}
                  {assignment.dueDate && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Prazo: {formatDate(assignment.dueDate)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legacy simple class display (fallback) */}
      {(!content.classAssignments || content.classAssignments.length === 0) && content.className.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Turmas:
          </h4>
          <div className="flex flex-wrap gap-1">
            {content.className.map((name, index) => (
              <Badge key={index} variant="outline">{name}</Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Content Preview */}
      <div className="border-t pt-4 mt-4">
        {renderContentPreview()}
      </div>

      {/* Actions */}
      <div className="flex justify-end mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default ContentPreview;
