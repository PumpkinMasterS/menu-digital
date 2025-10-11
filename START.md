# ⚡ Iniciar Rapidamente

## Para começar AGORA (10 minutos):

### 1️⃣ Backend (Terminal 1)
```bash
cd backend
npm install
npm run seed    # Cria dados de exemplo
npm run dev     # Inicia API
```

### 2️⃣ Admin (Terminal 2)
```bash
cd apps/admin
npm install
npm run dev     # http://localhost:5177
```

### 3️⃣ Kitchen (Terminal 3)
```bash
cd apps/kitchen
npm install
npm run dev     # http://localhost:5176
```

### 4️⃣ Menu (Terminal 4)
```bash
cd apps/menu
npm install
npm run dev     # http://localhost:5175
```

## ✅ Testar

```bash
cd backend
npm run test:order    # Cria pedido de teste
npm run test:flow     # Testa fluxo completo
```

## 🔑 Login

- **URL**: http://localhost:5177/login
- **Email**: admin@menu.com
- **Password**: admin123

## 🍔 Fazer Pedido

1. Abra: http://localhost:5175?table=T01
2. Escolha produtos
3. Adicione ao carrinho
4. Finalize

## 👨‍🍳 Ver na Cozinha

- Abra: http://localhost:5176
- Veja pedidos em tempo real
- Mude status clicando nos botões

---

**Nota**: O arquivo `.env` já está configurado para MongoDB local!

**MongoDB não instalado?** Veja [SETUP.md](SETUP.md) para usar MongoDB Atlas (cloud, grátis).

**MB Way?** Não implementado. Pagamento será em dinheiro/local por enquanto.

