# 💳 ifthenpay - Guia Baseado no SEU Backoffice

## 🔍 O Que Você Vê no Backoffice

Você tem estes menus:
- Dashboard
- Estatísticas
- Pagamentos
- Novo Pagamento
- Pay By Link & PINPAY
- Pay Me
- **Testar Referência** ← IMPORTANTE!
- Formulários
- Débitos Diretos
- Faturas & Extratos
- Resumos Diários
- **Integrações: Credenciais** ← Vazio (precisa configurar)

---

## ⚠️ Situação Atual

Você encontrou **"Integrações: Credenciais"** mas está **vazio** ("Sem credenciais...").

Isso significa que você precisa:
1. Ativar os métodos de pagamento primeiro
2. Depois as credenciais aparecerão

---

## 🚀 Como Ativar e Obter Credenciais

### OPÇÃO 1: Usar "Testar Referência" (Mais Simples)

O ifthenpay permite **testar sem credenciais API** usando geração manual!

#### Passo 1: Gerar Referência de Teste
```
1. Clique em "Testar Referência"
2. Preencha:
   - Valor: 10.50
   - Descrição: Teste Menu Digital
3. Clique "Gerar"
4. Você receberá:
   - Entidade: XXXXX
   - Referência: XXX XXX XXX
```

#### Passo 2: Usar Modo Simplificado no Backend

Você pode usar o sistema **SEM API** inicialmente!

```env
# backend/.env - Modo Simplificado

# Use valores fixos do teste
IFTHENPAY_MULTIBANCO_ENTIDADE=XXXXX  # Da referência de teste
IFTHENPAY_MULTIBANCO_SUBENTIDADE=XXX  # Geralmente os 3 últimos dígitos

# Deixe em branco por enquanto (opcional)
IFTHENPAY_MBWAY_KEY=
IFTHENPAY_BACKOFFICE_KEY=
IFTHENPAY_ANTI_PHISHING_KEY=

# Modo teste
IFTHENPAY_SANDBOX=true
```

---

### OPÇÃO 2: Solicitar Acesso à API

Se precisar da API completa (MB WAY, callbacks, etc):

#### 1. Contactar Suporte ifthenpay

**Email**: suporte@ifthenpay.com

**Assunto**: Solicitar Credenciais de API

**Mensagem**:
```
Olá,

Tenho uma conta no ifthenpay e preciso integrar pagamentos no meu sistema.

Preciso das seguintes credenciais de API:
- Entidade e SubEntidade Multibanco
- Chave MB WAY
- Backoffice Key (API)
- Chave Anti-Phishing para callbacks

Minha conta/email: [SEU_EMAIL_AQUI]

Obrigado!
```

#### 2. Ou Ligar Diretamente

**Telefone**: +351 217 817 555  
**Horário**: Segunda a Sexta, 9h-18h

**O que pedir**:
- "Preciso ativar a API para integração"
- "Preciso das credenciais para Multibanco e MB WAY"
- "Preciso configurar callbacks"

---

### OPÇÃO 3: Verificar Métodos de Pagamento Ativos

#### Passo 1: Ir ao Dashboard
```
1. Clique em "Dashboard"
2. Veja se mostra:
   - Multibanco: Ativo/Inativo
   - MB WAY: Ativo/Inativo
   - Outros métodos
```

#### Passo 2: Se Não Estiver Ativo
```
1. Contacte o suporte
2. Peça para ativar:
   - Multibanco
   - MB WAY (se quiser)
```

#### Passo 3: Após Ativação
```
1. Volte a "Integrações: Credenciais"
2. As credenciais devem aparecer automaticamente
```

---

## 🛠️ Implementação Temporária (SEM API)

Enquanto não tem as credenciais, use este método:

### 1. Criar Referências Manualmente

No seu código, use valores fixos:

```typescript
// backend/src/routes/v1/payments_simple.ts
export const paymentsSimpleRoutes: FastifyPluginAsync = async (app) => {
  
  app.post('/v1/public/payments/multibanco', async (req, reply) => {
    const { orderId, amount } = req.body;
    
    // Valores FIXOS do seu backoffice
    const entidade = "11604"; // EXEMPLO - substitua pelo seu
    
    // Gerar referência simples
    const reference = generateSimpleReference(orderId);
    
    return reply.send({
      success: true,
      method: 'multibanco',
      entity: entidade,
      reference,
      amount: amount.toFixed(2),
      instructions: 'Pague no Multibanco com estes dados'
    });
  });
};

function generateSimpleReference(orderId: string): string {
  // Algoritmo simples
  const hash = orderId.padEnd(9, '0').slice(0, 9);
  return `${hash.slice(0,3)} ${hash.slice(3,6)} ${hash.slice(6,9)}`;
}
```

### 2. Verificação Manual

```
1. Cliente faz pedido
2. Sistema gera entidade + referência
3. Cliente paga no Multibanco
4. VOCÊ verifica manualmente no backoffice:
   - Menu "Pagamentos" → Ver pagamentos recebidos
5. Atualiza pedido manualmente no admin
```

---

## 📊 Como Verificar Pagamentos Recebidos

### No Backoffice:

```
1. Menu "Pagamentos"
2. Ou "Estatísticas"
3. Ou "Resumos Diários"
4. Veja lista de pagamentos
5. Confirme:
   - Entidade
   - Referência
   - Valor
   - Data/Hora
```

---

## 🔧 Configuração Atual Recomendada

### backend/.env (Modo Básico)

```env
# Seus dados (do "Testar Referência")
IFTHENPAY_MULTIBANCO_ENTIDADE=11604  # EXEMPLO
IFTHENPAY_MULTIBANCO_SUBENTIDADE=604  # EXEMPLO

# Deixe vazio por enquanto
IFTHENPAY_MBWAY_KEY=
IFTHENPAY_BACKOFFICE_KEY=
IFTHENPAY_ANTI_PHISHING_KEY=

# Modo manual (sem callbacks automáticos)
IFTHENPAY_SANDBOX=true
IFTHENPAY_MANUAL_MODE=true
```

---

## 📋 Próximos Passos

### Opção A: Modo Básico (Agora)

1. ✅ Use "Testar Referência" para obter Entidade
2. ✅ Configure .env com valores básicos
3. ✅ Sistema gera referências
4. ✅ Você verifica pagamentos manualmente
5. ⏳ Depois solicita API completa

### Opção B: API Completa (Requer Suporte)

1. ⏳ Contactar suporte@ifthenpay.com
2. ⏳ Solicitar ativação de API
3. ⏳ Receber credenciais
4. ⏳ Configurar callbacks automáticos
5. ✅ Sistema totalmente automatizado

---

## 🎯 Recomendação

**Para começar AGORA**:

1. **Teste "Testar Referência"**:
   - Gere uma referência de teste
   - Copie a Entidade que aparecer

2. **Configure Modo Básico**:
   ```env
   IFTHENPAY_MULTIBANCO_ENTIDADE=SUA_ENTIDADE_AQUI
   IFTHENPAY_SANDBOX=true
   ```

3. **Sistema Funciona**:
   - Gera referências
   - Clientes pagam
   - Você verifica manualmente

4. **Depois Peça API**:
   - Email para suporte
   - Solicite credenciais completas
   - Ative callbacks automáticos

---

## 📞 Contactos ifthenpay

**Suporte Técnico**:
- Email: suporte@ifthenpay.com
- Tel: +351 217 817 555
- Horário: Seg-Sex 9h-18h

**O que pedir**:
> "Olá, preciso de credenciais de API para integração. Minha conta é [SEU_EMAIL]. Preciso de Entidade, SubEntidade, MB WAY Key e chave Anti-Phishing. Obrigado!"

---

## ✅ Ação Imediata

1. Clique em **"Testar Referência"**
2. Gere uma referência de €10
3. Copie a **Entidade** que aparecer
4. Adicione ao `.env`:
   ```env
   IFTHENPAY_MULTIBANCO_ENTIDADE=SUA_ENTIDADE
   ```
5. Reinicie o backend
6. Teste!

**Depois**: Contacte o suporte para obter API completa.

---

## 💡 Nota Importante

É **NORMAL** que "Integrações: Credenciais" esteja vazio se:
- Conta é nova
- API não foi ativada
- Métodos de pagamento não foram configurados

**Solução**: Contactar suporte técnico do ifthenpay! 📞

