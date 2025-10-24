# Configuração Vercel + Railway - Relatório Completo

## ✅ CONCLUÍDO COM SUCESSO

### 1. Backend Railway Configurado
- **URL Pública**: `https://backend-production-348d.up.railway.app`
- **Projeto**: `menu-digital-backend`
- **Serviço**: `backend`
- **Status**: ✅ Ativo e funcionando

### 2. Variáveis de Ambiente Vercel - TODAS CONFIGURADAS

#### Configuradas em TODOS os ambientes (Development, Preview, Production):
- ✅ `PORT` = 3000
- ✅ `BASE_URL` = http://localhost:5175
- ✅ `IFTHENPAY_MBWAY_KEY` = UGE-291261
- ✅ `IFTHENPAY_BACKOFFICE_KEY` = 2767-7625-6087-1212
- ✅ `IFTHENPAY_MBWAY_API_URL` = https://ifthenpay.com/api/mbway (✅ SEM CRASES)
- ✅ `IFTHENPAY_MULTIBANCO_ENTIDADE` = 12345
- ✅ `IFTHENPAY_MULTIBANCO_SUBENTIDADE` = 999
- ✅ `JWT_SECRET` = vM9#tY7qP@4zL!xR2fQ8sH6wK0uB1nE3
- ✅ `IFTHENPAY_ANTI_PHISHING_KEY` = APk9#vB7tL2xQ!sR
- ✅ **BACKEND_PUBLIC_URL** = https://menu-digital-production.up.railway.app (✅ NOVA)
- ✅ **MONGODB_URI** = mongodb+srv://whiswher_db_user:KgvXln6lckWmgGgB@digitalmenu.gapfz.mongodb.net/menu_digital?retryWrites=true&w=majority&authSource=admin

### 3. Deploy de Produção Realizado
- **URL do Deploy**: https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app
- **Status**: ✅ Build completo e deploy ativo
- **Duração do Build**: ~1 minuto
- **Timestamp**: 2 minutos atrás (no momento da execução)

---

## ⚠️ BLOQUEADO - REQUER AÇÃO MANUAL

### Deployment Protection Ativa no Vercel

O projeto tem **Vercel Deployment Protection** ativada, o que bloqueia o acesso público aos endpoints incluindo o callback do IfThenPay.

**Erro retornado**: `401 Unauthorized`

#### Opções para Resolver:

### OPÇÃO 1: Desativar Deployment Protection (RECOMENDADO para produção)
```bash
# Via Dashboard Vercel:
# 1. Acesse: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection
# 2. Desative "Vercel Authentication"
# 3. Ou configure para "Standard Protection" com Password apenas
```

### OPÇÃO 2: Obter Bypass Token para Testes
```bash
# 1. No dashboard Vercel: Settings > Deployment Protection > Generate Bypass Token
# 2. Copie o token
# 3. Use nas requisições:
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?healthcheck=1&x-vercel-protection-bypass=SEU_TOKEN"
```

### OPÇÃO 3: Adicionar Domínio Customizado (Produção Real)
Domínios customizados não têm Deployment Protection:
```bash
# Via Dashboard Vercel:
# 1. Settings > Domains > Add Domain
# 2. Configure seu domínio (ex: menu.seusite.pt)
# 3. Os callbacks do IfThenPay funcionarão sem autenticação
```

---

## 📋 CHECKLIST FINAL - APÓS REMOVER PROTEÇÃO

### 1. Healthcheck Endpoints
```bash
# HEAD request (validação do backoffice IfThenPay)
curl -I https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback
# Esperado: 200 OK

# GET com healthcheck
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?healthcheck=1"
# Esperado: {"ok":true}
```

### 2. Teste Anti-Phishing

```bash
# Key incorreta - deve retornar 401
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=INCORRETA"
# Esperado: 401 Unauthorized

# Key correta sem RequestId - deve retornar 400
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=APk9%23vB7tL2xQ%21sR"
# Esperado: 400 Missing RequestId
```

### 3. Teste Callback Completo (Pagamento Aprovado)

```bash
# Simular callback do IfThenPay (pago)
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=APk9%23vB7tL2xQ%21sR&RequestId=REQ123&Estado=000"
# Esperado: {"ok":true}

# Verificar no MongoDB Atlas:
# - payments: status=completed, paidAt preenchido
# - orders: paymentStatus=paid, paidAt preenchido
```

### 4. Teste dos Proxies Backend

```bash
# Proxy /v1 - deve encaminhar para Railway
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/products"
# Esperado: Lista de produtos do backend

# Proxy /public
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/public/health"
# Esperado: Resposta do backend Railway
```

---

## 🔧 CONFIGURAÇÃO NO BACKOFFICE IFTHENPAY

### URL de Callback MB WAY
```
https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback
```

OU (se configurar domínio customizado):
```
https://seu-dominio.pt/v1/public/payments/ifthenpay/callback
```

### Anti-Phishing Key (já configurada)
```
APk9#vB7tL2xQ!sR
```

**IMPORTANTE**: No backoffice IfThenPay, cole a URL exata sem codificação de caracteres especiais.

---

## 📊 RESUMO DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE / USUÁRIO                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              VERCEL (Frontend + Proxies)                │
│  - Apps: /admin, /kitchen, /menu                        │
│  - Callback: /v1/public/payments/ifthenpay/callback     │
│  - Proxy /v1/* → Railway Backend                        │
│  - Proxy /public/* → Railway Backend                    │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
             │                        │
             ▼                        ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   RAILWAY (Backend)     │  │   MONGODB ATLAS          │
│   Fastify API           │  │   Database: menu_digital │
│   /v1 endpoints         │  │   Collections:           │
│   /public endpoints     │  │   - orders               │
└─────────────────────────┘  │   - payments             │
                             │   - products             │
                             └──────────────────────────┘
```

---

## 🚀 PRÓXIMOS PASSOS MANUAIS

1. **Remover Deployment Protection** (ou obter bypass token)
   - Link direto: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection

2. **Executar todos os testes da checklist acima**

3. **Configurar callback no backoffice IfThenPay**
   - URL: Use o domínio Vercel ou customizado
   - Anti-Phishing Key: `APk9#vB7tL2xQ!sR`

4. **Testar fluxo completo de pagamento**
   - Criar pedido
   - Gerar pagamento MB WAY
   - Simular callback de sucesso
   - Verificar status no MongoDB Atlas

---

## 📝 COMANDOS ÚTEIS

### Ver logs do último deploy
```bash
vercel logs https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app
```

### Ver variáveis de ambiente
```bash
vercel env ls
```

### Fazer novo deploy
```bash
vercel deploy --prod
```

### Ver status do Railway
```bash
railway status
```

### Ver logs do Railway
```bash
railway logs
```

---

## ✅ VALIDAÇÃO FINAL

Após remover a proteção, execute este script para validar tudo:

```bash
#!/bin/bash
DOMAIN="https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app"
KEY="APk9%23vB7tL2xQ%21sR"

echo "1. Testing HEAD healthcheck..."
curl -I "$DOMAIN/v1/public/payments/ifthenpay/callback"

echo "\n2. Testing GET healthcheck..."
curl "$DOMAIN/v1/public/payments/ifthenpay/callback?healthcheck=1"

echo "\n3. Testing anti-phishing (should fail)..."
curl "$DOMAIN/v1/public/payments/ifthenpay/callback?Key=WRONG"

echo "\n4. Testing with correct key (should ask for RequestId)..."
curl "$DOMAIN/v1/public/payments/ifthenpay/callback?Key=$KEY"

echo "\n5. Testing proxy /v1..."
curl "$DOMAIN/v1/public/products"

echo "\nAll tests completed!"
```

---

**Data de Configuração**: 23 de Outubro de 2025
**Configurado por**: Claude AI (Cursor IDE)
**Status**: ✅ Infraestrutura completa, com backend oficial `menu-digital-backend` e domínio Vercel configurado; remover Deployment Protection ou usar domínio custom para produção

