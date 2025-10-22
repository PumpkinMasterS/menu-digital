# ⚡ INÍCIO RÁPIDO - 5 MINUTOS

## 🎯 Seu sistema está PRONTO! Siga estes passos:

### 1️⃣ Criar arquivo .env (30 segundos)

```bash
# Na raiz do projeto
node setup-env.js
```

Ou crie manualmente `backend/.env` com:
```env
MONGODB_URI=mongodb+srv://SEU_USERNAME:SUA_PASSWORD@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority
PORT=3000
JWT_SECRET=menu_digital_secret_key_2024
BASE_URL=http://localhost:5175
```

### 2️⃣ Iniciar Backend (2 minutos)

```bash
cd backend
npm install          # Só primeira vez
npm run seed         # Cria produtos exemplo
npm run dev          # Inicia API
```

✅ Aguarde ver: `API listening on http://localhost:3000`

### 3️⃣ Testar se Funciona (30 segundos)

**Em OUTRO terminal:**
```bash
cd backend
npm run test:order   # Cria pedido de teste
```

Deve mostrar ✅ em todos os passos!

### 4️⃣ Iniciar Frontends (1 minuto)

**3 novos terminais:**

```bash
# Terminal 2
cd apps/admin
npm install && npm run dev

# Terminal 3
cd apps/kitchen
npm install && npm run dev

# Terminal 4
cd apps/menu
npm install && npm run dev
```

### 5️⃣ Usar o Sistema! (30 segundos)

1. **Admin**: http://localhost:5177/login
   - Email: `admin@menu.com`
   - Password: `admin123`

2. **Menu** (como cliente): http://localhost:5175?table=T01
   - Adicione produtos ao carrinho
   - Finalize pedido

3. **Kitchen**: http://localhost:5176
   - Veja pedidos em tempo real
   - Mude status

---

## ❓ E Se Der Erro?

### MongoDB não conecta
```bash
# Verifique se está rodando
mongosh

# Se não estiver, inicie:
mongod
```

### Porta já em uso
```bash
# Veja o que está rodando na porta 3000
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000
```

### Produtos não aparecem
```bash
cd backend
npm run seed
```

---

## 📱 Suas URLs:

| App | URL | Para quê |
|-----|-----|----------|
| Backend | http://localhost:3000 | API |
| Admin | http://localhost:5177 | Gerir tudo |
| Kitchen | http://localhost:5176 | Cozinha |
| Menu | http://localhost:5175 | Clientes |

---

## 🔧 Sobre as Configurações

### Estamos usando:
- ✅ **MongoDB Local** (localhost)
- ✅ **Backend Fastify** (TypeScript)
- ✅ **Login sem DB** (modo DEV)
- ✅ **Seed com dados exemplo**

### MB Way?
**NÃO está implementado.** Pagamento é em dinheiro/local.

Para implementar no futuro, precisa:
1. Conta num PSP (Easypay, SIBS, EUPAGO)
2. Documentos da empresa
3. API keys do PSP
4. 1-2 semanas de desenvolvimento

📖 Veja mais em: [docs/MBWAY-INFO.md](docs/MBWAY-INFO.md)

---

## 🧪 Scripts de Teste

```bash
cd backend

# Teste simples - cria 1 pedido
npm run test:order

# Teste completo - simula fluxo kitchen→admin→delivered
npm run test:flow
```

---

## 🎉 Pronto!

Seu sistema está funcionando. Agora você pode:
- 📝 Editar produtos no Admin
- 📸 Fazer upload de imagens
- 🏷️ Criar categorias
- 🍔 Adicionar modificadores (extras)
- 📱 Gerar QR codes para mesas
- 🧑‍🍳 Gerir pedidos na cozinha

**Dúvidas?** Veja [SETUP.md](SETUP.md) para guia completo.

