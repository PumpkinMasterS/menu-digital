
import { useState, startTransition } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LoaderCircle, ArrowLeft, Pencil, Phone, Mail, Building2 } from "lucide-react";
import SchoolForm from "@/components/forms/SchoolForm";

export default function SchoolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const updateSchool = useMutation({
    mutationFn: async (updatedSchool: any) => {
      const { error } = await supabase
        .from("schools")
        .update({
          name: updatedSchool.name,
          address: updatedSchool.address,
          contact_email: updatedSchool.contact_email,
          contact_phone: updatedSchool.contact_phone,
        })
        .eq("id", id);

      if (error) throw error;
      return updatedSchool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", id] });
      setIsEditDialogOpen(false);
      toast.success("Escola atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating school:", error);
      toast.error("Erro ao atualizar escola. Tente novamente.");
    }
  });

  const deleteSchool = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("schools")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escola eliminada com sucesso");
      startTransition(() => {
        navigate("/schools");
      });
    },
    onError: (error) => {
      console.error("Error deleting school:", error);
      toast.error("Erro ao eliminar escola. Tente novamente.");
    }
  });

  const handleUpdate = async (formData: any) => {
    if (!school) return;
    
    await updateSchool.mutateAsync({
      ...school,
      name: formData.name,
      address: formData.address,
      contact_email: formData.contactEmail,
      contact_phone: formData.contactPhone,
    });
  };

  const handleDelete = async () => {
    await deleteSchool.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-xl font-medium">Escola não encontrada</p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => startTransition(() => navigate("/schools"))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para escolas
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => startTransition(() => navigate("/schools"))}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Detalhes da Escola</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{school.name}</CardTitle>
              <CardDescription>Informações detalhadas da escola</CardDescription>
            </div>
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Endereço</h3>
                <div className="flex items-center mt-1">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p>{school.address}</p>
                </div>
              </div>
            
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">E-mail de Contacto</h3>
                <div className="flex items-center mt-1">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p>{school.contact_email}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Telefone de Contacto</h3>
                <div className="flex items-center mt-1">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p>{school.contact_phone}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Datas</h3>
                <div className="text-sm mt-1">
                  <p className="text-muted-foreground">
                    Criada em: {new Date(school.created_at).toLocaleDateString('pt-PT')}
                  </p>
                  <p className="text-muted-foreground">
                    Atualizada em: {new Date(school.updated_at).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between">
          <Button variant="outline" onClick={() => startTransition(() => navigate("/schools"))}>
            Voltar para a lista
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            Eliminar Escola
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>
              Edite os detalhes da escola. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <SchoolForm
            defaultValues={{
              name: school.name,
              address: school.address,
              contactEmail: school.contact_email,
              contactPhone: school.contact_phone,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={updateSchool.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja eliminar esta escola? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteSchool.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteSchool.isPending}
            >
              {deleteSchool.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
