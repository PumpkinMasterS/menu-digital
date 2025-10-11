# 🧪 Teste Sistema Completo - Checklist

## ✅ Status Atual da API

### Backend API - FUNCIONANDO ✅
```
✅ Categorias: http://localhost:3000/v1/public/categories
✅ Produtos: http://localhost:3000/v1/public/products
```

---

## 📋 Checklist de Testes Completo

### 1. Backend API

#### Categorias
- [x] GET /v1/public/categories - **TESTADO ✅**
- [ ] POST /v1/admin/categories
- [ ] PATCH /v1/admin/categories/:id
- [ ] DELETE /v1/admin/categories/:id

#### Produtos
- [x] GET /v1/public/products - **TESTADO ✅**
- [ ] POST /v1/admin/products (corrigido passthrough)
- [ ] PATCH /v1/admin/products/:id
- [ ] DELETE /v1/admin/products/:id

#### Mesas
- [ ] GET /v1/admin/tables
- [ ] POST /v1/admin/tables (corrigido passthrough)
- [ ] GET /v1/admin/tables/:id/qr

#### Modificadores
- [ ] GET /v1/admin/modifiers
- [ ] POST /v1/admin/modifiers
- [ ] PATCH /v1/admin/modifiers/:id

#### Pedidos
- [ ] POST /v1/public/orders
- [ ] GET /v1/admin/orders
- [ ] PATCH /v1/admin/orders/:id

### 2. Admin Dashboard

#### Login
- [ ] Acesso: http://localhost:5177/login
- [ ] Email: whiswher@gmail.com
- [ ] Password: admin1234
- [ ] Redirect para /builder

#### Menu Builder
- [ ] Ver produtos existentes
- [ ] Criar novo produto
- [ ] Upload de imagem
- [ ] Arrastar e soltar (drag & drop)
- [ ] Associar modificadores
- [ ] Criar combo (tab Combo)
- [ ] Filtrar por categoria

#### Modificadores Pro
- [ ] Ver grupos existentes
- [ ] Criar novo grupo
- [ ] Adicionar opções
- [ ] Preview interativo
- [ ] Cálculo de preço em tempo real

#### Categorias
- [ ] Listar categorias
- [ ] Criar categoria
- [ ] Editar categoria

#### Mesas
- [ ] Listar mesas
- [ ] Criar mesa
- [ ] Ver QR code
- [ ] Download QR code

#### Pedidos
- [ ] Ver pedidos em Kanban
- [ ] Filtrar por mesa
- [ ] Filtrar por status
- [ ] Atualizar status

### 3. Menu Digital Cliente

#### Navegação
- [ ] Acesso: http://localhost:5175?table=T01
- [ ] Ver hero banner
- [ ] Ver mesa no topo
- [ ] Badge de carrinho funcional

#### Produtos
- [ ] Listar produtos
- [ ] Filtrar por categoria (tabs)
- [ ] Ver detalhes do produto
- [ ] Hover animation
- [ ] Chip "Esgotado"

#### Carrinho
- [ ] Adicionar produto
- [ ] Ver carrinho
- [ ] Alterar quantidade
- [ ] Remover item
- [ ] Ver total

#### Pedido
- [ ] Finalizar pedido
- [ ] Escolher método de pagamento
- [ ] Ver confirmação
- [ ] Tracking de pedido

### 4. Kitchen Dashboard

#### Visualização
- [ ] Acesso: http://localhost:5176
- [ ] Ver pedidos pendentes
- [ ] Ver pedidos em preparo
- [ ] Ver pedidos prontos

#### Gestão
- [ ] Mover pedido entre colunas
- [ ] Ver detalhes do pedido
- [ ] Ver modificadores
- [ ] Timer visual
- [ ] Som de novo pedido

---

## 🔧 Como Executar os Testes

### Teste 1: API Backend
```powershell
# Categorias
Invoke-WebRequest -Uri "http://localhost:3000/v1/public/categories" -UseBasicParsing

# Produtos
Invoke-WebRequest -Uri "http://localhost:3000/v1/public/products" -UseBasicParsing

# Modificadores
Invoke-WebRequest -Uri "http://localhost:3000/v1/admin/modifiers" -UseBasicParsing -Headers @{Authorization="Bearer SEU_TOKEN"}
```

### Teste 2: Criar Produto (Admin)
```powershell
$body = @{
  name = "Teste Burger"
  description = "Burger de teste"
  price = 8.50
  categoryId = "68deff32e03f0c2d1ed52540"
  isActive = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/v1/admin/products" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer SEU_TOKEN"} `
  -UseBasicParsing
```

### Teste 3: Fluxo Completo Cliente

1. **Abrir Menu**:
   ```
   http://localhost:5175?table=T01
   ```

2. **Selecionar Produto**:
   - Clicar em um produto
   - Ver detalhes
   - Adicionar ao carrinho

3. **Finalizar Pedido**:
   - Ver carrinho
   - Confirmar pedido
   - Escolher pagamento

4. **Verificar na Cozinha**:
   ```
   http://localhost:5176
   ```
   - Pedido deve aparecer em "Pendente"

---

## 💳 Teste de Pagamentos (ifthenpay)

### Configuração Necessária
Veja: `docs/IFTHENPAY-CONFIG.md`

### Teste Multibanco
```powershell
$payment = @{
  orderId = "ORDER123"
  amount = 10.50
  customerEmail = "teste@example.com"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/v1/public/payments/multibanco" `
  -Method POST `
  -Body $payment `
  -ContentType "application/json" `
  -UseBasicParsing
```

Deve retornar:
```json
{
  "entity": "11249",
  "reference": "123 456 789",
  "amount": "10.50",
  "status": "pending"
}
```

### Teste MB WAY
```powershell
$payment = @{
  orderId = "ORDER124"
  amount = 15.00
  phoneNumber = "912345678"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/v1/public/payments/mbway" `
  -Method POST `
  -Body $payment `
  -ContentType "application/json" `
  -UseBasicParsing
```

---

## 📊 Relatório de Testes

### Executado em: ____/____/______

| Componente | Status | Notas |
|------------|--------|-------|
| API Backend | ✅ Funcionando | Categorias e Produtos OK |
| Admin Login | ⏳ Pendente | |
| Menu Builder | ⏳ Pendente | |
| Modificadores Pro | ⏳ Pendente | |
| Menu Cliente | ⏳ Pendente | |
| Kitchen | ⏳ Pendente | |
| Pagamentos | ⏳ Pendente | Requer config ifthenpay |

---

## 🐛 Problemas Conhecidos

### 1. TypeScript no Backend
- **Status**: Avisos, não bloqueiam
- **Impacto**: Nenhum (JS gerado funciona)
- **Solução**: Usar `npm run dev` sem recompilar

### 2. Grid Warnings MUI
- **Status**: Corrigido
- **Solução**: Substituído por Box + flexbox

### 3. Erro 400 ao gravar
- **Status**: Corrigido
- **Solução**: Passthrough no Zod

---

## ✅ Critérios de Sucesso

O sistema está **100% funcional** se:

1. ✅ API retorna dados corretamente
2. ✅ Admin permite criar/editar sem erros 400
3. ✅ Menu digital mostra produtos
4. ✅ Drag & drop funciona
5. ✅ Preview de modificadores funciona
6. ✅ Pedidos aparecem na cozinha
7. ✅ Pagamentos integram com ifthenpay

---

## 🚀 Próximas Ações

Após testes completos:

1. [ ] Configurar ifthenpay (ver docs/IFTHENPAY-CONFIG.md)
2. [ ] Testar pagamentos em sandbox
3. [ ] Configurar webhook no backoffice
4. [ ] Deploy em produção
5. [ ] Monitoramento e logs

**Boa sorte nos testes!** 🎉

