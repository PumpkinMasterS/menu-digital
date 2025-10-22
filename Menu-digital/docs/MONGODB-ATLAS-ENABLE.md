# MongoDB Atlas – Ativar e Operar

Este guia documenta como executar o backend com MongoDB Atlas (sem modo DEV) e como semear dados e autenticar no Admin.

## 1) Configurar .env do backend

Crie/edite `backend/.env` e defina:

- `MONGODB_URI=<a tua string do Atlas>`
- `PORT=3000`
- `JWT_SECRET=<um segredo forte>`
- `ADMIN_TOKEN=<token opcional para Admin>`
- `ADMIN_SEED_EMAIL=admin@example.com`
- `ADMIN_SEED_PASSWORD=admin1234`


Notas:
- Se usares Atlas, garante que o teu IP local está autorizado no Atlas (Network Access → IP Whitelist).
- O `JWT_SECRET` deve ser único e robusto em produção.

## 2) Parar servidores antigos e iniciar backend com Atlas

Na pasta `backend`:

- Parar qualquer processo antigo de dev: usa o teu terminal para encerrar `npm run dev-safe` se estiver ativo.
- Iniciar em modo desenvolvimento com ligação Atlas:
  - `npm run dev` (usa ts-node-dev com respawn)
  - ou `npm run start` após `npm run build`.

Validação inicial:
- Ver `API listening at http://localhost:3000` e mensagens de ligação ao MongoDB. Se falhar, corrige `MONGODB_URI` e whitelist de IP.

## 3) Semear dados iniciais (admin + catálogo)

Na pasta `backend`:

- `npm run seed`
  - Cria o utilizador admin (`ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`).
  - Cria categorias, modificadores, variantes e produtos se a BD estiver vazia.

Podes executar novamente; se já houver dados, o seed evita duplicações.

## 4) Autenticação no Admin

Tens duas opções suportadas:

- JWT (recomendado)
  1. Faz login: `POST /v1/auth/login` com `{ email, password }` do admin criado pelo seed.
  2. Guarda o token no browser do Admin: `localStorage.setItem('authToken', '<JWT>')`.
  3. O Admin usa automaticamente `Authorization: Bearer <JWT>`.

- Token legacy (simples)
  1. Define `ADMIN_TOKEN` no `backend/.env`.
  2. No browser do Admin: `localStorage.setItem('ADMIN_TOKEN', '<mesmo token>')`.
  3. O Admin envia `x-admin-token` em todas as chamadas.

## 5) Verificações e testes

- Menu (dev server): `http://localhost:5175/`
  - `GET /v1/public/categories` deve listar categorias da BD.
  - `GET /v1/public/products` deve listar produtos da BD.

- Admin (dev server): `http://localhost:5177/`
  - CRUD de categorias/produtos deve refletir na BD.

## 6) Troubleshooting

- Erro de ligação ao Mongo:
  - Verifica `MONGODB_URI` e whitelist de IP no Atlas.
  
- Admin 401/403:
  - Para JWT: valida credenciais e `JWT_SECRET`.
  - Para token legacy: confirma que `ADMIN_TOKEN` do browser coincide com o do backend.

- Public endpoints vazios:
  - Executa `npm run seed` se a base estiver vazia.
  - Verifica no Atlas se as coleções têm dados (`categories`, `products`).

## 7) Operação (resumo)

1. Preenche `backend/.env` com o `MONGODB_URI`.
2. Inicia backend: `npm run dev`.
3. Executa `npm run seed` (uma vez, se necessário).
4. Faz login no Admin (JWT ou token legacy).
5. Testa `GET /v1/public/products` no Menu.

Com isto, deixas de depender do modo DEV e passas a ter persistência real na BD Atlas.