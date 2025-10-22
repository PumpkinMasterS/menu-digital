Backend (Fastify + TypeScript)

Prerequisitos
- Node.js 18+

Configuração
- Copie `.env.example` para `.env` e ajuste:
  - `MONGODB_URI=mongodb+srv://SEU_USERNAME:SUA_PASSWORD@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority`
  - `PORT=3000`

Scripts
- `npm run dev` inicia em desenvolvimento (ts-node-dev)
- `npm run build` compila para `dist`
- `npm run start` executa o build em produção

Endpoints
- `GET /health` status do servidor
- `GET /v1` placeholder da API v1

MongoDB
- Utilitário em `src/lib/db.ts` para conectar via `MONGODB_URI`
- Use `getCollection<T>('categories')` para acessar coleções

Modelos TS
- Definidos em `src/models.ts` (Category, Product, Modifier/Variant Groups, Order, Payment)

Notas
- Logger habilitado; CORS ativo para desenvolvimento; Rate-limit básico aplicado.