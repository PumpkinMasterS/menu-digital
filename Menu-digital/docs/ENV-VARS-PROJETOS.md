# Variáveis de Ambiente por Projeto

Referência rápida para configurar env vars em cada projeto quando começares com 1 e migrares para 3.

## Backend (projeto atual)
- `MONGODB_URI` — conexão Atlas (ex.: `mongodb+srv://user:pass@cluster/db?authSource=admin`).
- `JWT_SECRET` — segredo para assinar/validar JWT.
- `IFTHENPAY_ANTI_PHISHING_KEY` — chave anti-phishing para o callback.
- Opcional: `LOG_LEVEL` (`info`/`debug`).

## Menu (público)
- `VITE_API_URL` — URL público do backend (ex.: `https://backend.seurestaurante.com`).
- Opcional: `VITE_APP_NAME` — nome da app.

## Admin (protegido)
- `VITE_API_URL` — URL público do backend.
- `VITE_AUTH_PROVIDER` — `vercel_auth` ou outro.
- Opcional: `VITE_SSO_REQUIRED` — `true`.

## Kitchen (protegido)
- `VITE_API_URL` — URL público do backend.
- Opcional: `VITE_SSO_REQUIRED` — `true`.

## Dicas de gestão
- Usa nomes consistentes em todos os ambientes (`production`, `preview`, `development`).
- Duplicar `VITE_API_URL` nos três frontends ao migrar para 3 projetos.
- Mantém secrets apenas no backend; frontends usam apenas variáveis públicas necessárias.
- Para testes de produção em rotas protegidas, gerar **Protection Bypass Token** no Vercel (apenas admin/kitchen).