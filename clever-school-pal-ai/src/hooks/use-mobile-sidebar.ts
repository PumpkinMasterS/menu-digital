import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Hook personalizado para gerenciar o comportamento do sidebar em dispositivos móveis
 * Automaticamente colapsa o sidebar em telas pequenas e ajusta o comportamento
 */
export function useMobileSidebar() {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isActuallyMobile = useIsMobile();

  useEffect(() => {
    // Em dispositivos móveis, sempre começar com sidebar fechado
    if (isActuallyMobile || isMobile) {
      setOpen(false);
      setOpenMobile(false);
    }
  }, [isActuallyMobile, isMobile, setOpen, setOpenMobile]);

  // Função para fechar sidebar quando clicar em um item (útil em mobile)
  const closeSidebarOnNavigate = () => {
    if (isActuallyMobile || isMobile) {
      setOpenMobile(false);
    }
  };

  return {
    isMobile: isActuallyMobile || isMobile,
    closeSidebarOnNavigate,
  };
}