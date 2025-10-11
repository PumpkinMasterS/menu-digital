# SaborPortuguês - Guia de Configuração

## 🚀 Configuração do Ambiente

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Configuração do Supabase

#### Base de Dados
A migração principal já foi aplicada no projeto:
- ✅ Tabelas criadas (profiles, restaurants, meals, orders, etc.)
- ✅ RLS (Row Level Security) configurado
- ✅ Triggers para timestamps automáticos
- ✅ Categorias portuguesas pré-inseridas

#### Storage Buckets
Buckets de storage configurados:
- ✅ `restaurants` - Imagens de restaurantes (5MB max)
- ✅ `meals` - Imagens de pratos (5MB max)  
- ✅ `avatars` - Avatares de utilizadores (2MB max)

#### Edge Functions
Funções implementadas e funcionais:
- ✅ `process-order` - Processar pedidos completos
- ✅ `generate-daily-deliveries` - Gerar entregas de subscrições
- ✅ `stripe-webhook` - Webhooks do Stripe

### 3. Configuração do Stripe

#### Produtos e Preços
Configure os seguintes produtos no Stripe Dashboard:

1. **Detox Semanal** - `price_detox_weekly`
2. **Detox Mensal** - `price_detox_monthly`  
3. **Fitness Semanal** - `price_fitness_weekly`
4. **Fitness Mensal** - `price_fitness_monthly`

#### Webhooks
Configure webhook endpoint em `https://seudominio.com/api/stripe-webhook` para os eventos:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 4. Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📱 Estrutura da Aplicação

### Rotas Públicas
- `/` - Lista de restaurantes
- `/auth` - Login/Registo
- `/restaurant/:id` - Menu do restaurante
- `/checkout` - Finalizar pedido
- `/order/:orderId` - Tracking de pedidos
- `/subscriptions` - Planos de subscrição
- `/subscriptions/success` - Sucesso da subscrição

### Rotas Protegidas
- `/customer` - Dashboard do cliente
- `/restaurant-admin` - Dashboard do restaurante
- `/driver` - Dashboard do motorista
- `/admin` - Painel administrativo

## 🔐 Roles e Permissões

### customer (Padrão)
- Fazer pedidos
- Ver histórico de pedidos
- Gerir subscrições
- Atualizar perfil

### restaurant_admin
- Gerir menu e preços
- Ver pedidos em tempo real
- Upload de imagens
- Criar planos de subscrição

### driver
- Ver entregas atribuídas
- Atualizar status de entrega
- Gerir localização

### super_admin
- Acesso total ao sistema
- Gerir utilizadores
- Análises e relatórios

## 🧪 Dados de Teste

### Restaurantes Criados
1. **Tasca do Zé** - Cozinha tradicional portuguesa
2. **Sabores do Mar** - Especialidade em peixe e mariscos
3. **Cantinho da Avó** - Receitas caseiras
4. **Quinta dos Sabores** - Ingredientes bio e cozinha saudável
5. **Tradição Lusitana** - Gastronomia portuguesa

### Categorias de Pratos
- Pratos Tradicionais
- Carnes
- Peixes e Mariscos
- Sopas
- Petiscos
- Sobremesas

### Planos de Subscrição
- Detox Semanal Bio (€49.99)
- Detox Mensal Bio (€179.99)
- Fitness Semanal (€59.99)
- Fitness Mensal (€199.99)

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Configure as variáveis de ambiente
2. Build command: `npm run build`
3. Output directory: `dist`

### Backend (Supabase)
- Edge Functions: Deploy via Supabase CLI
- Database: Migrações já aplicadas
- Storage: Buckets configurados

## 📞 Suporte

Para questões técnicas:
- Email: dev@saborportugues.pt
- GitHub Issues: [link-do-repositorio]

---

**Status do Projeto:** ✅ Funcional e pronto para produção 