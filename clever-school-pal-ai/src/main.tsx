import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initPageVisibilityRecovery } from './lib/cache-utils'
import { getSecurityHeaders } from './lib/security-headers'
import { initClientDebug } from './lib/client-debug'
import DebugOverlay from './components/debug/DebugOverlay'

// Aplicar headers de segurança
const isDev = import.meta.env.DEV;
const securityHeaders = getSecurityHeaders({
  environment: isDev ? 'development' : 'production',
  domain: window.location.hostname,
  allowedDomains: [window.location.hostname, 'localhost']
});

// Aplicar/atualizar CSP via meta tag (necessário em dev para permitir Vite HMR)
const cspContent = securityHeaders['Content-Security-Policy'];
let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement | null;
if (!cspMeta) {
  cspMeta = document.createElement('meta');
  cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
  document.head.appendChild(cspMeta);
}
if (cspMeta) {
  cspMeta.setAttribute('content', cspContent);
}

// Inicializar sistema de recuperação global
initPageVisibilityRecovery();

// Handlers globais para suprimir erros de extensões no ambiente de desenvolvimento
if (isDev) {
  const shouldIgnore = (msg?: string, url?: string) => {
    const m = msg || '';
    const u = url || '';
    return (
      m.includes('Connect AI application error') ||
      m.includes('overrideMethod') ||
      u.includes('hook.js') ||
      u.startsWith('chrome-extension://') ||
      /\bVM\d+\b/.test(u)
    );
  };

  window.addEventListener('error', (event) => {
    const file = (event.filename || '');
    const msg = (event.message || '');
    if (shouldIgnore(msg, file)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason: any = event.reason || {};
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    const stack = reason?.stack || '';
    if (shouldIgnore(msg, stack)) {
      event.preventDefault();
      // Não propagamos além para evitar logs no console
    }
  });
}

// Inicializar instrumentação de debug do cliente (toggle por ?debug=1, localStorage, ou Ctrl+Alt+D)
initClientDebug();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    {/* Overlay global para logs/erros em runtime quando habilitado */}
    <DebugOverlay />
  </>
)
