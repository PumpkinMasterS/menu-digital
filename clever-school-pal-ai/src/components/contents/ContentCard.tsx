import { Content } from "@/types";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ContentCardProps {
  content: Content;
  onView: (content: Content) => void;
  onEdit?: (content: Content) => void;
  onDelete?: (content: Content) => void;
  onStatusToggle?: (content: Content, newStatus: 'ativo' | 'desativado') => void;
}

export const getContentTypeIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return "📄";
    case "video":
      return "🎬";
    case "text":
      return "📝";
    case "image":
      return "🖼️";
    default:
      return "📎";
  }
};

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "ativo":
      return "default";
    case "desativado":
      return "secondary";
    default:
      return "secondary";
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "ativo":
      return "✅ Ativo";
    case "desativado":
      return "❌ Desativado";
    default:
      return status;
  }
};

const ContentCard = ({ content, onView, onEdit, onDelete, onStatusToggle }: ContentCardProps) => {
  const handleStatusToggle = () => {
    const newStatus = content.status === 'ativo' ? 'desativado' : 'ativo';
    onStatusToggle?.(content, newStatus);
  };
  
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center">
            <span className="mr-2 text-lg" aria-hidden="true">
              {getContentTypeIcon(content.contentType)}
            </span>
            <CardTitle className="text-base">{content.title}</CardTitle>
          </div>
          <CardDescription>
            {content.subjectName} • {content.schoolName}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Indicator - Clickable */}
          <button
            onClick={handleStatusToggle}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors"
            title={content.status === 'ativo' ? 'Clique para desativar' : 'Clique para ativar'}
          >
            <div 
              className={`w-3 h-3 rounded-full ${
                content.status === 'ativo' ? 'bg-green-500' : 'bg-muted-foreground'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {content.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(content)}>
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(content)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(content)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {content.description}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <Badge variant={getStatusBadgeVariant(content.status)}>
              {getStatusLabel(content.status)}
            </Badge>
          </div>
          {content.className.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Turmas:</span> {content.className.join(", ")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentCard;
