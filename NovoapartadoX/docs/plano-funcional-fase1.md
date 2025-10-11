# Plano Funcional – Fase 1 (Lisboa e Porto)

Objetivo: definir escopo funcional, UX/UI, SEO e entregáveis iniciais para lançar a plataforma com foco nas cidades de Lisboa e Porto.

## 1) Escopo inicial
- Cidades ativas: Lisboa e Porto (apenas estas nesta fase).
- Todos os perfis são verificados (não é necessário fluxo de verificação nesta fase).
- Upload de fotos realizado pelo administrador (sem onboarding/auto-upload de anunciantes nesta fase).

## 2) Páginas e Navegação
- Landing de Cidade (Lisboa, Porto):
  - Header com quick links (âncoras) para: Destaques, Recentes, Guias da Cidade, Centro de Segurança e FAQ.
  - Breadcrumbs: Home > Cidade.
- Índice de Cidades: links para Lisboa e Porto (no header/footer).
- Futuro (fora desta fase): subpáginas por concelho/bairro.

## 3) Listagens e Perfis
- Listagens (grid):
  - Cards padronizados (ratio 3:4, lazy-loading, badge “Premium” quando aplicável).
  - “Spotlight” visual para Premium (borda, brilho suave, prioridade no grid).
  - Ordenação: Recentes, Mais populares, Mais próximos, Mais verificados (nota: todos verificados; manter para futuro ou substituir por “Com vídeo”).
- Perfis:
  - Galeria de fotos/vídeos profissionais.
  - Bio, idiomas, áreas atendidas, serviços/tags.
  - Disponibilidade (agenda básica) e CTAs diretas (WhatsApp/telefone).
  - Não incluir nesta fase: tabela “onde atende” (hotel/domicílio/estúdio), raio de deslocação, políticas de deslocação.

## 4) Filtros e Busca
- Filtros multifacetados na página de listagens: serviços/tags, faixa de preço, idioma, com vídeo, com agenda para hoje.
- Não incluir nesta fase: chips de categorias na landing da cidade (ficam para depois).
- “Salvar busca” + alertas (email/push) – planeado; push depende de PWA (ver seção 8).

## 5) Conteúdo editorial e confiança
- Diretrizes de qualidade de conteúdo (página pública):
  - Conteúdo original e profissional; direitos de imagem; proibições; padrões editoriais.
  - Destaque/badge “Conteúdo profissional” quando aplicável.
- Centro de Segurança:
  - Alertas anti-scam e boas práticas.
  - Botões de denúncia em cards e perfis; triagem e SLA interno.
- Guias de Cidade (SEO e utilidade):
  - “Como escolher com segurança em [Cidade]” e “Bairros e deslocações em [Cidade]”.

## 6) Monetização e Painel do Anunciante
- Planos: Gratuito, Destaque, Topo (upsells contextuais na criação/edição pelo admin).
- Painel do anunciante (MVP):
  - Analytics: visualizações, CTR de CTAs, heatmap horário/diário, origem por canal.
  - Renovação de anúncios e boosts on-demand.
  - Upload permanece via admin nesta fase.

## 7) UX/UI e Design System
- Dark mode por omissão com persistência (implementado) e foco visível consistente.
- Iconografia consistente para filtros, favoritos, mapa/lista, ações primárias.
- Acessibilidade: navegação por teclado, aria-pressed/labels, contraste AA.
- Responsividade: breakpoints otimizados para grid/cards e sidebar.

## 8) PWA e Notificações
- PWA instalável (manifest, service worker, offline skeletons para listagens e perfis).
- Push notifications para alertas de buscas salvas.

## 9) SEO técnico e Performance
- URLs amigáveis por cidade (+ futura extensão por categoria):
  - /lisboa, /porto, /lisboa/recentes, /porto/destaques, etc.
- Breadcrumbs e sitemaps por cidade; sitemap index.
- Metadados: Open Graph e Twitter Cards por cidade e por anúncio.
- JSON-LD/Schema.org: listagens (ItemList) e perfis (Person/LocalBusiness conforme aplicável).
- Imagens: CDN, WebP/AVIF, srcset/sizes, preconnect/preload, lazy-loading inteligente.
- Core Web Vitals: LCP/CLS/INP alinhados a boas práticas.

## 10) Compliance e Anti-abuso
- Age gate + consentimento para conteúdo adulto; termos e política de conteúdo.
- Moderação proativa; reputação do anunciante; bloqueios e auditoria.
- Rate limiting e proteção anti-spam em formulários de contacto.

## 11) Fora de escopo (diferido)
- Chips de categorias na landing da cidade (apenas depois).
- Tabela “onde atende”, raio e políticas de deslocação.
- Onboarding/auto-upload por parte do anunciante (admin mantém controle nesta fase).
- Subpáginas por concelho/bairro (depois de Lisboa/Porto estarem estáveis).

## 12) Roadmap (proposta de sprints)
- Sprint 1:
  - Rotas /lisboa e /porto com breadcrumbs; grid/cards padronizados; ordenação “Recentes/Populares”.
  - Sidebar/header com links Lisboa/Porto e quick links de seção na landing.
- Sprint 2:
  - Filtros multifacetados na página de listagens (sem chips na landing).
  - Página de perfil rica (galeria, bio, idiomas, tags, CTAs, disponibilidade básica).
- Sprint 3:
  - Destaques Premium (topo, badge, spotlight) e story-like na home/cidade.
  - Painel de anunciante (MVP) com analytics e boosts/renovações.
- Sprint 4:
  - SEO técnico (sitemaps, JSON-LD, OG/Twitter) e Guias de Cidade.
  - Centro de Segurança + fluxos de denúncia e triagem.
- Sprint 5:
  - PWA (instalação, offline skeletons) + push para buscas salvas.

## 13) Métricas de sucesso
- CTR dos destaques/premium; conversão de CTAs; retenção de buscas salvas.
- Performance (LCP < 2.5s, CLS < 0.1, INP < 200ms em 75º percentil).
- SEO: impressões/clicks por cidade; ranking para termos “acompanhantes [cidade]”.

---
Este plano consolida as decisões atuais (Lisboa e Porto; verificação já garantida; admin gere media) e organiza o que entra já vs. o que fica para fases seguintes. A partir daqui, proponho iniciarmos pela Sprint 1 para materializar rotas, breadcrumbs e o grid/cards com ordenação básica.