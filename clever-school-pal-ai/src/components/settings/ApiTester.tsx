
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestTube, Play, Copy } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export function ApiTester() {
  const [apiKey, setApiKey] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [studentResult, setStudentResult] = useState<any>(null);
  const [contentResult, setContentResult] = useState<any>(null);
  const [isTestingStudent, setIsTestingStudent] = useState(false);
  const [isTestingContent, setIsTestingContent] = useState(false);

  const testStudentApi = async () => {
    if (!apiKey.trim() || !whatsappNumber.trim()) {
      toast.error("API key e número WhatsApp são obrigatórios");
      return;
    }

    setIsTestingStudent(true);
    try {
      const functionsBase = import.meta.env.DEV ? '' : import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${functionsBase}/functions/v1/api-students?whatsapp=${encodeURIComponent(whatsappNumber)}`,
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      setStudentResult({ status: response.status, data });
      
      if (response.ok) {
        toast.success("Teste realizado com sucesso!");
      } else {
        toast.error("Erro no teste: " + data.error);
      }
    } catch (error: any) {
      console.error("Error testing student API:", error);
      setStudentResult({ status: 'error', data: { error: error.message } });
      toast.error("Erro ao testar API: " + error.message);
    } finally {
      setIsTestingStudent(false);
    }
  };

  const testContentApi = async () => {
    if (!apiKey.trim()) {
      toast.error("API key é obrigatória");
      return;
    }

    setIsTestingContent(true);
    try {
      const functionsBase = import.meta.env.DEV ? '' : import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${functionsBase}/functions/v1/api-contents?status=published`,
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      setContentResult({ status: response.status, data });
      
      if (response.ok) {
        toast.success("Teste realizado com sucesso!");
      } else {
        toast.error("Erro no teste: " + data.error);
      }
    } catch (error: any) {
      console.error("Error testing content API:", error);
      setContentResult({ status: 'error', data: { error: error.message } });
      toast.error("Erro ao testar API: " + error.message);
    } finally {
      setIsTestingContent(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para área de transferência!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste de APIs
          </CardTitle>
          <CardDescription>
            Teste os endpoints da API com suas chaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="apiKey">Chave API</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="ek_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Teste API de Estudantes */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Buscar Aluno por WhatsApp</h3>
            <div>
              <Label htmlFor="whatsapp">Número WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="5511999999999"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
            <Button 
              onClick={testStudentApi}
              disabled={isTestingStudent || !apiKey.trim() || !whatsappNumber.trim()}
            >
              <Play className="mr-2 h-4 w-4" />
              {isTestingStudent ? "Testando..." : "Testar API Estudantes"}
            </Button>
            
            {studentResult && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={studentResult.status === 200 ? "default" : "destructive"}>
                    Status: {studentResult.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(JSON.stringify(studentResult.data, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={JSON.stringify(studentResult.data, null, 2)}
                  readOnly
                  className="font-mono text-sm h-32"
                />
              </div>
            )}
          </div>

          {/* Teste API de Conteúdos */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Buscar Conteúdos</h3>
            <Button 
              onClick={testContentApi}
              disabled={isTestingContent || !apiKey.trim()}
            >
              <Play className="mr-2 h-4 w-4" />
              {isTestingContent ? "Testando..." : "Testar API Conteúdos"}
            </Button>
            
            {contentResult && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={contentResult.status === 200 ? "default" : "destructive"}>
                    Status: {contentResult.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(JSON.stringify(contentResult.data, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={JSON.stringify(contentResult.data, null, 2)}
                  readOnly
                  className="font-mono text-sm h-32"
                />
              </div>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">URLs dos Endpoints:</h4>
            <div className="space-y-1 text-sm font-mono">
              <div>Students: GET /functions/v1/api-students?whatsapp=NUMERO</div>
              <div>Contents: GET /functions/v1/api-contents?status=published</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
