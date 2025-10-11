
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ApiKeyManager() {
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const generateApiKey = () => {
    return 'ek_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const hashApiKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Nome da chave é obrigatório");
      return;
    }

    setIsCreating(true);
    try {
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);

      const { error } = await supabase
        .from("api_keys")
        .insert({
          name: newKeyName.trim(),
          key_hash: keyHash,
          active: true,
          permissions: ["read_students", "read_contents"]
        });

      if (error) throw error;

      // Show the generated key to user (only time they'll see it)
      navigator.clipboard.writeText(apiKey);
      toast.success("Chave API criada e copiada para área de transferência!");
      
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKeyName("");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating API key:", error);
      toast.error("Erro ao criar chave API: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Chave API deletada com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      toast.error("Erro ao deletar chave API: " + error.message);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chaves API</CardTitle>
            <CardDescription>
              Gerencie chaves de API para integração externa com WhatsApp e outros serviços
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Chave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Chave API</DialogTitle>
                <DialogDescription>
                  A chave será mostrada apenas uma vez. Copie e guarde em local seguro.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName">Nome da Chave</Label>
                  <Input
                    id="keyName"
                    placeholder="Ex: Bot WhatsApp Produção"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={isCreating || !newKeyName.trim()}
                  >
                    {isCreating ? "Criando..." : "Criar Chave"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Carregando...</div>
        ) : apiKeys?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma chave API criada ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys?.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {showKeys[key.id] 
                          ? key.key_hash.slice(0, 16) + "..." 
                          : "ek_" + "•".repeat(32)
                        }
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {showKeys[key.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.active ? "default" : "secondary"}>
                      {key.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(key.created_at)}</TableCell>
                  <TableCell>
                    {key.last_used_at ? formatDate(key.last_used_at) : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Endpoints da API:</h4>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <strong>Consultar aluno:</strong> 
              <br />GET /functions/v1/api-students?whatsapp=5511999999999
            </div>
            <div>
              <strong>Buscar conteúdos:</strong> 
              <br />GET /functions/v1/api-contents?subject_id=uuid&class_id=uuid&school_id=uuid
            </div>
            <div className="text-muted-foreground">
              Inclua o header: x-api-key: sua_chave_aqui
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
