# Estado Atual do Sistema e Guia da Cozinha

Este documento consolida o estado atual dos servidores, portas, autenticação e passos operacionais para a aplicação de Cozinha (Kitchen), além de observações para evitar conflitos.

## Visão Geral
- Aplicações ativas:
  - Backend (Fastify + TypeScript): API central
  - Admin Dashboard (`apps/admin`)
  - Menu (cliente) (`apps/menu`)
  - Kitchen (receção de pedidos) (`apps/kitchen`)
  - Alternativa de Kitchen (demo) no `frontend` em `/kitchen` (quando `frontend` está em dev)
- Todas as aplicações frontend usam proxy Vite para encaminhar `/v1` ➜ `http://localhost:3000`.

## Portas — Estado Atual
- Backend API: `http://localhost:3000`
- Admin: `http://localhost:5177`
- Menu: `http://localhost:5176` (realocado por conflito)
- Kitchen: `http://localhost:5178` (realocado por conflito)

Portas canónicas (recomendado):
- Menu: `5175`
- Kitchen: `5176`
- Admin: `5177`

Observação: Quando uma porta canónica está ocupada, o Vite realoca automaticamente para a próxima disponível (ex.: Kitchen ➜ 5178).

## Kitchen — Login e Autenticação
- Endpoint de login: `POST /v1/auth/login`
- Credenciais (base de dados):
  - Email: `admin@menu.com`
  - Senha: `admin123`
- Token: JWT retornado em `data.token`, armazenado em `localStorage` sob a chave `authToken`.
- Rota protegida: `apps/kitchen/src/ProtectedRoute.tsx` verifica `authToken`; sem token, redireciona para `/login`.

## O que foi feito para corrigir o login
1. Confirmado proxy e backend OK (`GET /health`).
2. Como o DEV fallback estava desativado pelo `.env` do Atlas, criámos o utilizador na BD:
   - Criado utilizador `admin@menu.com` com senha `admin123` via `POST /v1/admin/users` (autorizado com token admin).
3. Validado:
   - `POST /v1/auth/login` com `admin@menu.com/admin123` devolve JWT.
   - `GET /v1/admin/orders` com `Authorization: Bearer <token>` devolve lista de pedidos.

### Comandos úteis (PowerShell)
```powershell
# Verificar backend
Invoke-RestMethod http://localhost:3000/health

# Testar login (seed default Atlas)
Invoke-RestMethod -Uri http://localhost:3000/v1/auth/login -Method Post -ContentType 'application/json' -Body '{"email":"whiswher@gmail.com","password":"admin1234"}'

# Criar utilizador admin@menu.com/admin123 na BD
$token = (Invoke-RestMethod -Uri http://localhost:3000/v1/auth/login -Method Post -ContentType 'application/json' -Body '{"email":"whiswher@gmail.com","password":"admin1234"}').token
Invoke-RestMethod -Uri http://localhost:3000/v1/admin/users -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body '{"email":"admin@menu.com","password":"admin123","roles":["admin","staff"]}'

# Validar login final
Invoke-RestMethod -Uri http://localhost:3000/v1/auth/login -Method Post -ContentType 'application/json' -Body '{"email":"admin@menu.com","password":"admin123"}'

# Listar pedidos com token do admin@menu.com
$token = (Invoke-RestMethod -Uri http://localhost:3000/v1/auth/login -Method Post -ContentType 'application/json' -Body '{"email":"admin@menu.com","password":"admin123"}').token
Invoke-RestMethod -Uri http://localhost:3000/v1/admin/orders -Method Get -Headers @{ Authorization = "Bearer $token" }
```

## Proxy e Configuração Vite
- `apps/kitchen/vite.config.ts`:
```ts
server: {
  port: 5176,
  proxy: {
    '/v1': { target: 'http://localhost:3000', changeOrigin: true }
  }
}
```
- `apps/admin/vite.config.ts` e `apps/menu/vite.config.ts` também encaminham `/v1` para `localhost:3000`.

## Como alinhar portas para o modo canónico
1. Parar processos em conflito (Admin, Kitchen, Menu):
```powershell
netstat -ano | findstr :5175
netstat -ano | findstr :5176
netstat -ano | findstr :5177
# Matar PID se necessário
# taskkill /PID <PID> /F
```
2. Iniciar na ordem recomendada (ou usar `start-servers.bat`):
```powershell
# Backend (primeiro)
cd backend; npm run dev
# Admin
cd ../apps/admin; npm run dev
# Kitchen
cd ../kitchen; npm run dev
# Menu
cd ../menu; npm run dev
```
3. Se ainda houver conflito, ajustar `server.port` nos `vite.config.ts` correspondentes (Menu ➜ 5175, Kitchen ➜ 5176, Admin ➜ 5177).

## Alternativas de Kitchen
- `frontend` tem uma página Kitchen demo em `http://localhost:5173/kitchen` (quando `frontend` estiver em dev). Usa o mesmo backend e endpoints.
- `apps/kitchen` é a aplicação simplificada de receção/consulta com login.

## Troubleshooting rápido
- Porta em uso: ver `netstat` e matar PIDs com `taskkill`.
- Login falha:
  - Backend deve estar em `:3000` e proxy ativo.
  - Confirmar utilizador na BD (comandos acima).
- Produtos/pedidos não aparecem: `npm run seed` no backend; confirmar `/v1/admin/orders` com token.

---
Este documento reflete o estado atual e serve como referência operacional para evitar conflitos e garantir o acesso à Cozinha.