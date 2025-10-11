import { Content } from "@/types";
import ContentCard from "./ContentCard";
import { FileText, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getStatusBadgeVariant, getStatusLabel } from "./ContentCard";

interface ContentListProps {
  view: "grid" | "list";
  contents: Content[];
  onView: (content: Content) => void;
  onEdit?: (content: Content) => void;
  onDelete?: (content: Content) => void;
  onStatusToggle?: (content: Content, newStatus: 'ativo' | 'desativado') => void;
  isLoading: boolean;
  searchQuery: string;
}

const ContentList = ({ 
  view, 
  contents, 
  onView, 
  onEdit, 
  onDelete, 
  onStatusToggle,
  isLoading, 
  searchQuery 
}: ContentListProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
                          <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <FileText className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum conteúdo encontrado.{" "}
            {searchQuery ? (
              "Tente refinar sua busca."
            ) : (
              <>
                Clique em <strong>Novo Conteúdo</strong> para começar.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.map((content) => (
          <div key={content.id} className="relative">
            <ContentCard 
              content={content} 
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusToggle={onStatusToggle}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Título</th>
                <th className="text-left p-3">Escola</th>
                <th className="text-left p-3">Disciplina</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Turmas</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {contents.map((content) => (
                <tr key={content.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{content.title}</td>
                  <td className="p-3">{content.schoolName}</td>
                  <td className="p-3">{content.subjectName}</td>
                  <td className="p-3 capitalize">{content.contentType}</td>
                  <td className="p-3">{content.className.join(", ")}</td>
                  <td className="p-3">
                    <Badge variant={getStatusBadgeVariant(content.status)}>
                      {getStatusLabel(content.status)}
                    </Badge>
                  </td>
                  <td className="p-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentList;
