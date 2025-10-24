# Migração de 1 projeto único para 3 projetos (admin, kitchen, menu)

Este guia descreve como começar com **1 projeto** no Vercel e migrar com segurança para **3 projetos separados** (admin, kitchen, menu) quando quiseres, mantendo o backend único e preparado para multi-tenancy.

## Fase 1 — Projeto único (agora)
- **Escopo recomendado**: publicar `menu` + backend (callback IfThenPay já ativo) no mesmo projeto.
- **Domínio**: `menu.seurestaurante.com` (público). Admin/Kitchen podem seguir locais por enquanto.
- **Env vars do backend**:
  - `MONGODB_URI` (com `authSource=admin`), `JWT_SECRET`, `IFTHENPAY_ANTI_PHISHING_KEY`.
- **Env vars do menu**:
  - `VITE_API_URL` apontando para o backend (o endpoint público que serve API/callback ou o domínio do backend se separado).
- **Rewrites**: manter o já existente para callback:
  - `/v1/public/payments/ifthenpay/callback` → `/api/ifthenpay-callback`.
- **Observabilidade**: testes do callback com `_vercel_share` (bypass) e/ou token de proteção.

### Passos práticos (projeto único)
1. Conectar o repositório ao Vercel (raiz). 
2. Configurar env vars do backend e do `menu` (ver templates). 
3. Mapear domínio `menu.seurestaurante.com` para o projeto.
4. Validar callback de produção com dados reais (`RequestId`, `Estado=000`).

## Fase 2 — Migrar para 3 projetos (quando quiseres)
- **Novos projetos**:
  - `menu` (público): conectar ao diretório `apps/menu`.
  - `admin` (interno): conectar ao diretório `apps/admin`.
  - `kitchen` (interno): conectar ao diretório `apps/kitchen`.
- **Backend**: continua único; permanece no projeto atual (ou migrável para um projeto próprio `backend` futuramente).

### Checklists por projeto
- `menu`:
  - Build: Vite (output `dist`).
  - Env: `VITE_API_URL` → domínio do backend.
  - Domínio: `menu.seurestaurante.com`.
  - Proteção: público (sem SSO), apenas rate-limit/CDN padrão.
- `admin`:
  - Build: Vite (output `dist`).
  - Env: `VITE_API_URL` → domínio do backend.
  - Domínio: `admin.seurestaurante.com`.
  - Proteção: SSO/Protection habilitado, bypass token para automação.
- `kitchen`:
  - Build: Vite (output `dist`).
  - Env: `VITE_API_URL` → domínio do backend.
  - Domínio: `kitchen.seurestaurante.com`.
  - Proteção: SSO/Protection habilitado.
- Backend (no projeto atual):
  - Env: `MONGODB_URI`, `JWT_SECRET`, `IFTHENPAY_ANTI_PHISHING_KEY`.
  - Rewrites: callback `/v1/public/payments/ifthenpay/callback`.

### Migração sem downtime
1. Criar os 3 projetos e configurar env/domínios sem alterar o atual.
2. Validar builds e rotas em URLs temporárias do Vercel (preview). 
3. Apontar DNS dos subdomínios (`menu/admin/kitchen`) para cada projeto. 
4. Manter backend atual; garantir que todos os `VITE_API_URL` apontem para o backend.
5. Opcional: mover backend para um projeto próprio mais tarde (mantendo o domínio/alias). 

### Gestão de env vars
- Duplicar `VITE_API_URL` em `admin`, `kitchen`, `menu`.
- Backend mantém secrets sensíveis (`JWT_SECRET`, `MONGODB_URI`, `IFTHENPAY_ANTI_PHISHING_KEY`).
- Para proteção de endpoints de admin/kitchen, usar Vercel Authentication + tokens de bypass.

## Notas de arquitetura (SaaS preparado)
- **Multi-tenancy**: backend filtra por `restaurantId` em `orders`, `payments`, `tables`, `users`.
- **Origem do tenant**: host/subdomínio para `menu`; JWT para `admin/kitchen`.
- **Callbacks multi-tenant**: chave anti-phishing pode ser por restaurante (armazenada em MongoDB) ou única + validações extra.
- **Índices**: por `restaurantId` + campos de consulta (`status`, `createdAt`, `requestId`, `method`).

## Quando voltar a separar
- Criar `Project Settings` específicos por app.
- Copiar/ajustar env vars.
- Configurar domínios/subdomínios.
- Validar logs e proteção.

## Perguntas frequentes
- **Posso começar com 1 e depois separar?** Sim, sem reestruturar muito: basta criar os 3 projetos e reconfigurar env/domínios.
- **A proteção do Vercel atrapalha API pública?** Use share links ou bypass token durante testes; mantenha `menu` sem proteção.
- **O backend precisa mudar?** Apenas preparar para multi-tenant; a lógica atual funciona para um restaurante.