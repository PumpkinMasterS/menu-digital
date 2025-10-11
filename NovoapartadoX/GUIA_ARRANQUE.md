# Guia de Arranque e Operações

Este guia documenta como iniciar o backend e frontend, configurar variáveis de ambiente, testar endpoints principais e resolver problemas comuns.

## Pré‑requisitos
- Node.js e npm instalados
- Acesso à internet (para instalar dependências)
- PowerShell (Windows) para definir variáveis temporárias

## Backend (porta 4000/4001)
1) Instalar dependências:
   - cd backend
   - npm install
2) Iniciar em desenvolvimento (cors para o frontend):
   - No PowerShell: $env:FRONTEND_URL='http://localhost:5180'; npm run dev
3) Confirmar no terminal:
   - “API a ouvir na porta 4000”
   - Conexão ao MongoDB OK
   - Swagger disponível em http://localhost:4000/api-docs

### Variáveis de Ambiente Backend
- ADMIN_EMAIL, ADMIN_PASSWORD (dev por defeito: admin@site.test / admin123)
- FRONTEND_URL (ex.: http://localhost:5176) para CORS
- Outras variáveis estão em backend/.env.example

### Seed de Admin
- O server cria automaticamente o admin se não existir (ver server.mjs: seedAdminIfMissing). Em dev, usa ADMIN_EMAIL/ADMIN_PASSWORD.

## Frontend (Vite Dev Server)
1) Instalar dependências:
   - cd frontend
   - npm install
2) Iniciar dev server:
   - npm run dev -- --strictPort --port 5176
3) Aceder: http://localhost:5176/lisboa

### Proxy e Base URL
- O Vite proxy encaminha /api para `VITE_API_BASE_URL` (por defeito usamos http://localhost:4001 em dev estruturado)
- Chamadas do frontend usam caminhos relativos (ex.: axios.get('/api/listings'))

## Endpoints Principais
- GET /api/listings?city=Lisboa
- POST /api/auth/login { email, password }
- GET /api/auth/me (com Authorization: Bearer <token>)

## Fluxo de Login (Frontend)
- POST /api/auth/login
- Guarda accessToken e refreshToken em localStorage (AuthContext)
- Rotas protegidas usam token (RequireAuth/RequireAdmin)

## Testes Rápidos
- Swagger: http://localhost:4000/api-docs
- Listagens: http://localhost:4000/api/listings?city=Lisboa
- Login (dev): email: admin@site.test, password: admin123

## Troubleshooting
- net::ERR_CONNECTION_REFUSED:
  - Verificar se backend está ativo na porta 4000
  - Confirmar FRONTEND_URL definido antes de npm run dev no backend
  - Testar diretamente http://localhost:4000/api-docs
- CORS bloqueado:
  - Garantir FRONTEND_URL=http://localhost:5180
  - Preferir caminhos relativos “/api/…” no frontend para usar proxy

## Arranque Rápido Unificado
- Subir backend (porta 4001) e frontend (porta 5180):
  - npm run dev:all
- Executar E2E de upload de 20 fotos (subindo servidores automaticamente):
  - npm run e2e:upload20
- Abrir relatório Playwright:
  - npm run report

### Variar portas
- FRONTEND_PORT e API_PORT podem ser definidos antes dos scripts:
  - Ex.: `$env:FRONTEND_PORT='5176'; $env:API_PORT='4000'; npm run dev:all`

## Próximos Passos
- Validar login pelo frontend e redirecionamento para /reservada
- Verificar carregamento de /api/listings na CityPage
- Instrumentar cliques no WhatsApp para métricas (posteriormente)