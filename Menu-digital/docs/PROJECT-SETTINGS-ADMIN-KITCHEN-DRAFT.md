# Project Settings (Draft) — Admin e Kitchen

Rascunho de configuração para criar projetos separados no Vercel para `admin` e `kitchen` quando decidires migrar (1→3 projetos).

## Estrutura
- **Root Directory**:
  - Admin: `apps/admin`
  - Kitchen: `apps/kitchen`
- **Framework Preset**: `Other` (Vite)
- **Build Command**: `npm ci && npm run build`
- **Output Directory**: `dist`
- **Node Version**: `20.x`
- **Install Command**: `npm ci`

## Environment Variables
- `VITE_API_URL` — URL público do backend.
- `VITE_SSO_REQUIRED` — `true` (opcional, uso interno).
- `VITE_AUTH_PROVIDER` — `vercel_auth` (ou outro provedor se aplicável).
- Ambientes: definir para `Production` e (se preciso) `Preview`.

## Domínios
- Admin: `admin.seurestaurante.com`.
- Kitchen: `kitchen.seurestaurante.com`.
- Adicionar e verificar DNS após validação das builds.

## Proteção (Acesso)
- Ativar **Vercel Authentication/Protection**:
  - Acesso restrito a membros da equipa (RBAC).
  - Gerar **Protection Bypass Token** para testes automatizados.
- Teste via cURL (exemplo):
  - `curl -I https://admin.seurestaurante.com -H "x-vercel-protection-bypass: <TOKEN>"`

## Headers e Segurança
- Aplicar headers de segurança (semelhantes ao `vercel.json` atual):
  - `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- Opcional: CSP ajustada conforme assets.

## Cache e Performance
- Assets gerados pelo Vite com hash: cache padrão `immutable`.
- HTML sem cache (controlado pelo Vercel por default).

## Observabilidade
- Logs (Access, Function, Static) via Vercel.
- Integrações opcionais: Sentry/Logflare.

## CORS (backend)
- Como `admin` e `kitchen` vão chamar o backend noutro domínio, permitir origens:
  - `https://admin.seurestaurante.com`, `https://kitchen.seurestaurante.com`, e `https://menu.seurestaurante.com`.
- Ajustar CORS no backend (ex.: Fastify/Express) quando avançares para 3 projetos.

## Previews
- Ativar preview deploys para PRs.
- Validar `VITE_API_URL` em preview se necessário (pode apontar para backend de preview ou produção, conforme estratégia).

## Rollback
- Em caso de falha, remover mapeamentos de domínio e repor o projeto único para servir páginas necessárias.

## Passos para criação (quando migrar)
1. Criar projeto `admin` no Vercel apontando para `apps/admin`.
2. Definir env vars (`VITE_API_URL`, `VITE_AUTH_PROVIDER`).
3. Build e validar em URL de preview.
4. Repetir para `kitchen` (`apps/kitchen`).
5. Mapear domínios e ativar proteção.
6. Ajustar CORS no backend se necessário.