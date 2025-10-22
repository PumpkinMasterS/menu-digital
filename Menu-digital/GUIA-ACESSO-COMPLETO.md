# Guia Completo de Acesso - Menu Digital

## Credenciais de Acesso

### Login Padrão (Desenvolvimento)
- **Email**: `admin@menu.com`
- **Password**: `admin123`
- **Roles**: `admin,staff`

Este login funciona em TODAS as interfaces do sistema.

## Interfaces do Sistema

### 1. Backend API
- **URL**: http://localhost:3000
- **Descrição**: API RESTful que serve todas as aplicações frontend
- **Acesso**: Apenas para desenvolvedores (endpoints de API)

### 2. Menu Digital (Frontend Principal)
- **URL**: http://localhost:5173
- **Descrição**: Interface principal para clientes fazerem pedidos
- **Funcionalidades**:
  - Visualização do cardápio
  - Seleção de produtos
  - Personalização de pedidos
  - Geração de QR codes para pagamento
- **Acesso**: Público (sem login necessário)

### 3. Menu App (Alternativo)
- **URL**: http://localhost:5175
- **Descrição**: Versão alternativa do menu digital
- **Funcionalidades**: Mesmas do frontend principal
- **Acesso**: Público (sem login necessário)

### 4. Kitchen Dashboard (Cozinha)
- **URL**: http://localhost:5176
- **Descrição**: Interface para a equipe da cozinha
- **Funcionalidades**:
  - Visualização de pedidos em tempo real
  - Atualização de status dos pedidos
  - Controle de tempo de preparo
  - Notificações de novos pedidos
- **Acesso**: Requer login (email/senha)

### 5. Admin Dashboard (Painel Administrativo)
- **URL**: http://localhost:5177
- **Descrição**: Painel completo para administração do sistema
- **Funcionalidades**:
  - **📋 Pedidos**: Visualização e gestão de todos os pedidos
  - **🍔 Menu Builder**: Construtor avançado de produtos
  - **🎨 Modificadores Pro**: Gestão de modificadores de produtos
  - **🏷️ Categorias**: Organização de categorias do menu
  - **🪑 Mesas**: Gestão de mesas do restaurante
  - **📦 Produtos**: Lista completa de produtos
- **Acesso**: Requer login (email/senha)

## Fluxo de Trabalho

### 1. Para Clientes
1. Acessam o Menu Digital (http://localhost:5173 ou http://localhost:5175)
2. Fazem o pedido diretamente sem necessidade de login
3. Pagam via ifthenpay (Multibanco/MB Way)

### 2. Para a Cozinha
1. Acessam o Kitchen Dashboard (http://localhost:5176)
2. Fazem login com as credenciais padrão
3. Visualizam os pedidos em tempo real
4. Atualizam o status (Recebido → Em preparação → Pronto)

### 3. Para Administradores
1. Acessam o Admin Dashboard (http://localhost:5177)
2. Fazem login com as credenciais padrão
3. Gerenciam todo o sistema:
   - Criam/editam produtos
   - Configuram categorias
   - Gerenciam mesas
   - Visualizam relatórios de pedidos

## Estrutura de Usuários

### Roles (Papéis)
- **admin**: Acesso completo a todas as funcionalidades
- **staff**: Acesso limitado (geralmente apenas à cozinha)

### Usuários Padrão
O sistema vem com um usuário de desenvolvimento:
- Email: admin@menu.com
- Senha: admin123
- Roles: admin,staff

## Configuração Técnica

### Portas
- Backend API: 3000
- Frontend Principal: 5173
- Menu App: 5175
- Kitchen Dashboard: 5176
- Admin Dashboard: 5177

### Banco de Dados
- MongoDB Atlas configurado no backend/.env
- Coleções: users, products, categories, orders, tables, modifiers

### Autenticação
- JWT tokens para sessões
- Token válido por 1 hora
- Armazenado no localStorage do navegador

## Inicialização do Sistema

### Automática (Recomendado)
1. Execute `start-servers.bat` na raiz do projeto
2. Aguarde todos os serviços iniciarem
3. Acesse as URLs correspondentes

### Manual
Abra 5 terminais e execute:
```bash
# Terminal 1 - Backend
cd backend
npm run dev-safe

# Terminal 2 - Frontend Principal
cd frontend
npm run dev-safe

# Terminal 3 - Menu App
cd apps/menu
npm run dev

# Terminal 4 - Kitchen Dashboard
cd apps/kitchen
npm run dev

# Terminal 5 - Admin Dashboard
cd apps/admin
npm run dev
```

## Troubleshooting

### Problemas Comuns
1. **Portas em uso**: Verifique com `netstat -ano | findstr :PORTA`
2. **Login não funciona**: Verifique se o backend está rodando na porta 3000
3. **Página não carrega**: Verifique o console do navegador para erros

### Reset do Sistema
1. Pare todos os servidores (Ctrl+C)
2. Matar processos node: `taskkill /F /IM node.exe`
3. Limpar cache: `npm cache clean --force`
4. Reiniciar os servidores

## Desenvolvimento

### Adicionar Novos Usuários
Acesse o Admin Dashboard → Gerenciamento de Usuários ou use a API:
```bash
POST /v1/admin/users
{
  "email": "novo@usuario.com",
  "password": "senha123",
  "roles": ["admin"]
}
```

### Configurar Produção
1. Alterar JWT_SECRET no .env
2. Configurar MongoDB Atlas para produção
3. Definir URLs de produção no BASE_URL
4. Remover ou alterar credenciais de desenvolvimento








