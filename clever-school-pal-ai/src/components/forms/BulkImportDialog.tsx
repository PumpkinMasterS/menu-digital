import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  X,
  Eye,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'students' | 'contents' | 'schools';
  onImport: (data: any[]) => Promise<void>;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ParsedData {
  valid: any[];
  errors: ImportError[];
  preview: any[];
}

export function BulkImportDialog({ open, onOpenChange, type, onImport }: BulkImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplateConfig = () => {
    switch (type) {
      case 'students':
        return {
          title: "Importar Alunos",
          description: "Importe múltiplos alunos através de um ficheiro CSV",
          icon: <Users className="h-6 w-6" />,
          requiredFields: ['name', 'phone_number', 'school_name', 'class_name'],
          optionalFields: ['email', 'whatsapp_number', 'special_context'],
          templateData: [
            { name: 'João Silva', phone_number: '919999999', email: 'joao@email.com', school_name: 'Escola Primária', class_name: '5º A' },
            { name: 'Maria Santos', phone_number: '918888888', email: 'maria@email.com', school_name: 'Escola Primária', class_name: '5º B' }
          ]
        };
      case 'contents':
        return {
          title: "Importar Conteúdos",
          description: "Importe múltiplos conteúdos educativos através de um ficheiro CSV",
          icon: <BookOpen className="h-6 w-6" />,
          requiredFields: ['title', 'description', 'subject_name', 'grade'],
          optionalFields: ['content_data', 'learning_objectives', 'tags'],
          templateData: [
            { title: 'Matemática Básica', description: 'Introdução aos números', subject_name: 'Matemática', grade: '5º ano', content_data: 'Conteúdo sobre números...' },
            { title: 'Português - Verbos', description: 'Conjugação verbal', subject_name: 'Português', grade: '6º ano', content_data: 'Explicação sobre verbos...' }
          ]
        };
      case 'schools':
        return {
          title: "Importar Escolas",
          description: "Importe múltiplas escolas através de um ficheiro CSV",
          icon: <FileText className="h-6 w-6" />,
          requiredFields: ['name', 'address'],
          optionalFields: ['contact_email', 'contact_phone'],
          templateData: [
            { name: 'Escola Primária Central', address: 'Rua da Escola, 123', contact_email: 'info@escola.pt', contact_phone: '214567890' },
            { name: 'Colégio Moderno', address: 'Av. da Educação, 456', contact_email: 'secretaria@colegio.pt', contact_phone: '219876543' }
          ]
        };
      default:
        return { title: '', description: '', icon: null, requiredFields: [], optionalFields: [], templateData: [] };
    }
  };

  const config = getTemplateConfig();

  const downloadTemplate = () => {
    const headers = [...config.requiredFields, ...config.optionalFields];
    const csvContent = [
      headers.join(','),
      ...config.templateData.map(row => 
        headers.map(field => `"${(row as any)[field] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `template_${type}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Template descarregado com sucesso!");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Por favor selecione um ficheiro CSV");
      return;
    }

    setFile(file);
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
      
      if (parsed.errors.length === 0) {
        toast.success(`${parsed.valid.length} registos válidos encontrados`);
      } else {
        toast.warning(`${parsed.valid.length} registos válidos, ${parsed.errors.length} com erros`);
      }
    } catch (error) {
      toast.error("Erro ao processar o ficheiro CSV");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSV = (text: string): ParsedData => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const valid: any[] = [];
    const errors: ImportError[] = [];
    const preview: any[] = [];

    for (let i = 1; i < lines.length && i <= 6; i++) { // Preview first 5 rows
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      preview.push(row);

      // Validate required fields
      let hasErrors = false;
      config.requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push({
            row: i,
            field: field,
            message: 'Campo obrigatório em falta',
            value: row[field]
          });
          hasErrors = true;
        }
      });

      // Additional validation based on type
      if (type === 'students') {
        if (row.phone_number && !/^\d{9}$/.test(row.phone_number.replace(/\s/g, ''))) {
          errors.push({
            row: i,
            field: 'phone_number',
            message: 'Número de telefone deve ter 9 dígitos',
            value: row.phone_number
          });
          hasErrors = true;
        }
        
        if (row.email && !/\S+@\S+\.\S+/.test(row.email)) {
          errors.push({
            row: i,
            field: 'email',
            message: 'Email inválido',
            value: row.email
          });
          hasErrors = true;
        }
      }

      if (!hasErrors) {
        valid.push(row);
      }
    }

    // Process remaining rows for validation only
    for (let i = 7; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      let hasErrors = false;
      config.requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push({
            row: i,
            field: field,
            message: 'Campo obrigatório em falta',
            value: row[field]
          });
          hasErrors = true;
        }
      });

      if (!hasErrors) {
        valid.push(row);
      }
    }

    return { valid, errors, preview };
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.valid.length === 0) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < parsedData.valid.length; i += batchSize) {
        batches.push(parsedData.valid.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        await onImport(batches[i]);
        setProgress(((i + 1) / batches.length) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast.success(`${parsedData.valid.length} registos importados com sucesso!`);
      onOpenChange(false);
      
      // Reset state
      setFile(null);
      setParsedData(null);
      setProgress(0);
      
    } catch (error) {
      toast.error("Erro durante a importação");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData(null);
    setProgress(0);
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!parsedData} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualizar
            </TabsTrigger>
            <TabsTrigger value="errors" disabled={!parsedData?.errors.length} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Erros ({parsedData?.errors.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Template CSV
                </CardTitle>
                <CardDescription>
                  Descarregue o template para garantir que o formato está correto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="default">Campos Obrigatórios:</Badge>
                  {config.requiredFields.map(field => (
                    <Badge key={field} variant="secondary">{field}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">Campos Opcionais:</Badge>
                  {config.optionalFields.map(field => (
                    <Badge key={field} variant="outline">{field}</Badge>
                  ))}
                </div>
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descarregar Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Upload do Ficheiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  
                  {file ? (
                    <div className="space-y-2">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setFile(null); setParsedData(null); }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-lg">
                        Arraste o ficheiro CSV aqui ou clique para selecionar
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Ficheiro
                      </Button>
                    </div>
                  )}
                </div>

                {isProcessing && (
                  <div className="mt-4">
                    <Progress value={50} className="w-full" />
                    <p className="text-sm text-muted-foreground mt-2">A processar ficheiro...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 space-y-4 overflow-hidden">
            {parsedData && (
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center gap-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {parsedData.valid.length} registos válidos encontrados
                      {parsedData.preview.length < parsedData.valid.length && 
                        ` (a mostrar primeiros ${parsedData.preview.length})`}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(parsedData.preview[0] || {}).map(key => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.preview.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex} className="max-w-32 truncate">
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Pronto para importar {parsedData.valid.length} registos
                  </div>
                  <Button 
                    onClick={handleImport}
                    disabled={isImporting || parsedData.valid.length === 0}
                    className="btn-gradient"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        A Importar... ({progress.toFixed(0)}%)
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Dados
                      </>
                    )}
                  </Button>
                </div>

                {isImporting && (
                  <Progress value={progress} className="w-full" />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="errors" className="flex-1 overflow-auto">
            {parsedData?.errors && parsedData.errors.length > 0 && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parsedData.errors.length} erros encontrados que impedem a importação
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  {parsedData.errors.map((error, index) => (
                    <Card key={index} className="border-destructive/20">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">Linha {error.row}</p>
                            <p className="text-sm text-muted-foreground">
                              Campo: <strong>{error.field}</strong>
                            </p>
                            <p className="text-sm text-destructive">{error.message}</p>
                            {error.value && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Valor: "{error.value}"
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 