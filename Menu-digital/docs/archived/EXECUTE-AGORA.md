# ⚡ EXECUTE AGORA - Comandos Prontos

**Tempo Total**: 3 minutos (automático) + 15 minutos (manual) = 18 minutos

---

## 🚀 PASSO 1: Redeploy Vercel (2 minutos)

```powershell
# Execute este comando:
vercel deploy --prod
```

**Aguarde**: O build vai levar ~1-2 minutos.  
**O que isso faz**: Aplica a variável BACKEND_PUBLIC_URL que foi adicionada há 1h.

---

## 🧪 PASSO 2: Teste Tudo (1 minuto)

```powershell
# Execute este comando:
.\scripts\test-integracao-completa.ps1
```

**Resultado Esperado**: 
```
[SUCCESS] TODOS OS TESTES PASSARAM! Sistema 100% operacional!
```

Se ainda falhar, execute:
```powershell
vercel env ls | Select-String "BACKEND_PUBLIC_URL"
```

Deve mostrar a variável em Production. Se não mostrar, execute:
```powershell
echo "https://menu-digital-production.up.railway.app" | vercel env add BACKEND_PUBLIC_URL production
vercel deploy --prod
```

---

## 🔐 PASSO 3: Configure IfThenPay (10 minutos)

### 3.1. Acesse o Backoffice
1. Vá para: https://ifthenpay.com
2. Faça login
3. Navegue até: **Configurações** → **MB WAY**

### 3.2. Configure Callback
Cole EXATAMENTE este valor (sem modificar):

**URL de Callback**:
```
https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback
```

**Anti-Phishing Key**:
```
APk9#vB7tL2xQ!sR
```

### 3.3. Salve
Clique em **Salvar** ou **Guardar**

---

## 🧪 PASSO 4: Teste Pagamento Real (5 minutos)

### 4.1. Crie um Pedido de Teste

1. Acesse: https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/menu
2. Adicione produtos ao carrinho
3. Finalize o pedido
4. Escolha **MB WAY** como método de pagamento
5. Insira um número de telemóvel de teste (ou real)

### 4.2. Aprove no Telemóvel

1. Aguarde notificação push no telemóvel
2. Abra a app MB WAY
3. Aprove o pagamento

### 4.3. Valide no MongoDB Atlas

1. Acesse: https://cloud.mongodb.com
2. Vá para: **Database** → **Browse Collections**
3. Selecione database: **menu_digital**

**Verifique Collection `payments`**:
```json
{
  "_id": "...",
  "requestId": "REQ...",
  "method": "mbway",
  "status": "completed",  // ← Deve estar "completed"
  "paidAt": "2025-10-23T...",  // ← Deve ter data
  "callbackData": { ... }
}
```

**Verifique Collection `orders`**:
```json
{
  "_id": "...",
  "paymentStatus": "paid",  // ← Deve estar "paid"
  "paidAt": "2025-10-23T...",  // ← Deve ter data
  ...
}
```

---

## ✅ PRONTO!

Se tudo acima funcionou:
- ✅ Backend Railway operacional
- ✅ MongoDB Atlas conectado
- ✅ Callback IfThenPay configurado
- ✅ Pagamentos MB WAY funcionando
- ✅ Sistema 100% completo!

---

## 🆘 SE ALGO FALHAR

### Erro: "Proxy 404"
```powershell
# Verifique se BACKEND_PUBLIC_URL está definido:
vercel env ls | Select-String "BACKEND_PUBLIC_URL"

# Se não estiver, adicione:
echo "https://menu-digital-production.up.railway.app" | vercel env add BACKEND_PUBLIC_URL production

# E redeploy:
vercel deploy --prod
```

### Erro: "401 Unauthorized" no callback
```powershell
# Verifique a Anti-Phishing Key no backoffice IfThenPay
# Deve ser EXATAMENTE: APk9#vB7tL2xQ!sR
```

### Erro: "Payment not found" no callback
```powershell
# Certifique-se que criou um pedido MB WAY primeiro
# E que o RequestId no callback corresponde ao do pagamento
```

### Erro: MongoDB não atualiza
```powershell
# Verifique os logs:
vercel logs https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app

# Ou:
railway logs
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Se precisar de mais detalhes:
- **Visão Geral**: [START-AQUI.md](./START-AQUI.md)
- **Relatório Completo**: [RELATORIO-FINAL-CONFIGURACAO.md](./RELATORIO-FINAL-CONFIGURACAO.md)
- **Sessão Atual**: [SESSAO-ATUAL-RESUMO.md](./SESSAO-ATUAL-RESUMO.md)
- **Índice**: [INDICE-CONFIGURACAO-VERCEL.md](./INDICE-CONFIGURACAO-VERCEL.md)

---

**Criado em**: 23/10/2025  
**Por**: Claude AI (Cursor IDE)  
**Status**: ✅ 95% Completo

🚀 **Vamos lá! Execute os comandos acima e tenha tudo funcionando em 18 minutos!**

