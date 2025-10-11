/**
 * 🔇 MODO PROFISSIONAL - Inicialização silenciosa do tema
 * Sem logs, sem eventos, apenas funcionalidade essencial
 */

let themeInitialized = false;

export function initializeDarkMode() {
  // Prevenir múltiplas execuções
  if (themeInitialized) return;
  themeInitialized = true;

  try {
    // Aplicar tema dark por padrão se não houver preferência
    const savedTheme = localStorage.getItem('connect-ai-theme');
    if (!savedTheme) {
      localStorage.setItem('connect-ai-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.body.setAttribute('data-theme', 'dark');
    }
  } catch {
    // Fail silently - sem logs em produção
    document.documentElement.classList.add('dark');
  }
}

// Auto-initialize quando módulo é carregado
initializeDarkMode(); 