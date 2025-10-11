import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileText, 
  Database, 
  Filter, 
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  School,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportConfig {
  type: 'students' | 'contents' | 'schools' | 'classes' | 'subjects';
  format: 'csv' | 'json' | 'excel';
  filters: {
    schoolId?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    includeInactive?: boolean;
  };
  fields: string[];
}

export function DataExportDialog({ open, onOpenChange }: DataExportDialogProps) {
  const [selectedTab, setSelectedTab] = useState<ExportConfig['type']>('students');
  const [exportFormat, setExportFormat] = useState<ExportConfig['format']>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Fetch schools for filtering
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data || [];
    }
  });

  // Define available fields for each data type
  const fieldDefinitions = {
    students: [
      { id: 'name', label: 'Nome', required: true },
      { id: 'email', label: 'Email' },
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'school_name', label: 'Escola' },
      { id: 'class_name', label: 'Turma' },
      { id: 'bot_active', label: 'Bot Ativo' },
      { id: 'special_context', label: 'Contexto Especial' },
      { id: 'created_at', label: 'Data de Criação' }
    ],
    contents: [
      { id: 'title', label: 'Título', required: true },
      { id: 'description', label: 'Descrição' },
      { id: 'content_type', label: 'Tipo' },
      { id: 'school_name', label: 'Escola' },
      { id: 'subject_name', label: 'Disciplina' },
      { id: 'status', label: 'Status' },
      { id: 'file_url', label: 'URL do Arquivo' },
      { id: 'tags', label: 'Tags' },
      { id: 'created_at', label: 'Data de Criação' }
    ],
    schools: [
      { id: 'name', label: 'Nome', required: true },
      { id: 'address', label: 'Endereço' },
      { id: 'phone', label: 'Telefone' },
      { id: 'email', label: 'Email' },
      { id: 'students_count', label: 'Nº de Estudantes' },
      { id: 'classes_count', label: 'Nº de Turmas' },
      { id: 'created_at', label: 'Data de Criação' }
    ],
    classes: [
      { id: 'name', label: 'Nome', required: true },
      { id: 'grade', label: 'Ano' },
      { id: 'academic_year', label: 'Ano Letivo' },
      { id: 'school_name', label: 'Escola' },
      { id: 'students_count', label: 'Nº de Estudantes' },
      { id: 'general_context', label: 'Contexto Geral' },
      { id: 'created_at', label: 'Data de Criação' }
    ],
    subjects: [
      { id: 'name', label: 'Nome', required: true },
      { id: 'description', label: 'Descrição' },
      { id: 'grade', label: 'Ano' },
      { id: 'school_name', label: 'Escola' },
      { id: 'contents_count', label: 'Nº de Conteúdos' },
      { id: 'created_at', label: 'Data de Criação' }
    ]
  };

  const currentFields = fieldDefinitions[selectedTab];

  // Initialize selected fields when tab changes
  const handleTabChange = (tab: ExportConfig['type']) => {
    setSelectedTab(tab);
    const requiredFields = fieldDefinitions[tab].filter(f => f.required).map(f => f.id);
    setSelectedFields(requiredFields);
  };

  // Handle field selection
  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const field = currentFields.find(f => f.id === fieldId);
    if (field?.required) return; // Can't deselect required fields

    if (checked) {
      setSelectedFields([...selectedFields, fieldId]);
    } else {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    }
  };

  const handleSelectAllFields = () => {
    setSelectedFields(currentFields.map(f => f.id));
  };

  const handleDeselectOptionalFields = () => {
    const requiredFields = currentFields.filter(f => f.required).map(f => f.id);
    setSelectedFields(requiredFields);
  };

  // Export data function
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Selecione pelo menos um campo para exportar");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      let query = supabase.from(selectedTab);
      
      // Build the select clause
      let selectFields = selectedFields.join(', ');
      
      // Add related data for joined fields
      if (selectedTab === 'students') {
        selectFields = selectedFields.map(field => {
          if (field === 'school_name') return 'schools(name)';
          if (field === 'class_name') return 'classes(name)';
          return field;
        }).join(', ');
      } else if (selectedTab === 'contents') {
        selectFields = selectedFields.map(field => {
          if (field === 'school_name') return 'schools(name)';
          if (field === 'subject_name') return 'subjects(name)';
          return field;
        }).join(', ');
      }

      setExportProgress(25);

      const { data, error } = await query.select(selectFields);
      
      if (error) throw error;

      setExportProgress(50);

      // Apply filters
      let filteredData = data || [];
      
      if (selectedSchool !== 'all') {
        filteredData = filteredData.filter((item: any) => 
          item.school_id === selectedSchool
        );
      }

      if (selectedStatus !== 'all' && selectedTab === 'contents') {
        filteredData = filteredData.filter((item: any) => 
          item.status === selectedStatus
        );
      }

      if (!includeInactive && selectedTab === 'students') {
        filteredData = filteredData.filter((item: any) => 
          item.bot_active !== false
        );
      }

      setExportProgress(75);

      // Format data based on export format
      let exportData: string;
      let filename: string;
      let mimeType: string;

      switch (exportFormat) {
        case 'csv':
          exportData = convertToCSV(filteredData, selectedFields);
          filename = `${selectedTab}_export_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          exportData = JSON.stringify(filteredData, null, 2);
          filename = `${selectedTab}_export_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'excel':
          // For Excel, we'll use CSV format for simplicity
          exportData = convertToCSV(filteredData, selectedFields);
          filename = `${selectedTab}_export_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        default:
          throw new Error('Formato de exportação não suportado');
      }

      setExportProgress(90);

      // Download the file
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);

      toast.success(`Dados exportados com sucesso! ${filteredData.length} registros exportados.`);
      
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 1000);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // Convert data to CSV format
  const convertToCSV = (data: any[], fields: string[]) => {
    if (data.length === 0) return '';

    const headers = fields.map(field => {
      const fieldDef = currentFields.find(f => f.id === field);
      return fieldDef?.label || field;
    });

    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = fields.map(field => {
        let value = row[field];
        
        // Handle nested objects (like schools.name)
        if (field === 'school_name' && row.schools) {
          value = row.schools?.name || 'Sem escola';
        } else if (field === 'class_name' && row.classes) {
          value = row.classes?.name || 'Sem turma';
        } else if (field === 'subject_name' && row.subjects) {
          value = row.subjects?.name || 'Sem disciplina';
        } else {
          value = row[field as keyof typeof row];
        }

        // Escape commas and quotes in CSV
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }

        return value || '';
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  const reset = () => {
    setExportProgress(0);
    setIsExporting(false);
    const requiredFields = currentFields.filter(f => f.required).map(f => f.id);
    setSelectedFields(requiredFields);
    setSelectedSchool('all');
    setSelectedStatus('all');
    setIncludeInactive(false);
  };

  const getTabIcon = (tab: ExportConfig['type']) => {
    switch (tab) {
      case 'students': return <Users className="h-4 w-4" />;
      case 'contents': return <FileText className="h-4 w-4" />;
      case 'schools': return <School className="h-4 w-4" />;
      case 'classes': return <GraduationCap className="h-4 w-4" />;
      case 'subjects': return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dados
          </DialogTitle>
          <DialogDescription>
            Exporte dados do sistema em diferentes formatos com opções de filtragem avançadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Tabs */}
          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="students" className="flex items-center gap-2">
                {getTabIcon('students')}
                Estudantes
              </TabsTrigger>
              <TabsTrigger value="contents" className="flex items-center gap-2">
                {getTabIcon('contents')}
                Conteúdos
              </TabsTrigger>
              <TabsTrigger value="schools" className="flex items-center gap-2">
                {getTabIcon('schools')}
                Escolas
              </TabsTrigger>
              <TabsTrigger value="classes" className="flex items-center gap-2">
                {getTabIcon('classes')}
                Turmas
              </TabsTrigger>
              <TabsTrigger value="subjects" className="flex items-center gap-2">
                {getTabIcon('subjects')}
                Disciplinas
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Export Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Configuração da Exportação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Format Selection */}
                    <div className="space-y-2">
                      <Label>Formato de Exportação</Label>
                      <Select value={exportFormat} onValueChange={(value: ExportConfig['format']) => setExportFormat(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV (Comma-separated values)</SelectItem>
                          <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                          <SelectItem value="excel">Excel (CSV format)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filters */}
                    <div className="space-y-2">
                      <Label>Filtros</Label>
                      
                      {/* School Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm">Escola</Label>
                        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as escolas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as escolas</SelectItem>
                            {schools.map(school => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status Filter (for contents) */}
                      {selectedTab === 'contents' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Status</Label>
                          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos os status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os status</SelectItem>
                                              <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="desativado">Desativado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Include Inactive (for students) */}
                      {selectedTab === 'students' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="includeInactive"
                            checked={includeInactive}
                            onCheckedChange={(checked) => setIncludeInactive(checked === true)}
                          />
                          <Label htmlFor="includeInactive" className="text-sm">
                            Incluir estudantes inativos
                          </Label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Field Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Campos para Exportar
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSelectAllFields}>
                          Selecionar Todos
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeselectOptionalFields}>
                          Apenas Obrigatórios
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Selecione os campos que deseja incluir na exportação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {currentFields.map(field => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.id}
                            checked={selectedFields.includes(field.id)}
                            onCheckedChange={(checked) => handleFieldToggle(field.id, !!checked)}
                            disabled={field.required}
                          />
                          <Label htmlFor={field.id} className="text-sm flex items-center gap-2">
                            {field.label}
                            {field.required && (
                              <Badge variant="secondary" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Export Progress */}
              {isExporting && (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Exportando dados...</span>
                      </div>
                      <Progress value={exportProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {exportProgress < 25 && "Consultando dados..."}
                        {exportProgress >= 25 && exportProgress < 50 && "Processando registros..."}
                        {exportProgress >= 50 && exportProgress < 75 && "Aplicando filtros..."}
                        {exportProgress >= 75 && exportProgress < 90 && "Formatando dados..."}
                        {exportProgress >= 90 && "Gerando arquivo..."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Resumo da Exportação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium capitalize">{selectedTab}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Formato:</span>
                      <p className="font-medium uppercase">{exportFormat}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Campos:</span>
                      <p className="font-medium">{selectedFields.length} selecionados</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Filtros:</span>
                      <p className="font-medium">
                        {selectedSchool === 'all' && selectedStatus === 'all' && !includeInactive 
                          ? 'Nenhum' 
                          : 'Aplicados'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleExport} 
                  disabled={isExporting || selectedFields.length === 0}
                  className="btn-gradient"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Dados
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 