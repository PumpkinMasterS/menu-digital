// import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings } from "lucide-react";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-system";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps = {}) {
  const { user, logout } = useUnifiedAuth();
  const { isAdminMode, isSchoolMode, currentSchool } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você saiu do sistema com sucesso",
      });
      startTransition(() => {
        navigate("/login");
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Não foi possível realizar o logout",
      });
    }
  };

  // Pegar as iniciais do usuário
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      const parts = user.email.split('@');
      if (parts[0]) {
        if (parts[0].length >= 2) {
          return parts[0].substring(0, 2).toUpperCase();
        }
        return parts[0].substring(0, 1).toUpperCase();
      }
    }
    return "AD";
  };

  // Título e subtítulo contextuais
  const getContextualTitles = () => {
    if (title || subtitle) {
      return { title, subtitle };
    }

    if (isAdminMode) {
      return {
        title: "Painel Administrativo",
        subtitle: "Gerencie todas as escolas e usuários da plataforma"
      };
    } else if (isSchoolMode) {
      return {
        title: currentSchool?.name || "Escola",
        subtitle: user?.role === 'diretor' ? 'Painel do Diretor' : 'Painel do Coordenador'
      };
    }

    return { title: "Dashboard", subtitle: "Visão geral do sistema" };
  };

  const { title: contextTitle, subtitle: contextSubtitle } = getContextualTitles();

  // Role display
  const getRoleDisplay = () => {
    if (user?.role === 'super_admin') return 'Super Admin';
    if (user?.role === 'diretor') return 'Diretor';
    if (user?.role === 'coordenador') return 'Coordenador';
    if (user?.role === 'professor') return 'Professor';
    return 'Usuário';
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background">
      {/* Esquerda: botão de menu no mobile + títulos */}
      <div className="flex items-center gap-2 px-4">
        {/* Botão para abrir a Sidebar no mobile */}
        <div className="md:hidden -ml-2">
          <SidebarTrigger aria-label="Abrir menu" />
        </div>
        <div className="flex flex-col">
          {contextTitle && (
            <h1 className="text-lg font-semibold text-foreground">
              {contextTitle}
            </h1>
          )}
          {contextSubtitle && (
            <p className="text-sm text-muted-foreground">
              {contextSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side with user actions */}
      <div className="ml-auto flex items-center gap-3 px-4">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src="" alt={user?.name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                <Badge variant="outline" className="text-xs w-fit">
                  {getRoleDisplay()}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const settingsUrl = isAdminMode ? '/admin/settings' : `/escola/${currentSchool?.slug}/settings`;
              startTransition(() => navigate(settingsUrl));
            }}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
