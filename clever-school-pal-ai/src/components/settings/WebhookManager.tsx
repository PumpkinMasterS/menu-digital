
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
import { Webhook, Eye, Plus, Trash2, TestTube } from "lucide-react";
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

export function WebhookManager() {
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookName, setNewWebhookName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ["webhook-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_config")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: webhookLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl.trim() || !newWebhookName.trim()) {
      toast.error("Nome e URL são obrigatórios");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from("webhook_config")
        .insert({
          name: newWebhookName.trim(),
          url: newWebhookUrl.trim(),
          events: ["content.created", "content.updated"],
          active: true
        });

      if (error) throw error;

      toast.success("Webhook criado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
      setNewWebhookName("");
      setNewWebhookUrl("");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating webhook:", error);
      toast.error("Erro ao criar webhook: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from("webhook_config")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Webhook deletado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
    } catch (error: any) {
      console.error("Error deleting webhook:", error);
      toast.error("Erro ao deletar webhook: " + error.message);
    }
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
    <div className="space-y-6">
      {/* Configuração de Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Configuração de Webhooks
              </CardTitle>
              <CardDescription>
                Gerencie URLs de destino para notificações automáticas
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Webhook</DialogTitle>
                  <DialogDescription>
                    Configure um endpoint para receber notificações
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhookName">Nome</Label>
                    <Input
                      id="webhookName"
                      placeholder="Ex: Sistema de Vetorização"
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">URL</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://exemplo.com/webhook"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
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
                      onClick={handleCreateWebhook}
                      disabled={isCreating || !newWebhookName.trim() || !newWebhookUrl.trim()}
                    >
                      {isCreating ? "Criando..." : "Criar Webhook"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingWebhooks ? (
            <div>Carregando...</div>
          ) : webhooks?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum webhook configurado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks?.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.active ? "default" : "secondary"}>
                        {webhook.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(webhook.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Logs de Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Logs de Webhook
          </CardTitle>
          <CardDescription>
            Últimas 20 notificações enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div>Carregando...</div>
          ) : webhookLogs?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum log de webhook ainda. Crie ou edite conteúdo para gerar eventos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {log.event_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          log.status === 'pending' ? 'secondary' : 
                          log.status === 'success' ? 'default' : 'destructive'
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
