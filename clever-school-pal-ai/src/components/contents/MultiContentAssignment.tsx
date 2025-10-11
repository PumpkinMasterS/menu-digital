import { useState } from 'react';
import { Check, X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Content, Class, ContentAssignment } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface MultiContentAssignmentProps {
  selectedContents: Content[];
  availableClasses: Class[];
  onAssign: (assignments: Omit<ContentAssignment, 'id' | 'assignedAt' | 'assignedBy'>[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const MultiContentAssignment = ({
  selectedContents,
  availableClasses,
  onAssign,
  onCancel,
  isLoading = false
}: MultiContentAssignmentProps) => {
  const { toast } = useToast();
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [notes, setNotes] = useState('');

  const handleClassToggle = (classId: string) => {
    const newSelection = new Set(selectedClasses);
    if (selectedClasses.has(classId)) {
      newSelection.delete(classId);
    } else {
      newSelection.add(classId);
    }
    setSelectedClasses(newSelection);
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.size === availableClasses.length) {
      setSelectedClasses(new Set());
    } else {
      setSelectedClasses(new Set(availableClasses.map(cls => cls.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedClasses.size === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma turma para atribuir os conteúdos.",
        variant: "destructive"
      });
      return;
    }

    const assignments: Omit<ContentAssignment, 'id' | 'assignedAt' | 'assignedBy'>[] = [];
    
    selectedContents.forEach(content => {
      selectedClasses.forEach(classId => {
        assignments.push({
          contentId: content.id,
          classId,
          dueDate: dueDate || undefined,
          isRequired
        });
      });
    });

    try {
      await onAssign(assignments);
      toast({
        title: "Sucesso",
        description: `${selectedContents.length} conteúdo(s) atribuído(s) a ${selectedClasses.size} turma(s).`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atribuir conteúdos. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const getContentsByYear = () => {
    const contentsByYear: Record<number, Content[]> = {};
    selectedContents.forEach(content => {
      const year = content.yearLevel || 5; // Default to year 5 if not specified
      if (!contentsByYear[year]) {
        contentsByYear[year] = [];
      }
      contentsByYear[year].push(content);
    });
    return contentsByYear;
  };

  const getClassesByYear = () => {
    const classesByYear: Record<string, Class[]> = {};
    availableClasses.forEach(cls => {
      const grade = cls.grade || "Sem Ano";
      if (!classesByYear[grade]) {
        classesByYear[grade] = [];
      }
      classesByYear[grade].push(cls);
    });
    return classesByYear;
  };

  const contentsByYear = getContentsByYear();
  const classesByYear = getClassesByYear();

  return (
    <div className="space-y-6">
      {/* Selected Contents Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Conteúdos Selecionados ({selectedContents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(contentsByYear).map(([year, contents]) => (
              <div key={year}>
                <Label className="text-sm font-medium">
                  {year}º Ano ({contents.length} conteúdos)
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contents.map(content => (
                    <Badge key={content.id} variant="secondary" className="text-xs">
                      {content.title}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Selecionar Turmas
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllClasses}
            >
              {selectedClasses.size === availableClasses.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableClasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma turma disponível para atribuição.</p>
                <p className="text-sm mt-1">Verifique se existem turmas cadastradas no sistema.</p>
              </div>
            ) : (
              Object.entries(classesByYear).map(([grade, classes]) => (
                <div key={grade}>
                  <Label className="text-sm font-medium mb-2 block">
                    {grade}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classes.map(cls => (
                      <div
                        key={cls.id}
                        className={cn(
                          "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedClasses.has(cls.id) 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleClassToggle(cls.id)}
                      >
                        <Checkbox
                          checked={selectedClasses.has(cls.id)}
                          onChange={() => handleClassToggle(cls.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{cls.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {cls.schoolName}
                          </div>
                          {cls.academicYear && (
                            <div className="text-xs text-muted-foreground">
                              Ano Letivo: {cls.academicYear}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Options */}
      <Card>
        <CardHeader>
          <CardTitle>Opções de Atribuição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Conteúdo Obrigatório</Label>
              <div className="text-xs text-muted-foreground">
                Marcar como conteúdo obrigatório para os estudantes
              </div>
            </div>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Vencimento (Opcional)
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre esta atribuição..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assignment Summary */}
      {selectedClasses.size > 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Check className="h-5 w-5" />
              <span className="font-medium">
                Resumo: {selectedContents.length} conteúdo(s) serão atribuídos a {selectedClasses.size} turma(s)
              </span>
            </div>
            <div className="text-sm text-green-600 dark:text-green-300 mt-1">
              Total de atribuições: {selectedContents.length * selectedClasses.size}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={handleAssign}
          disabled={isLoading || selectedClasses.size === 0}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <Clock className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Atribuindo...' : 'Atribuir Conteúdos'}
        </Button>
      </div>
    </div>
  );
};

export default MultiContentAssignment; 