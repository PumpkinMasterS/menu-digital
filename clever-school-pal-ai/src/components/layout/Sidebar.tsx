import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { useApp } from "@/contexts/AppContext";
import { useBranding } from "@/hooks/useBranding";
import { useMobileSidebar } from "@/hooks/use-mobile-sidebar";
import { startTransition } from "react";
import {
  Book,
  Bot,
  Building,
  Calendar,
  Camera,
  FileText,
  Info,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Tag,
  Brain,
  Shield,
  School,
  BarChart3,
  GraduationCap,
} from "lucide-react";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useUnifiedAuth();
  const navigate = useNavigate();
  const { isMobile, closeSidebarOnNavigate } = useMobileSidebar();
  
  // Verificação defensiva para o contexto
  const appContext = useApp();
  const { isAdminMode, isSchoolMode, currentSchool } = appContext || {
    isAdminMode: true,
    isSchoolMode: false,
    currentSchool: null
  };
  
  const { branding } = useBranding();

  // Se não há usuário, não renderizar
  if (!user) {
    return null;
  }

  const getNavClass = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 group ${
      isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-md'
    }`;
  };

  // URLs baseadas no contexto
  const getUrl = (path: string) => {
    if (isAdminMode) {
      return `/admin${path === '/' ? '' : path}`;
    } else if (isSchoolMode && currentSchool) {
      return `/escola/${currentSchool.slug}${path === '/' ? '' : path}`;
    }
    return path;
  };

  // Navegação com transição para evitar suspensão síncrona
  const handleNav = (e: React.MouseEvent, path: string) => {
    // Permite abrir em nova aba/janela com teclas modificadoras
    if ((e as any).metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (e.defaultPrevented) return;
    e.preventDefault();
    
    // Fechar sidebar em mobile após navegação
    closeSidebarOnNavigate();
    
    const target = getUrl(path);
    startTransition(() => {
      navigate(target);
    });
  };

  // Itens de navegação baseados no contexto
  const getNavItems = () => {
    if (isAdminMode) {
      return {
        management: [
          { to: "/schools", icon: Building, label: "Escolas" },
          { to: "/users", icon: Shield, label: "Usuários" },
          { to: "/teachers", icon: GraduationCap, label: "Professores" },
          { to: "/classes", icon: Calendar, label: "Turmas" },
          { to: "/students", icon: Users, label: "Alunos" },
          { to: "/subjects", icon: Book, label: "Disciplinas" },
        ],
        content: [
          { to: "/contents", icon: FileText, label: "Conteúdos" },
          { to: "/tags", icon: Tag, label: "Tags" },
        ],
        system: [
          { to: "/analytics", icon: BarChart3, label: "Analytics" },
          { to: "/bot", icon: Bot, label: "Bot IA" },
          { to: "/discord", icon: MessageSquare, label: "Discord" },
          { to: "/ocr", icon: Camera, label: "OCR Vision" },
          ...(user?.role === 'super_admin' ? [
            { to: "/security", icon: Shield, label: "Monitoramento" }
          ] : []),
          { to: "/settings", icon: Settings, label: "Configurações" },
          { to: "/help", icon: Info, label: "Ajuda" },
        ]
      };
    } else if (user?.role === 'professor') {
      // Menu específico para professores
      return {
        teaching: [
          { to: "/professor/dashboard", icon: LayoutDashboard, label: "Meu Dashboard" },
          { to: "/professor/classes", icon: Calendar, label: "Minhas Turmas" },
          { to: "/professor/students", icon: Users, label: "Meus Alunos" },
          { to: "/professor/subjects", icon: Book, label: "Minhas Disciplinas" },
        ],
        content: [
          { to: "/contents", icon: FileText, label: "Conteúdos" },
          { to: "/professor/assignments", icon: Tag, label: "Atribuições" },
        ],
        system: [
          { to: "/bot", icon: Bot, label: "Bot IA" },
          { to: "/ocr", icon: Camera, label: "OCR Vision" },
          { to: "/settings", icon: Settings, label: "Configurações" },
          { to: "/help", icon: Info, label: "Ajuda" },
        ]
      };
    } else {
      // Modo escola - diferenciação entre diretor e coordenador
      const isDirector = user?.role === 'diretor';
      
      return {
        management: [
          { to: "/teachers", icon: GraduationCap, label: "Professores" },
          { to: "/classes", icon: Calendar, label: "Turmas" },
          { to: "/students", icon: Users, label: "Alunos" },
          { to: "/subjects", icon: Book, label: "Disciplinas" },
        ],
        content: [
          { to: "/contents", icon: FileText, label: "Conteúdos" },
          { to: "/tags", icon: Tag, label: "Tags" },
        ],
        system: [
          // Analytics apenas para diretor
          ...(isDirector ? [
            { to: "/analytics", icon: BarChart3, label: "Analytics" }
          ] : []),
          { to: "/bot", icon: Bot, label: "Bot IA" },
          { to: "/context", icon: Brain, label: "Contextos IA" },
          { to: "/ocr", icon: Camera, label: "OCR Vision" },
          { to: "/settings", icon: Settings, label: "Configurações" },
          { to: "/help", icon: Info, label: "Ajuda" },
        ]
      };
    }
  };

  const navItems = getNavItems();

  return (
    <Sidebar 
      variant="inset"
      collapsible={isMobile ? "offcanvas" : "icon"}
      side="left"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent className="pt-4">
        <div className="flex items-center justify-center mb-8">
          {!collapsed && (
            <>
              {isAdminMode ? (
                <h2 className="text-xl font-heading font-semibold text-sidebar-primary">
                  Admin EduBot
                </h2>
              ) : (
                <div className="text-center">
                  {branding?.logo_url ? (
                    <div className="mb-2">
                      <img 
                        src={branding.logo_url} 
                        alt={`Logo ${currentSchool?.name}`}
                        className="h-12 mx-auto object-contain"
                      />
                    </div>
                  ) : (
                    <h2 className="text-lg font-heading font-semibold text-sidebar-primary">
                      {currentSchool?.name || 'Escola'}
                    </h2>
                  )}
                  <p className="text-xs text-sidebar-foreground">
                    {user?.role === 'diretor' ? 'Diretor' : user?.role === 'coordenador' ? 'Coordenador' : 'Professor'}
                  </p>
                </div>
              )}
            </>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
              {isAdminMode ? <Building className="w-4 h-4" /> : <School className="w-4 h-4" />}
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to={getUrl('/')} end className={({isActive}) => getNavClass({isActive})} onClick={(e) => handleNav(e, '/') }>
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Renderização dinâmica baseada no tipo de usuário */}
        {user?.role === 'professor' ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Ensino</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.teaching?.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink to={getUrl(item.to)} className={({isActive}) => getNavClass({isActive})} onClick={(e) => handleNav(e, item.to)}>
                          <item.icon className="mr-2 h-5 w-5" />
                          {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.management?.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink to={getUrl(item.to)} className={({isActive}) => getNavClass({isActive})} onClick={(e) => handleNav(e, item.to)}>
                        <item.icon className="mr-2 h-5 w-5" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Conteúdo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.content?.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink to={getUrl(item.to)} className={({isActive}) => getNavClass({isActive})} onClick={(e) => handleNav(e, item.to)}>
                      <item.icon className="mr-2 h-5 w-5" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.system?.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink to={getUrl(item.to)} className={({isActive}) => getNavClass({isActive})} onClick={(e) => handleNav(e, item.to)}>
                      <item.icon className="mr-2 h-5 w-5" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
