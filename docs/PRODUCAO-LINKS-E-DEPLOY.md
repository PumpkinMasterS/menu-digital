# Produção – Links e Deploy (Monorepo)

Objetivo: um único repositório e um único push que mantém Vercel (frontend) e Railway (backend) sincronizados.

## Nova estrutura
- Raiz do repo: apps/, frontend/, backend/
- Backend: `backend/` (Node/Express + assets públicos)
- Vercel: subdiretório `Menu-digital/` (contém `public/menu|admin|kitchen` e `vercel.json`)
- Configuração Railway: `railway.toml` na raiz com `root = "backend"`

## Checklist de migração
1) Clonar repo canónico para `C:\Repos\Menu-digital`
2) Criar/confirmar `backend/` como diretório de build no Railway (via `railway.toml`)
3) Validar `Menu-digital/vercel.json` (inclui redirect `/ → /menu` e rewrites para o backend)
4) Copiar assets reais para `Menu-digital/public/{menu,admin,kitchen}` quando necessário
5) Push para GitHub e ativar Auto Deploy na Railway para `main` (ou via PR)
6) Testar endpoints: `/health`, `/v1/*`, `/public/*` através do domínio Vercel

## Pontos de atenção
- Builds são independentes: Vercel serve frontend; Railway serve API e estático do backend
- Tamanho do repo: avaliar externalizar assets pesados (S3, CDN) se necessário
- Paths sensíveis: revisar imports/scripts ao mover código

## Fluxo operacional simplificado
- Trabalhar sempre no clone limpo em `C:\Repos\Menu-digital`
- `git add/commit/push` em `main` ou via PR
- Vercel usa `Menu-digital/` e Railway usa `backend/` automaticamente

## Rollback seguro
- Reverter PR/commit no GitHub
- Railway faz redeploy da última versão estável
- Validar páginas `menu`, `admin`, `kitchen` e endpoints `/v1` após rollback
