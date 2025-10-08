# 💳 Configuração ifthenpay - Guia Completo

## 📋 O que é o ifthenpay?

O **ifthenpay** é uma plataforma de pagamentos portuguesa que permite:
- Multibanco (referências MB)
- MB WAY
- Cartão de Crédito
- Cofidis Pay
- Payshop

**Site**: https://ifthenpay.com  
**Backoffice**: https://backoffice.ifthenpay.com

---

## 🔑 Onde Buscar as Credenciais

### Passo 1: Aceder ao Backoffice
1. Vá para: https://backoffice.ifthenpay.com
2. Faça login com suas credenciais
3. Você será redirecionado para o painel

### Passo 2: Obter as Chaves API

#### Para Multibanco:
1. No menu lateral, clique em **"Configurações"** ou **"Multibanco"**
2. Procure por **"Entidade"** (ex: 11249)
3. Procure por **"SubEntidade"** (ex: 001)
4. Anote estes valores!

#### Para MB WAY:
1. No menu lateral, clique em **"MB WAY"**
2. Procure por **"Chave MB WAY"** ou **"API Key"**
3. Pode estar em formato: `XXX-XXXXXX` ou similar
4. Anote este valor!

#### Para Callback/Webhook:
1. Vá em **"Configurações"** → **"Callbacks"** ou **"URLs de Retorno"**
2. Configure a URL de callback:
   ```
   https://seu-dominio.com/v1/public/payments/ifthenpay/callback
   ```
3. Copie a **Chave Anti-Phishing** (security key)

#### Para API REST:
1. Alguns métodos do ifthenpay usam API REST
2. Procure em **"Configurações"** → **"API"**
3. Encontre **"Backoffice Key"** ou **"API Key"**
4. Formato: string alfanumérica longa

---

## 📝 Credenciais Necessárias

Para configurar o ifthenpay no seu projeto, você precisa de:

| Credencial | Onde Encontrar | Exemplo |
|------------|---------------|---------|
| **Entidade Multibanco** | Backoffice → Multibanco | 11249 |
| **SubEntidade** | Backoffice → Multibanco | 001 |
| **MB WAY Key** | Backoffice → MB WAY | XXX-XXXXXX |
| **Backoffice Key** | Backoffice → Configurações → API | abc123def456... |
| **Anti-Phishing Key** | Backoffice → Callbacks | xyz789abc123... |

---

## ⚙️ Configurar no Projeto

### 1. Editar `.env` do Backend

```bash
# Edite o arquivo
cd backend
notepad .env
```

### 2. Adicionar Credenciais

```env
# Configurações existentes...
MONGODB_URI=...
PORT=3000
JWT_SECRET=...

# ifthenpay - ADICIONE ESTAS LINHAS
IFTHENPAY_MULTIBANCO_ENTIDADE=11249
IFTHENPAY_MULTIBANCO_SUBENTIDADE=001
IFTHENPAY_MBWAY_KEY=XXX-XXXXXX
IFTHENPAY_BACKOFFICE_KEY=sua_backoffice_key_aqui
IFTHENPAY_ANTI_PHISHING_KEY=sua_anti_phishing_key_aqui
IFTHENPAY_SANDBOX=true
```

**IMPORTANTE**: 
- Substitua `11249`, `001`, `XXX-XXXXXX`, etc pelos seus valores REAIS
- `IFTHENPAY_SANDBOX=true` para testes, `false` para produção

---

## 🔍 Como Encontrar Cada Campo

### Screenshot/Passo a Passo:

1. **Login no Backoffice**
   ```
   https://backoffice.ifthenpay.com
   ```

2. **No Menu Lateral**:
   - 📊 Dashboard
   - 💳 Multibanco ← CLIQUE AQUI
   - 📱 MB WAY ← CLIQUE AQUI
   - ⚙️ Configurações ← CLIQUE AQUI
   - 📞 Callbacks ← CLIQUE AQUI

3. **Multibanco**:
   - Veja tabela com:
     - **Entidade**: número de 5 dígitos
     - **SubEntidade**: número de 3 dígitos
   - Copie ambos!

4. **MB WAY**:
   - Veja **"Chave MB WAY"** ou **"API Key"**
   - Formato: `XXX-XXXXXX` (letras e números)
   - Copie!

5. **Configurações → API**:
   - **Backoffice Key**: string longa (30-50 caracteres)
   - Use para chamadas API REST
   - Copie!

6. **Callbacks**:
   - Configure URL de callback
   - Copie **Chave Anti-Phishing**
   - Usada para validar callbacks

---

## 🧪 Testar Configuração

### 1. Após configurar o `.env`, reinicie o backend:
```bash
cd backend
npm run dev
```

### 2. Teste criar referência MB (exemplo):
```bash
curl -X POST http://localhost:3000/v1/public/payments/multibanco \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER123",
    "amount": 10.50
  }'
```

### 3. Deve retornar:
```json
{
  "entity": "11249",
  "reference": "123 456 789",
  "amount": "10.50",
  "status": "pending"
}
```

---

## 📚 Métodos de Pagamento

### 1. Multibanco (Referência)
- Cliente recebe entidade + referência
- Paga no multibanco/homebanking
- Callback confirma pagamento

### 2. MB WAY
- Cliente insere número de telemóvel
- Recebe notificação no app MB WAY
- Confirma pagamento
- Callback confirma

### 3. Cartão de Crédito
- Redirect para gateway ifthenpay
- Cliente preenche dados do cartão
- Redirect de volta
- Callback confirma

---

## 🔐 Segurança

### Anti-Phishing Key:
- **NUNCA** exponha esta chave publicamente
- Use para validar callbacks do ifthenpay
- Evita callbacks falsos

### Validação de Callback:
```javascript
// Exemplo de validação
const incomingKey = req.query.key;
const expectedKey = process.env.IFTHENPAY_ANTI_PHISHING_KEY;

if (incomingKey !== expectedKey) {
  return res.status(403).send('Invalid callback');
}
```

---

## 📞 Suporte ifthenpay

Se tiver dúvidas:
- **Email**: suporte@ifthenpay.com
- **Telefone**: +351 217 817 555
- **Horário**: Segunda a Sexta, 9h-18h
- **Documentação**: https://ifthenpay.com/documentacao

---

## ✅ Checklist de Configuração

- [ ] Login no backoffice ifthenpay
- [ ] Copiar Entidade Multibanco
- [ ] Copiar SubEntidade
- [ ] Copiar MB WAY Key
- [ ] Copiar Backoffice Key
- [ ] Copiar Anti-Phishing Key
- [ ] Adicionar ao `backend/.env`
- [ ] Reiniciar backend
- [ ] Testar criação de referência
- [ ] Configurar URL de callback no backoffice

---

## 🚀 Próximos Passos

Após configurar:
1. Teste pagamentos em sandbox
2. Implemente callback handler
3. Atualize status dos pedidos
4. Configure webhook URL no ifthenpay
5. Teste em produção

**Arquivo criado**: `backend/src/routes/v1/payments_ifthenpay.ts` (em breve)

