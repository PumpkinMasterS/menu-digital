# Frontend (SaaS) – Visão, Arquitetura e Plano de Implementação

Objetivo
- Entregar uma frontpage e um console web profissionais para operar e vender a plataforma em modelo SaaS, com foco em clareza, velocidade e segurança.

Personas e casos de uso
- Trader individual: acompanhar PnL diário, acionar/desligar kill switch, definir limites.
- Gestor de risco/operacional: monitorar múltiplos símbolos, revisar auditoria de eventos, garantir compliance.
- SRE/Operações: saúde do serviço, métricas /metrics, diagnóstico rápido.

Arquitetura de Frontend (duas etapas)
- Opção A (MVP rápido – recomendado como primeiro passo)
  - HTML + JS leve (ou Alpine.js), estilos com Tailwind via CDN, servidos pelo Fastify em GET /.
  - Consome os endpoints já existentes (status, auditoria, limites). Sem build step, entrega em horas.
- Opção B (SPA profissional)
  - Vite + React + TypeScript + Tailwind + Headless UI; roteamento com React Router; estado (Zustand/Redux).
  - Build servido como estático via fastify-static; WebSocket (futuro) para atualizações em tempo real.
  - Entrega em 3–5 dias úteis após MVP.

Mapa de Navegação e Páginas
- Landing (marketing)
  - Hero (valor do produto), Benefícios, Pricing (placeholder), CTA (Registrar/Contato).
- Console (aplicação)
  - Dashboard
    - KPIs: PnL do dia (global e por símbolo), limites atuais, estado dos gates (kill switch, daily drawdown).
    - Cards de status, gráfico PnL do dia (placeholder/mini-sparkline), últimos eventos de auditoria.
  - Risco
    - Controles: toggle Kill Switch; definir limite global (USD ou % + base); tabela com limites por símbolo (inline edit).
  - Auditoria
    - Lista paginada de eventos; filtro por tipo/símbolo; exportar (download JSONL mais recente).
  - Métricas
    - Link para /metrics; instruções rápidas de Prometheus/Grafana.
  - Configurações (roadmap)
    - Chaves de API, autenticação, opções de notificação.

Contratos de API consumidos (existentes)
- GET /risk/status → { ok, risk: { gates, global, bySymbol } }
- GET /risk/audit?limit=N → { ok, events: [...] }
- POST /risk/killswitch { active: boolean } → { ok, active }
- POST /risk/drawdown-limit { usd } | { pct, base } → { ok, mode, limitUsd }
- POST /risk/symbol-limit { symbol, usd } → { ok, symbol, limit_usd, pnl_today_usd, blocked }
- (Opcional) GET /metrics para integração com Prometheus

Componentes de UI (Design System)
- Shell: Header + Sidebar (ou Topbar compacta no MVP), Footer simples.
- Cards KPI, Tabela (símbolos/limites), Forms (inputs numéricos com validação), Botões com estados (loading/disabled), Toasts/Alertas, Modal de confirmação.
- Responsividade: Mobile-first; grid para ≥ md; cards empilhados em sm.
- Acessibilidade: contraste AA, foco visível, teclas de atalho (futuro), ARIA nas tabelas e botões críticos.
- Temas: Dark/Light com prefer-color-scheme; tokens de cor (Tailwind) baseados na brand.

Branding e Estilo
- Look & feel: moderno, sóbrio, com feedbacks claros de risco (verdes para OK, amarelos atenção, vermelhos bloqueio).
- Tipografia: Inter/Roboto; 14–16px base; hierarquia tipográfica nos cards e titulações.
- Espaçamento e ritmo vertical consistentes; ícones outline (Heroicons/Lucide) no SPA.

Segurança, Multi-tenant e SaaS (Roadmap)
- Autenticação: JWT (Access/Refresh), sessão curta, proteções CSRF para POST via browser.
- RBAC: Admin/Viewer; permissões por seção (ex.: apenas Admin altera limites).
- Multi-tenant: prefixo /api/v1/{tenantId} ou subdomínios; isolamento por tenant.
- Persistência: migrar limites (global/símbolo) de memória para DB (PostgreSQL) e auditoria para tabela (além do JSONL).
- Rate limiting e audit logs por usuário/tenant.
- Billing (SaaS): Stripe (Checkout/Portal), webhooks, limites de plano, faturação por tenant.

Telemetria e Observabilidade de UI (futuro)
- Erros de frontend: Sentry.
- Produto/UX: PostHog ou Mixpanel.
- Session replay para suporte: LogRocket (opcional).

Plano de Implementação
- Fase 0 – Backend
  - Habilitar fastify-static (ou rota GET /) para servir a frontpage do MVP.
  - CORS apenas se o frontend for servido em host/porta diferente.
- Fase 1 – MVP Frontpage (HTML + JS + Tailwind CDN)
  - index.html com seções: Header, Dashboard, Risco, Auditoria.
  - app.js: chamadas a /risk/status e /risk/audit?limit=50; ações de POST nos formulários.
  - Indicadores visuais (badges, cores) para estados dos gates.
- Fase 2 – SPA (Vite + React + TS)
  - Scaffold do projeto; roteamento; adoção de componentes reutilizáveis; tema dark/light.
  - Migração progressiva do MVP para componentes React; testes unitários básicos.
- Fase 3 – Auth & Billing
  - Fluxo de login/registro; gerenciamento de sessão; integração Stripe; páginas de conta/assinatura.
- Fase 4 – Multi-tenant & Persistência
  - Introduzir camada de DB; migrar armazenamento de limites e auditoria; políticas por tenant.

Critérios de Aceitação (MVP)
- Dashboard carrega e exibe PnL hoje, limites e estado dos gates.
- Controles de risco funcionam e atualizam o backend sem erros.
- Auditoria lista os últimos eventos e pagina por parâmetro limit.
- UI responsiva, dark mode suportado, nenhuma exceção no console.
- Lighthouse Performance/Best Practices/Accessibility ≥ 90.

Tarefas (backlog resumido)
- Backend
  - Servir frontpage em GET / (fastify-static ou reply.sendFile).
  - (Opcional) Habilitar /metrics na mesma instância principal.
- Frontend MVP
  - index.html, app.js, estilos (Tailwind CDN); componentes básicos (cards, tabela, forms).
  - Integrações: /risk/status, /risk/audit, /risk/killswitch, /risk/drawdown-limit, /risk/symbol-limit.
- SPA (quando aprovado)
  - Setup Vite + React + TS + Tailwind, layout, rotas, estado global, toasts, modais.
- QA e DevEx
  - Scripts npm para build/serve do front; teste e2e mínimo (Playwright ou Cypress).

Notas de Implementação
- MVP não requer build; ideal para validar UX rapidamente.
- SPA garante escalabilidade, componentização e experiência premium para o SaaS.
- Imagens/vetores devem ser SVG; evitar assets binários pesados.