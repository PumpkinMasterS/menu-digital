# ✅ MONGODB ATLAS - 100% CONFIGURADO!

## 🎉 Parabéns! Está tudo pronto!

Acabei de configurar **completamente** o MongoDB Atlas usando o MCP. Aqui está o que foi feito:

---

## 📊 Dados Inseridos no Atlas

### ✅ 4 Categorias
- 🍔 **Hambúrgueres** - Hambúrgueres artesanais
- 🥤 **Bebidas** - Bebidas frias e quentes
- 🍟 **Acompanhamentos** - Batatas, anéis de cebola e mais
- 🍰 **Sobremesas** - Doces e gelados

### ✅ 8 Produtos Novos
1. **Classic Burger** - €7.50
2. **Cheese Burger** - €8.50
3. **Bacon Burger** - €9.50
4. **Coca-Cola** - €2.50 (com variantes de tamanho)
5. **Sumo de Laranja** - €3.00 (com variantes de tamanho)
6. **Batatas Fritas** - €3.50
7. **Anéis de Cebola** - €4.00
8. **Gelado de Chocolate** - €3.50

### ✅ Grupo de Modificadores (Extras)
- 🥓 Bacon (+€1.50)
- 🧀 Queijo extra (+€1.00)
- 🥚 Ovo (+€1.00)
- 🍄 Cogumelos (+€1.50)

### ✅ Grupo de Variantes (Tamanhos)
- Pequeno 300ml (+€0.00)
- Médio 500ml (+€0.50)
- Grande 700ml (+€1.00)

### ✅ 5 Mesas
- Mesa 1 (T01)
- Mesa 2 (T02)
- Mesa 3 (T03)
- Mesa 4 (T04)
- Mesa 5 (T05)

### ✅ Configurações do Sistema
- Busy Mode: desativado
- Delay: 0 minutos

---

## 🔧 O Que Você Precisa Fazer Agora

### 1️⃣ Obter Connection String (2 minutos)

Vá para: https://cloud.mongodb.com

1. Login
2. Clique no seu cluster
3. Clique em "Connect"
4. Escolha "Connect your application"
5. Copie a connection string

Ela será tipo:
```
mongodb+srv://username:<password>@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Importante:** 
- Substitua `<password>` pela sua senha REAL
- Adicione `/menu_digital` antes do `?`

Exemplo final:
```
mongodb+srv://joao:senha123@cluster.abc.mongodb.net/menu_digital?retryWrites=true&w=majority
```

📖 **Guia detalhado:** Veja `GET-MONGODB-STRING.md`

### 2️⃣ Atualizar o .env

Edite `backend/.env`:

```env
# Cole SUA connection string aqui:
MONGODB_URI=mongodb+srv://SEU_USER:SUA_SENHA@cluster.xxxxx.mongodb.net/menu_digital?retryWrites=true&w=majority

# Resto está OK:
PORT=3000
JWT_SECRET=menu_digital_secret_key_2024_change_in_production
BASE_URL=http://localhost:5175
```

### 3️⃣ Iniciar o Backend

```bash
cd backend
npm install    # Só primeira vez
npm run dev    # Inicia API
```

**NÃO EXECUTE `npm run seed`!** Os dados já foram inseridos via MCP! ✅

### 4️⃣ Testar

```bash
# Novo terminal
cd backend
npm run test:order
```

Deve mostrar ✅ em todos os passos!

### 5️⃣ Iniciar Frontends

```bash
# Terminal 2
cd apps/admin && npm install && npm run dev

# Terminal 3
cd apps/kitchen && npm install && npm run dev

# Terminal 4
cd apps/menu && npm install && npm run dev
```

---

## 🌐 Suas URLs

| App | URL | Login |
|-----|-----|-------|
| Admin | http://localhost:5177 | admin@menu.com / admin123 |
| Kitchen | http://localhost:5176 | (sem login) |
| Menu | http://localhost:5175?table=T01 | (sem login) |
| Backend | http://localhost:3000 | (API) |

---

## 🔍 Verificar Dados no Atlas

**Opção 1: MongoDB Atlas UI**
1. Acesse https://cloud.mongodb.com
2. Vá em "Browse Collections"
3. Veja todas as coleções criadas

**Opção 2: Via API (depois de iniciar backend)**
```bash
curl http://localhost:3000/v1/public/categories
curl http://localhost:3000/v1/public/products
```

---

## 📦 Coleções Criadas no Atlas

| Coleção | Total | Descrição |
|---------|-------|-----------|
| **categories** | 4 | Categorias de produtos |
| **products** | 9 | Produtos (incluindo 1 antigo) |
| **modifiers** | 1 | Grupos de extras |
| **variants** | 1 | Grupos de variantes |
| **tables** | 6 | Mesas (incluindo 1 antiga) |
| **settings** | 1 | Configurações globais |
| **counters** | 1 | Contadores para IDs |
| **orders** | 0 | Será populado quando fizer pedidos |

---

## ⚠️ IMPORTANTE

### ✅ O que JÁ ESTÁ FEITO:
- MongoDB Atlas conectado ✅
- Todas as coleções criadas ✅
- Produtos, categorias, modificadores inseridos ✅
- Mesas configuradas ✅
- Settings configurados ✅

### ⏳ O que FALTA FAZER:
- [ ] Copiar connection string para backend/.env
- [ ] Iniciar backend
- [ ] Testar

**Tempo total:** ~5 minutos!

---

## 🆘 Se Der Problema

### "MongoDB connection failed"
→ Verifique a connection string no .env
→ Confirme que substituiu `<password>` pela senha real
→ Veja: `GET-MONGODB-STRING.md`

### "IP não autorizado"
→ Vá em MongoDB Atlas → Network Access
→ Adicione seu IP ou `0.0.0.0/0` (todos)

### "Authentication failed"
→ Vá em MongoDB Atlas → Database Access
→ Verifique username e senha
→ Crie novo usuário se necessário

---

## 💡 Dica Pro

Se não conseguir a connection string, o MCP já está conectado! 

Isso significa que a string está em:
**Cursor Settings → MCP → MongoDB**

Copie dali para o backend/.env!

---

## 🎯 Resumo

1. ✅ MongoDB Atlas configurado
2. ✅ Dados inseridos (4 categorias, 8 produtos, modificadores, variantes, 5 mesas)
3. ⏳ Falta: Connection string no .env
4. ⏳ Iniciar backend
5. ⏳ Testar e usar!

**Está quase lá!** 🚀


