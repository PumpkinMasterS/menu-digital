# 🚨 AÇÃO IMEDIATA - ifthenpay

## ❌ Problema Identificado

Seu backoffice ifthenpay mostra **"Sem credenciais..."** em "Integrações: Credenciais".

**Isso é NORMAL** se a API não foi ativada ainda.

---

## ✅ Solução Rápida (Funciona AGORA)

### Opção 1: Modo Básico (5 minutos)

#### 1. Obter Entidade de Teste

```
1. No backoffice: Clique "Testar Referência"
2. Preencha:
   - Valor: 10.00
   - Descrição: Teste
3. Clique "Gerar"
4. COPIE o número da "Entidade" (5 dígitos)
   Exemplo: 11604
```

#### 2. Configurar .env

```bash
cd backend
notepad .env
```

Adicione **APENAS ISTO**:

```env
# ifthenpay - Modo Básico
IFTHENPAY_MULTIBANCO_ENTIDADE=11604  # Cole sua entidade aqui
IFTHENPAY_SANDBOX=true
```

#### 3. Reiniciar

```bash
npm run dev
```

#### 4. Testar

```powershell
$payment = @{ orderId = "TEST001"; amount = 10.00 } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/v1/public/payments/multibanco" -Method POST -Body $payment -ContentType "application/json" -UseBasicParsing
```

✅ **Deve funcionar e gerar referências!**

---

### Opção 2: Solicitar API Completa (Requer Contacto)

#### Email para Suporte

**Para**: suporte@ifthenpay.com  
**Assunto**: Solicitar Credenciais de API - Menu Digital

**Mensagem**:
```
Olá equipa ifthenpay,

Tenho uma conta ativa e estou a desenvolver um sistema de menu digital 
que precisa integrar com a vossa plataforma.

Preciso das seguintes credenciais de API:
- Entidade e SubEntidade Multibanco
- Chave MB WAY
- Backoffice Key (para API)
- Chave Anti-Phishing (para callbacks)

Minha conta está registada com o email: [SEU_EMAIL_AQUI]

Quando vou a "Integrações: Credenciais" no backoffice, aparece 
"Sem credenciais...". Como posso ativar/obter estas credenciais?

Agradeço o vosso apoio!

Cumprimentos,
[SEU_NOME]
```

#### Ou Ligar

**Tel**: +351 217 817 555  
**Horário**: Segunda a Sexta, 9h-18h

**Dizer**:
> "Olá, tenho conta no ifthenpay e preciso de credenciais de API para integração. As minhas credenciais estão vazias no backoffice. Como posso obter Entidade, MB WAY Key e Anti-Phishing Key?"

---

## 🔄 Comparação das Opções

| Opção | Tempo | Automação | Métodos |
|-------|-------|-----------|---------|
| **Modo Básico** | 5 min | Manual | Multibanco |
| **API Completa** | 1-2 dias | Automática | MB WAY + Callbacks |

### Modo Básico (Opção 1):
- ✅ Funciona AGORA
- ✅ Gera referências
- ⚠️ Verificação manual
- ⚠️ Só Multibanco

### API Completa (Opção 2):
- ⏳ Demora 1-2 dias úteis
- ✅ Totalmente automático
- ✅ MB WAY funcionando
- ✅ Callbacks automáticos

---

## 📋 Recomendação

### AGORA (Hoje):

1. ✅ Use **Opção 1** (Modo Básico)
2. ✅ Funciona imediatamente
3. ✅ Pode começar a usar o sistema

### AMANHÃ:

1. 📧 Envie email para suporte
2. 📞 Ou ligue para +351 217 817 555
3. ⏳ Aguarde credenciais (1-2 dias)

### DEPOIS:

1. ✅ Recebe credenciais
2. ✅ Atualiza .env
3. ✅ Sistema 100% automático

---

## 🎯 O Que Fazer AGORA

### Passo 1: Teste Referência

```
1. Backoffice → "Testar Referência"
2. Valor: 10.00
3. Gerar
4. COPIAR Entidade
```

### Passo 2: Configurar

```bash
cd backend
notepad .env
```

Adicionar:
```env
IFTHENPAY_MULTIBANCO_ENTIDADE=SUA_ENTIDADE
IFTHENPAY_SANDBOX=true
```

### Passo 3: Testar

```bash
npm run dev
```

```powershell
# Teste
$payment = @{ orderId = "TEST"; amount = 5.00 } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/v1/public/payments/multibanco" -Method POST -Body $payment -ContentType "application/json" -UseBasicParsing
```

---

## 💡 Entendendo o Problema

### Por que "Sem credenciais"?

Possíveis razões:
1. ✅ Conta nova (precisa ativação)
2. ✅ API não contratada
3. ✅ Métodos não ativados
4. ✅ Perfil sem permissões

### Solução?

**Contactar suporte!** Eles ativam em minutos.

---

## 📞 Contactos Importantes

| Canal | Info | Quando Usar |
|-------|------|-------------|
| **Email** | suporte@ifthenpay.com | Solicitar credenciais |
| **Telefone** | +351 217 817 555 | Urgente/dúvidas |
| **Horário** | Seg-Sex 9h-18h | - |

---

## ✅ Checklist

- [ ] Tentei "Testar Referência"
- [ ] Copiei a Entidade
- [ ] Adicionei ao .env
- [ ] Reiniciei backend
- [ ] Testei e funcionou ✅
- [ ] OU enviei email para suporte
- [ ] Aguardo credenciais completas

---

## 🚀 Resumo

**HOJE**: Use Modo Básico (5 min)  
**AMANHÃ**: Peça API Completa (email/telefone)  
**DEPOIS**: Sistema 100% Automático

**Comece com Modo Básico enquanto espera!** 💪

---

## 📁 Arquivos de Referência

- `IFTHENPAY-GUIA-REAL.md` - Guia completo adaptado
- `backend/ENV-IFTHENPAY-TEMPLATE.txt` - Template config
- `COMECE-AQUI-IFTHENPAY.md` - Guia original

---

**AÇÃO AGORA**: 
1. "Testar Referência" 
2. Copiar Entidade
3. Adicionar ao .env
4. Funciona! ✅

