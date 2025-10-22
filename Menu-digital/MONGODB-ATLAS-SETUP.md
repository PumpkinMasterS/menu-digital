# ✅ MongoDB Atlas - CONFIGURADO!

## 🎉 Seu banco de dados está pronto!

O MongoDB Atlas já está **configurado e populado** com todos os dados necessários.

### 📊 O que foi criado:

✅ **4 Categorias:**
- Hambúrgueres
- Bebidas
- Acompanhamentos
- Sobremesas

✅ **8 Produtos:**
- Classic Burger (€7.50)
- Cheese Burger (€8.50)
- Bacon Burger (€9.50)
- Coca-Cola (€2.50)
- Sumo de Laranja (€3.00)
- Batatas Fritas (€3.50)
- Anéis de Cebola (€4.00)
- Gelado de Chocolate (€3.50)

✅ **Modificadores:**
- Grupo "Extras" com: Bacon (+€1.50), Queijo extra (+€1.00), Ovo (+€1.00), Cogumelos (+€1.50)

✅ **Variantes:**
- Tamanhos de Bebida: Pequeno (€0), Médio (+€0.50), Grande (+€1.00)

✅ **5 Mesas:**
- T01, T02, T03, T04, T05

✅ **Settings:**
- Configurações globais do sistema

---

## 🔧 Configuração do .env

Seu MongoDB Atlas está conectado via MCP. A connection string JÁ ESTÁ CONFIGURADA no sistema.

**Para o backend funcionar**, você precisa da connection string do seu MongoDB Atlas.

### Como obter a connection string:

1. Acesse https://cloud.mongodb.com
2. Clique no seu cluster
3. Clique em "Connect"
4. Escolha "Connect your application"
5. Copie a connection string

Ela será algo como:
```
mongodb+srv://username:password@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority
```

### Atualize o backend/.env:

```env
# MongoDB Atlas (SUBSTITUA com sua connection string)
MONGODB_URI=mongodb+srv://SEU_USERNAME:SUA_PASSWORD@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority

# Resto das configs (já está correto)
PORT=3000
JWT_SECRET=menu_digital_secret_key_2024_change_in_production
BASE_URL=http://localhost:5175
```

**IMPORTANTE:** Substitua `SEU_USERNAME` e `SUA_PASSWORD` pelos seus dados reais do MongoDB Atlas!

---

## 🚀 Próximos Passos

### 1. Atualize o .env
```bash
# Edite o arquivo
code backend/.env

# Ou use o nano/vim
nano backend/.env
```

Cole sua connection string do MongoDB Atlas.

### 2. Inicie o Backend
```bash
cd backend
npm install
npm run dev
```

**NÃO PRECISA** executar `npm run seed` - os dados já foram inseridos via MCP!

### 3. Teste
```bash
cd backend
npm run test:order
```

### 4. Inicie os Frontends
```bash
# Terminal 2
cd apps/admin && npm install && npm run dev

# Terminal 3
cd apps/kitchen && npm install && npm run dev

# Terminal 4
cd apps/menu && npm install && npm run dev
```

---

## ✅ Verificar Dados

Para ver os dados que foram criados, você pode:

1. **MongoDB Atlas UI:**
   - Acesse https://cloud.mongodb.com
   - Vá em "Browse Collections"
   - Veja todas as coleções e documentos

2. **Via Backend API:**
   ```bash
   # Depois de iniciar o backend
   curl http://localhost:3000/v1/public/categories
   curl http://localhost:3000/v1/public/products
   ```

---

## 🔍 Resumo das Coleções

| Coleção | Documentos | Descrição |
|---------|------------|-----------|
| categories | 4 | Categorias de produtos |
| products | 9 | Produtos (1 antigo + 8 novos) |
| modifiers | 1 | Grupos de extras |
| variants | 1 | Grupos de variantes |
| tables | 6 | Mesas (1 antiga + 5 novas) |
| settings | 1 | Configurações globais |
| counters | 1 | Contadores para IDs |
| orders | 0 | Será populado com pedidos |

---

## 🎯 Está Tudo Pronto!

Seu MongoDB Atlas está **100% configurado** com todos os dados necessários.

Só falta:
1. Copiar a connection string para o .env
2. Iniciar o backend
3. Testar!

**Dúvida na connection string?** Veja o vídeo tutorial: https://www.youtube.com/watch?v=rPqRyYJmx2g


