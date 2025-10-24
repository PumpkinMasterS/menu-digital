# O Que Não Consegui Fazer - Explicação Detalhada

## ❌ BLOQUEADO: Testes dos Endpoints

### Razão do Bloqueio
O projeto Vercel tem **Deployment Protection** ativada (autenticação SSO da Vercel), o que bloqueia TODAS as requisições HTTP aos endpoints, incluindo:
- Callbacks do IfThenPay
- Proxies para o backend Railway
- Healthchecks públicos

### Por Que Isso É Crítico
O callback do IfThenPay **DEVE ser público** para funcionar. Quando o IfThenPay tentar enviar notificações de pagamento, receberá `401 Unauthorized` e os pagamentos não serão processados.

---

## 🔧 COMO RESOLVER (Passo a Passo)

### MÉTODO 1: Desativar Deployment Protection (RECOMENDADO)

#### Passo 1: Acessar o Dashboard Vercel
1. Abra o navegador
2. Acesse: https://vercel.com/fabio-vasoncelos-projects/menu-digital
3. Faça login se necessário

#### Passo 2: Ir para Configurações de Proteção
1. No projeto `menu-digital`, clique em **Settings** (no topo)
2. No menu lateral esquerdo, clique em **Deployment Protection**
3. URL direta: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection

#### Passo 3: Desativar Proteção
Você terá 3 opções:

**OPÇÃO A - Desativar Completamente** (Melhor para produção)
- Desmarque/desative "Vercel Authentication"
- Clique em "Save"
- ✅ Endpoints ficarão públicos imediatamente

**OPÇÃO B - Password Protection Apenas** (Alternativa)
- Mude de "Vercel Authentication" para "Password Protection"
- Configure uma senha
- ⚠️ Endpoints ainda precisarão de senha, então o callback do IfThenPay não funcionará
- **NÃO RECOMENDADO para este caso**

**OPÇÃO C - Domínio Customizado** (Melhor solução)
- Mantenha a proteção em `*.vercel.app`
- Adicione um domínio customizado (ex: `menu.seusite.pt`)
- Domínios customizados não têm Deployment Protection
- Configure o callback do IfThenPay para usar o domínio customizado
- ✅ IDEAL para produção real

---

### MÉTODO 2: Usar Bypass Token (Temporário para Testes)

#### Passo 1: Gerar Bypass Token
1. Acesse: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection
2. Na seção "Protection Bypass for Automation"
3. Clique em **"Create Bypass Token"** ou **"Regenerate Token"**
4. Copie o token gerado (ex: `dpbp_123abc...`)

#### Passo 2: Testar com o Token
```bash
# Adicione o token na query string
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?healthcheck=1&x-vercel-protection-bypass=SEU_TOKEN_AQUI"
```

#### ⚠️ Limitações
- O token expira
- O IfThenPay **NÃO pode usar** o token nos callbacks reais
- Serve **APENAS para testes manuais**
- **NÃO resolve o problema para produção**

---

### MÉTODO 3: Domínio Customizado (MELHOR para Produção)

#### Passo 1: Adicionar Domínio
1. Acesse: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/domains
2. Clique em **"Add Domain"**
3. Digite seu domínio (ex: `menu.seusite.pt` ou `pedidos.restaurante.pt`)
4. Clique em **"Add"**

#### Passo 2: Configurar DNS
A Vercel mostrará as configurações DNS necessárias:

**Se usar CNAME (subdomínio)**:
```
Tipo: CNAME
Nome: menu (ou o subdomínio que escolheu)
Valor: cname.vercel-dns.com
```

**Se usar A Record (domínio raiz)**:
```
Tipo: A
Nome: @
Valor: 76.76.21.21
```

#### Passo 3: Aguardar Propagação
- DNS pode levar 10 minutos a 48 horas
- Verifique o status no dashboard da Vercel
- Quando aparecer ✅ verde, está pronto

#### Passo 4: Usar o Domínio Customizado
```
Callback URL: https://menu.seusite.pt/v1/public/payments/ifthenpay/callback
```

---

## 📋 CHECKLIST - O Que Você Precisa Fazer

### ✅ JÁ FEITO (pelo AI)
- [x] Configurar `BACKEND_PUBLIC_URL` no Vercel
- [x] Corrigir `IFTHENPAY_MBWAY_API_URL` (sem crases)
- [x] Adicionar `MONGODB_URI` em todos os ambientes
- [x] Fazer deploy de produção
- [x] Documentar toda a configuração

### ⏳ AGUARDANDO SUA AÇÃO
- [ ] **CRÍTICO**: Desativar Deployment Protection OU configurar domínio customizado
- [ ] Executar testes de healthcheck (após remover proteção)
- [ ] Testar anti-phishing (após remover proteção)
- [ ] Configurar callback no backoffice IfThenPay
- [ ] Testar fluxo completo de pagamento
- [ ] Validar atualização no MongoDB Atlas

---

## 🧪 TESTES QUE FICARAM PENDENTES

Execute estes comandos **APÓS remover a Deployment Protection**:

### 1. Healthcheck HEAD
```bash
curl -I https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback
```
**Resultado esperado**: `HTTP/2 200`

### 2. Healthcheck GET
```bash
curl https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?healthcheck=1
```
**Resultado esperado**: `{"ok":true}`

### 3. Anti-Phishing Inválido
```bash
curl https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=CHAVE_ERRADA
```
**Resultado esperado**: `401 Unauthorized`

### 4. Anti-Phishing Válido (sem RequestId)
```bash
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=APk9%23vB7tL2xQ%21sR"
```
**Resultado esperado**: `400 Missing RequestId`

### 5. Callback Completo (Pagamento Pago)

**IMPORTANTE**: Antes de executar, você precisa criar um payment no MongoDB com:
```json
{
  "requestId": "REQ123",
  "method": "mbway",
  "orderId": "algum-order-id-valido",
  "status": "pending"
}
```

Depois execute:
```bash
curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=APk9%23vB7tL2xQ%21sR&RequestId=REQ123&Estado=000"
```
**Resultado esperado**: `{"ok":true}`

**Verificar no MongoDB Atlas**:
- Collection `payments`: `status="completed"`, `paidAt` preenchido
- Collection `orders`: `paymentStatus="paid"`, `paidAt` preenchido

### 6. Proxy para Backend Railway (/v1)
```bash
curl https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/products
```
**Resultado esperado**: Lista de produtos do backend

### 7. Proxy para Backend Railway (/public)
```bash
curl https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/public/health
```
**Resultado esperado**: Resposta do backend (ou 404 se o endpoint não existir)

---

## 🔐 CONFIGURAÇÃO IFTHENPAY (Após Testes)

### Onde Configurar
1. Acesse o backoffice IfThenPay
2. Vá para a seção de configuração da sua conta MB WAY
3. Procure por "URL de Callback" ou "Notification URL"

### URL de Callback
**Se usando domínio Vercel**:
```
https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback
```

**Se configurou domínio customizado** (RECOMENDADO):
```
https://seu-dominio.pt/v1/public/payments/ifthenpay/callback
```

### Anti-Phishing Key
```
APk9#vB7tL2xQ!sR
```

**⚠️ ATENÇÃO**: Cole a URL SEM codificar os caracteres especiais. O backoffice IfThenPay não precisa de URL encoding.

---

## 📊 RESUMO DO STATUS

| Item | Status | Requer |
|------|--------|---------|
| Backend Railway | ✅ Ativo | - |
| Variáveis Vercel | ✅ Todas configuradas | - |
| Deploy Produção | ✅ Completo | - |
| Deployment Protection | ❌ Ativa | Ação manual |
| Testes Endpoints | ⏸️ Bloqueado | Remover proteção |
| Config IfThenPay | ⏸️ Pendente | Testes OK + remoção proteção |

---

## 🚨 AÇÃO IMEDIATA NECESSÁRIA

1. **AGORA**: Desative a Deployment Protection (ou configure domínio customizado)
2. **DEPOIS**: Execute os testes da seção acima
3. **ENTÃO**: Configure o callback no IfThenPay
4. **FINALMENTE**: Teste um pagamento real

---

## 💡 DICA PRO

Para evitar problemas futuros, considere:

1. **Usar domínio customizado** para produção
2. **Manter proteção** em `*.vercel.app` para ambientes de preview
3. **Criar um segundo projeto Vercel** para staging/testes com proteção ativa
4. **Usar variáveis de ambiente diferentes** para dev/staging/prod

---

## 📞 PRECISA DE AJUDA?

Se encontrar problemas:

1. **Verifique os logs do Vercel**:
   ```bash
   vercel logs https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app
   ```

2. **Verifique os logs do Railway**:
   ```bash
   railway logs
   ```

3. **Verifique o MongoDB Atlas**:
   - Logs de conexão
   - Rede (Network Access)
   - Usuários (Database Access)

4. **Teste a conexão MongoDB**:
   ```bash
   # No backend Railway, execute:
   railway run node -e "const {MongoClient}=require('mongodb');new MongoClient(process.env.MONGODB_URI).connect().then(()=>console.log('OK')).catch(e=>console.error(e))"
   ```

---

**Criado em**: 23 de Outubro de 2025
**Motivo**: Deployment Protection bloqueou testes automatizados
**Solução**: Ação manual necessária para remover proteção ou configurar domínio customizado

