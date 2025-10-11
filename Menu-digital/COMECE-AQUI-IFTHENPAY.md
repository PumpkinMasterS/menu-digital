# 🚀 COMECE AQUI - Configurar ifthenpay

## ✅ Seu Sistema Está PRONTO!

Tudo está funcional. Falta apenas configurar os pagamentos com **ifthenpay**.

Você já tem conta em: https://backoffice.ifthenpay.com ✅

---

## 📝 5 Credenciais Necessárias

Você precisa copiar **5 valores** do backoffice ifthenpay:

| # | Credencial | Onde Buscar no Backoffice |
|---|------------|---------------------------|
| 1️⃣ | **Entidade Multibanco** | Menu → Multibanco |
| 2️⃣ | **SubEntidade** | Menu → Multibanco |
| 3️⃣ | **MB WAY Key** | Menu → MB WAY |
| 4️⃣ | **Backoffice Key** | Menu → Configurações → API |
| 5️⃣ | **Anti-Phishing Key** | Menu → Configurações → Callbacks |

---

## 🔍 Passo a Passo Visual

### 1️⃣ Entidade e SubEntidade Multibanco

```
1. Vá para: https://backoffice.ifthenpay.com
2. Login
3. Menu lateral esquerdo → clique "Multibanco"
4. Você verá uma tabela com:
   
   Entidade    SubEntidade    Estado
   11249       001            Ativo
   ↑           ↑
   COPIE       COPIE

5. Anote ambos os números!
```

### 2️⃣ MB WAY Key

```
1. Menu lateral → clique "MB WAY"
2. Procure campo chamado:
   - "Chave MB WAY" ou
   - "API Key" ou
   - "MB WAY Key"
3. Formato típico: XXX-XXXXXX
4. Copie!
```

### 3️⃣ Backoffice Key (API)

```
1. Menu lateral → "Configurações"
2. Submenu → "API" ou "Integrações"
3. Procure:
   - "Backoffice Key" ou
   - "API Key" ou
   - "Chave da API"
4. É uma string longa (30-50 caracteres)
5. Copie!
```

### 4️⃣ Anti-Phishing Key

```
1. Menu lateral → "Configurações"
2. Submenu → "Callbacks" ou "URLs de Retorno"
3. PRIMEIRO: Configure a URL de callback:
   https://seu-dominio.com/v1/public/payments/ifthenpay/callback
   
4. DEPOIS: Procure campo:
   - "Chave Anti-Phishing" ou
   - "Security Key" ou
   - "Chave de Segurança"
5. Copie!
```

---

## ⚙️ Configurar no Projeto

### Abrir Arquivo `.env`

```bash
cd C:\Projetos\Menu-digital\backend
notepad .env
```

### Adicionar ao Final do Arquivo

Cole estas linhas **NO FINAL** do arquivo `.env`:

```env
# ============================================
# ifthenpay - Configuração de Pagamentos
# ============================================

# Multibanco
IFTHENPAY_MULTIBANCO_ENTIDADE=COLE_AQUI
IFTHENPAY_MULTIBANCO_SUBENTIDADE=COLE_AQUI

# MB WAY
IFTHENPAY_MBWAY_KEY=COLE_AQUI

# API
IFTHENPAY_BACKOFFICE_KEY=COLE_AQUI

# Segurança
IFTHENPAY_ANTI_PHISHING_KEY=COLE_AQUI

# Modo (true=testes, false=produção)
IFTHENPAY_SANDBOX=true
```

### Exemplo Preenchido:

```env
# ifthenpay - Configuração de Pagamentos
IFTHENPAY_MULTIBANCO_ENTIDADE=11249
IFTHENPAY_MULTIBANCO_SUBENTIDADE=001
IFTHENPAY_MBWAY_KEY=ABC-123456
IFTHENPAY_BACKOFFICE_KEY=abc123def456ghi789jkl012mno345pqr678
IFTHENPAY_ANTI_PHISHING_KEY=xyz789abc123def456
IFTHENPAY_SANDBOX=true
```

**⚠️ Substitua pelos SEUS valores reais do backoffice!**

---

## 🔄 Reiniciar Backend

Depois de salvar o `.env`:

```bash
cd C:\Projetos\Menu-digital\backend
npm run dev
```

Deve mostrar:
```
API listening on http://localhost:3000
```

---

## 🧪 Testar Agora!

### Teste 1: Criar Referência Multibanco

```powershell
$payment = @{
  orderId = "TEST001"
  amount = 5.00
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/v1/public/payments/multibanco" `
  -Method POST `
  -Body $payment `
  -ContentType "application/json" `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Deve retornar**:
```json
{
  "success": true,
  "entity": "11249",
  "reference": "123 456 789",
  "amount": "5.00",
  "status": "pending"
}
```

✅ Se aparecer isso, **FUNCIONOU!**

### Teste 2: MB WAY

```powershell
$payment = @{
  orderId = "TEST002"
  amount = 10.00
  phoneNumber = "912345678"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/v1/public/payments/mbway" `
  -Method POST `
  -Body $payment `
  -ContentType "application/json" `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 🐛 Se Não Funcionar

### Erro: "ifthenpay not configured"

**Solução**:
1. Verifique se o `.env` foi salvo
2. Reinicie o backend (`npm run dev`)
3. Confirme que as variáveis estão sem espaços extras

### Erro 500 ou "Invalid credentials"

**Solução**:
1. Volte ao backoffice
2. Confirme que copiou os valores corretos
3. Certifique-se que não tem espaços no início/fim

### Callback não funciona

**Solução**:
1. Só funciona em produção (com domínio real)
2. Em desenvolvimento, simule manualmente
3. Configure URL no backoffice após deploy

---

## 📋 Checklist Final

- [ ] Copiar Entidade (ex: 11249)
- [ ] Copiar SubEntidade (ex: 001)
- [ ] Copiar MB WAY Key (ex: ABC-123456)
- [ ] Copiar Backoffice Key (string longa)
- [ ] Copiar Anti-Phishing Key (string longa)
- [ ] Colar tudo no `backend/.env`
- [ ] Reiniciar backend
- [ ] Testar criar referência MB
- [ ] Testar MB WAY
- [ ] ✅ **PRONTO!**

---

## 📚 Documentação Completa

Se precisar de mais detalhes:

| Arquivo | Conteúdo |
|---------|----------|
| `docs/IFTHENPAY-CONFIG.md` | Guia detalhado com screenshots |
| `REVISAO-COMPLETA.md` | Revisão completa do sistema |
| `TESTE-SISTEMA-COMPLETO.md` | Todos os testes |

---

## 📞 Suporte ifthenpay

Se tiver dúvidas sobre o backoffice:

- **Email**: suporte@ifthenpay.com
- **Telefone**: +351 217 817 555
- **Horário**: Segunda a Sexta, 9h-18h

---

## ✨ Está Quase!

Você está a **5 minutos** de ter pagamentos funcionando!

1. Entre no backoffice: https://backoffice.ifthenpay.com
2. Copie as 5 credenciais
3. Cole no `.env`
4. Reinicie o backend
5. Teste!

**Boa sorte!** 🚀

