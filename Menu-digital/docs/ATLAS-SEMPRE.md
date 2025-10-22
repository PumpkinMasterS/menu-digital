# Operar Sempre com MongoDB Atlas (Sem Modo DEV)

Este guia garante que o backend usa SEMPRE a base de dados MongoDB Atlas e nunca entra em modo DEV.

## Como o backend decide o modo
- `MONGODB_URI` ausente → entra em Modo DEV.
- `MONGODB_URI` presente → usa MongoDB Atlas normalmente.

Conclusão: para operar sempre com Atlas, mantenha `MONGODB_URI` preenchido.

## .env recomendado (Atlas-only)
Copie e ajuste conforme sua conta Atlas:

```
# Obrigatório: sua connection string Atlas
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority

# API
PORT=3000
JWT_SECRET=menu_digital_secret_key_2024_change_in_production
BASE_URL=http://localhost:5175


# Opcional: seed/admin
ADMIN_SEED_EMAIL=admin@seu-dominio.com
ADMIN_SEED_PASSWORD=senhaSegura123
# Opcional: token legacy (se preferir em vez de JWT)
# ADMIN_TOKEN=seu_token_unico
```

## Checklist de arranque
1. Verifique o `.env` do backend:
   - `MONGODB_URI` está preenchido com Atlas.
   - `MONGODB_URI` está definido e acessível no Atlas (IP autorizado).
2. Inicie o backend: `cd backend && npm run dev`.
3. Inicie os frontends conforme necessidade (`apps/admin`, `apps/menu`, `apps/kitchen`).

## Verificações rápidas
- Saúde da API: `Invoke-WebRequest http://localhost:3000/health` (PowerShell)
- Sem DEV mode no log:
  - Procure por aviso "DEV login enabled; skipping MongoDB".
  - Se não aparecer, a API tentou conectar ao MongoDB.
- Dados públicos:
  - `GET http://localhost:3000/v1/public/categories` deve listar categorias da BD.
  - `GET http://localhost:3000/v1/public/products` deve listar produtos da BD.

## Comandos úteis (Windows)
- Confirmar `MONGODB_URI` no `.env`:
- `Select-String -Path C:\Projetos\Menu-digital\backend\.env -Pattern '^MONGODB_URI'``
  - Nenhuma linha deve aparecer.
- Testar login admin por JWT:
  - `POST http://localhost:3000/v1/auth/login` com `{ email: ADMIN_SEED_EMAIL, password: ADMIN_SEED_PASSWORD }`.

## Seed (catálogo/admin)
- Se a base estiver vazia, use `cd backend && npm run seed`.
- O seed cria utilizador admin (se não existir) e dados iniciais de catálogo (se coleções estiverem vazias).
- Depois do seed, faça login no Admin e ajuste o catálogo conforme necessário.

## Boas práticas
- Não comitar `backend/.env`.
- Mantenha um `.env` de exemplo específico para Atlas (veja `backend/.env.always-atlas.example`).
- No Atlas, verifique whitelist de IP e permissões do usuário da connection string.

## Troubleshooting
- Erro de ligação Mongo:
  - Verifique `MONGODB_URI` e whitelist de IP no Atlas.
  - Garanta que `MONGODB_URI` está correto e que o IP da máquina está autorizado no Atlas.
- Endpoints públicos vazios:
  - Se a BD estiver realmente vazia, execute `npm run seed`.
- Admin 401/403:
  - Para JWT: confirme credenciais e `JWT_SECRET`.
  - Para token legacy: confirme que `ADMIN_TOKEN` do browser coincide com o do backend.

## Referências
- `backend/src/lib/db.ts` e `backend/src/index.ts`: ligam ao MongoDB via plugin e utilizam `MONGODB_URI`.
- `docs/MONGODB-ATLAS-ENABLE.md`: guia geral de ativação Atlas.
- `MONGODB-ATLAS-SETUP.md` e `MONGODB-PRONTO.md`: passos para obter e aplicar a connection string.