# 🚀 Setup Completo do Menu Digital

## 📋 Pré-requisitos

- Node.js 18+
- MongoDB 6+ ou MongoDB Atlas

## 🔧 Configuração Passo a Passo

### 1. Escolher Base de Dados

#### Opção A: MongoDB Local (Mais simples para desenvolvimento)

```bash
# Instalar MongoDB (se não tiver)
# Windows: https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: apt-get install mongodb

# Iniciar MongoDB
mongod

# Em outro terminal, verificar se está rodando
mongosh
```

#### Opção B: MongoDB Atlas (Cloud - Recomendado para produção)

1. Acesse https://www.mongodb.com/cloud/atlas
2. Crie uma conta gratuita
3. Crie um cluster (Free Tier M0)
4. Em "Database Access", crie um usuário com senha
5. Em "Network Access", adicione `0.0.0.0/0` (ou seu IP)
6. Clique em "Connect" → "Connect your application"
7. Copie a string de conexão

### 2. Configurar Backend

```bash
cd backend
npm install
```

Já existe um arquivo `.env` pré-configurado! Edite se necessário:

```bash
# Para MongoDB LOCAL (já configurado):
MONGODB_URI=mongodb://localhost:27017/menu_digital

# Para MongoDB ATLAS (substitua):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/menu_digital
```

**Credenciais de login já configuradas:**
- Email: `admin@menu.com`
- Password: `admin123`

### 3. Inicializar Dados

```bash
cd backend
npm run seed
```

Isso cria:
- ✅ 4 categorias (Hambúrgueres, Bebidas, Acompanhamentos, Sobremesas)
- ✅ 8 produtos exemplo
- ✅ Grupos de modificadores (extras)
- ✅ Grupos de variantes (tamanhos)

### 4. Iniciar Backend

```bash
cd backend
npm run dev
```

Aguarde ver: `API listening on http://localhost:3000`

### 5. Testar Backend

**Em outro terminal:**

```bash
cd backend

# Teste simples - cria 1 pedido
npm run test:order

# Teste completo - simula fluxo inteiro
npm run test:flow
```

Você deve ver ✅ em todos os passos!

### 6. Instalar e Iniciar Frontends

**Terminal 2 - Admin:**
```bash
cd apps/admin
npm install
npm run dev
```
Abre em: http://localhost:5177

**Terminal 3 - Kitchen:**
```bash
cd apps/kitchen
npm install
npm run dev
```
Abre em: http://localhost:5176

**Terminal 4 - Menu:**
```bash
cd apps/menu
npm install
npm run dev
```
Abre em: http://localhost:5175

## 🧪 Testar o Sistema Completo

### 1. Acesse o Admin (http://localhost:5177/login)
- Email: `admin@menu.com`
- Password: `admin123`

### 2. Gere QR Code de uma mesa
1. Vá em "Mesas"
2. Crie uma mesa (ex: código "T01")
3. Clique no botão de QR code
4. Salve a imagem ou copie o link

### 3. Acesse como Cliente
Abra: http://localhost:5175?table=T01

1. Navegue pelas categorias
2. Clique em um produto
3. Adicione ao carrinho
4. Finalize o pedido

### 4. Veja no Kitchen Dashboard (http://localhost:5176)
- O pedido aparece automaticamente na coluna "Pendentes"
- Clique em "Aceitar" → vai para "Em Preparo"
- Clique em "Pronto" → vai para "Prontos"
- Clique em "Entregar" → pedido completado

### 5. Verifique no Admin (http://localhost:5177/orders)
- Veja todos os pedidos
- Mude status manualmente se necessário

## 💳 Sobre MB Way

**MB Way NÃO está implementado ainda.** É uma funcionalidade futura que requer:

1. **Conta num PSP (Payment Service Provider):**
   - SIBS MB Way API
   - Easypay
   - Stripe (não tem MB Way direto)
   - Multibanco

2. **Documentos necessários:**
   - NIF da empresa
   - Certificado de empresa
   - Conta bancária portuguesa
   - Contrato com o PSP

3. **API Keys:**
   - Só consegue após aprovação do PSP
   - Processo pode demorar 1-2 semanas

**Por enquanto, use:**
- Pagamento em dinheiro (cash)
- Pagamento no local
- Os pedidos funcionam normalmente sem pagamento online

## 🔍 Troubleshooting

### Backend não conecta ao MongoDB

```bash
# Verificar se MongoDB está rodando
mongosh

# Se não estiver, iniciar:
mongod
```

### Porta já em uso

```bash
# Ver o que está na porta 3000
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000

# Matar o processo ou mudar a porta no .env
```

### Seed não funciona

```bash
# Limpar banco e tentar novamente
mongosh
> use menu_digital
> db.dropDatabase()
> exit

cd backend
npm run seed
```

### Login não funciona

Use as credenciais do `.env`:
- Email: `admin@menu.com`  
- Password: `admin123`

Estas funcionam **sem precisar de banco de dados** (modo DEV).

### Produtos não aparecem

```bash
# Executar seed novamente
cd backend
npm run seed

# Testar API diretamente
curl http://localhost:3000/v1/public/products
```

## 📊 Estrutura de Portas

| Aplicação | Porta | URL |
|-----------|-------|-----|
| Backend   | 3000  | http://localhost:3000 |
| Menu      | 5175  | http://localhost:5175 |
| Kitchen   | 5176  | http://localhost:5176 |
| Admin     | 5177  | http://localhost:5177 |

## 🎯 Próximos Passos

1. ✅ **Testado**: Sistema base funcionando
2. 🎨 **Personalizar**: Altere cores, logos, produtos
3. 📸 **Imagens**: Faça upload de fotos reais dos produtos
4. 🧪 **Testar**: Faça vários pedidos de teste
5. 🚀 **Deploy**: Configure para produção (futuro)

## 💡 Dicas

- **Kitchen Dashboard**: Deixe aberto num tablet na cozinha
- **QR Codes**: Imprima e plastifique para cada mesa
- **Admin**: Use para gerir stock e preços
- **Menu**: Compartilhe o link ?table=XX com clientes

## 📞 Suporte

Se algo não funcionar:

1. Verifique se todos os terminais estão rodando
2. Execute os scripts de teste
3. Veja os logs de erro nos terminais
4. Limpe e reinstale: `rm -rf node_modules && npm install`

**Tudo funcionando?** 🎉 Você está pronto para usar o sistema!

