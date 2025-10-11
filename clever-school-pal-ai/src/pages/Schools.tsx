import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SchoolForm from "@/components/forms/SchoolForm";
import Header from "@/components/layout/Header";
import { Building, MoreHorizontal, Plus, Search, MapPin, Phone, Mail, User, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface School {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  slug: string;
  created_at: string;
  updated_at: string;
  director?: {
    name: string;
    email: string;
  };
  coordinator?: {
    name: string;
    email: string;
  };
}

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Por enquanto, usar mock data para diretor e coordenador
      const processedSchools = (data || []).map(school => ({
        ...school,
        slug: generateSlug(school.name),
        director: {
          name: "João Silva",
          email: `diretor@${generateSlug(school.name)}.edu.pt`
        },
        coordinator: {
          name: "Maria Santos",
          email: `coordenador@${generateSlug(school.name)}.edu.pt`
        }
      }));
      
      setSchools(processedSchools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast.error("Não foi possível carregar as escolas. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Gerar slug a partir do nome
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplos
      .trim();
  };

  const handleCreateSchool = async (data: any) => {
    try {
      console.log("🏫 Criando escola (novo fluxo 2025):", data.name);

      // Criar escola (apenas dados básicos)
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .insert({
          name: data.name,
          address: data.address,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
        })
        .select()
        .single();
      
      if (schoolError) throw schoolError;

      console.log("✅ Escola criada:", schoolData);
      
      toast.success(
        `🎉 Escola "${data.name}" criada com sucesso!\n` +
        `📋 Próximo passo: Vá para "Gestão de Utilizadores" para adicionar diretor, coordenador e professores.`
      );
      
      setShowCreateDialog(false);
      fetchSchools();
      
    } catch (error: any) {
      console.error("❌ Erro ao criar escola:", error);
      toast.error(`Erro ao criar escola: ${error.message}`);
    }
  };

  const handleUpdateSchool = async (data: any) => {
    if (!selectedSchool) return;
    
    try {
      // Atualizar dados da escola
      const { error: schoolError } = await supabase
        .from("schools")
        .update({
          name: data.name,
          address: data.address,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
        })
        .eq("id", selectedSchool.id);
      
      if (schoolError) throw schoolError;

      // TODO: Implementar atualização real dos utilizadores da escola
      console.log("Utilizadores para atualizar:", {
        diretor: { name: data.directorName, email: data.directorEmail },
        coordenador: { name: data.coordinatorName, email: data.coordinatorEmail }
      });
      
      toast.success("✅ Escola atualizada com sucesso!");
      setShowEditDialog(false);
      setSelectedSchool(null);
      fetchSchools();
    } catch (error) {
      console.error("Error updating school:", error);
      toast.error("Erro ao atualizar escola. Tente novamente.");
    }
  };

  const handleDeleteSchool = async (_id: string) => {
    // TODO: Implementar modal de confirmação adequado
    // if (!confirm("Tem certeza que deseja excluir esta escola? Esta ação não pode ser desfeita.")) {
    //   return;
    // }
  };

  const handleEditSchool = (school: School) => {
    setSelectedSchool(school);
    setShowEditDialog(true);
  };

  const handleViewUsers = (school: School) => {
    // Navegar para página de utilizadores filtrada por escola
    toast.info(`🔍 Ver utilizadores de ${school.name}`);
    // TODO: Implementar navegação ou modal
  };



  return (
    <>
      <Header 
        title="Gestão de Escolas"
        subtitle="Gerencie todas as escolas registradas no sistema"
      />
      
      <main className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-heading font-bold text-foreground">Escolas</h1>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="btn-gradient">
              <Plus className="mr-2 h-4 w-4" /> Nova Escola
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar escolas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-5 loading-shimmer rounded w-2/3"></div>
                    <div className="h-4 loading-shimmer rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 loading-shimmer rounded w-full mb-2"></div>
                    <div className="h-4 loading-shimmer rounded w-3/4 mb-2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSchools.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma escola encontrada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery ? (
                    "Tente refinar sua busca ou limpar o filtro."
                  ) : (
                    "Comece adicionando sua primeira escola ao sistema."
                  )}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Escola
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((school) => (
                <Card key={school.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{school.name}</CardTitle>
                      <DropdownMenu>
                                                 <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="sm">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleEditSchool(school)}>
                             ✏️ Editar
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => {
                             setSelectedSchool(school);
                             toast.info(`👥 Criar utilizador em ${school.name} - Funcionalidade em desenvolvimento`);
                           }}>
                             👥 Criar Utilizador
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleViewUsers(school)}>
                             👀 Ver Utilizadores
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             onClick={() => handleDeleteSchool(school.id)}
                             className="text-destructive"
                           >
                             🗑️ Excluir
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </div>
                     <CardDescription className="flex items-center gap-1">
                       <MapPin className="h-3 w-3" />
                       {school.address}
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-3">
                     <div className="space-y-2 text-sm">
                       <div className="flex items-center gap-2">
                         <Mail className="h-3 w-3 text-muted-foreground" />
                         <span>{school.contact_email}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Phone className="h-3 w-3 text-muted-foreground" />
                         <span>{school.contact_phone}</span>
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                       {school.director && (
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-xs">
                             <Shield className="h-3 w-3 mr-1" />
                             Diretor: {school.director.name}
                           </Badge>
                         </div>
                       )}
                       {school.coordinator && (
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary" className="text-xs">
                             <User className="h-3 w-3 mr-1" />
                             Coordenador: {school.coordinator.name}
                           </Badge>
                         </div>
                       )}
                     </div>

                     <div className="pt-2 border-t">
                       <p className="text-xs text-muted-foreground">
                         Criada em {new Date(school.created_at).toLocaleDateString('pt-PT')}
                       </p>
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}

           {/* Dialog para criar escola */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Escola</DialogTitle>
            <DialogDescription>
              Crie uma nova escola e configure os usuários administrativos
            </DialogDescription>
          </DialogHeader>
          <SchoolForm
            onSubmit={handleCreateSchool}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar escola */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>
              Atualize as informações da escola e usuários
            </DialogDescription>
          </DialogHeader>
          {selectedSchool && (
            <SchoolForm
              defaultValues={{
                name: selectedSchool.name,
                address: selectedSchool.address,
                contactEmail: selectedSchool.contact_email,
                contactPhone: selectedSchool.contact_phone,
                directorName: selectedSchool.director?.name || "",
                directorEmail: selectedSchool.director?.email || "",
                directorPassword: "", // Senha será gerada automaticamente
                coordinatorName: selectedSchool.coordinator?.name || "",
                coordinatorEmail: selectedSchool.coordinator?.email || "",
                coordinatorPassword: "", // Senha será gerada automaticamente
              }}
              onSubmit={handleUpdateSchool}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedSchool(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
        </div>
      </main>
    </>
  );
}
