# 🚀 GUIA COMPLETO: DEPLOY VERCEL + DOMÍNIO PERSONALIZADO

## 📋 **RESUMO EXECUTIVO**

**Objetivo:** Deploy seguro do Clever School PAL AI no Vercel com domínio `connectai.pt`
**Estratégia:** Dois ambientes (produção + desenvolvimento protegido)
**Custo:** €20/mês (Vercel Pro) + domínio
**Tempo:** 30-45 minutos

---

## 🎯 **ARQUITETURA PROPOSTA**

```
┌─────────────────────────────────────────┐
│           ARQUITETURA FINAL             │
├─────────────────────────────────────────┤
│ 🌐 connectai.pt (Produção)             │
│   ├─ Público quando pronto              │
│   ├─ SSL automático                     │
│   └─ Cache otimizado                    │
│                                         │
│ 🔒 dev.connectai.pt (Desenvolvimento)  │
│   ├─ Vercel Authentication             │
│   ├─ Acesso apenas para equipe         │
│   └─ Preview deployments protegidos    │
│                                         │
│ ⚡ Backend: Supabase                    │
│   ├─ Edge Functions                     │
│   ├─ Database PostgreSQL               │
│   └─ Authentication & RLS              │
└─────────────────────────────────────────┘
```

---

## 🔧 **PASSO-A-PASSO DETALHADO**

### **PASSO 1: Preparação Local**

```bash
# 1. Clonar/navegar para o projeto
cd clever-school-pal-ai

# 2. Instalar Vercel CLI
npm install -g vercel

# 3. Login no Vercel
vercel login

# 4. Testar build local
npm run build
```

### **PASSO 2: Configuração DNS**

No painel do seu registrador de domínio (`connectai.pt`):

```dns
# Adicionar estes registros DNS:
Tipo    Nome    Valor               TTL
A       @       76.76.19.19         300
A       www     76.76.19.19         300
CNAME   dev     cname.vercel-dns.com 300
```

**⚠️ IMPORTANTE:** O valor CNAME para `dev` será fornecido pelo Vercel após o primeiro deploy.

### **PASSO 3: Deploy Inicial**

```bash
# Executar script de deploy
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

**OU manualmente:**

```bash
# Deploy manual
vercel --prod
```

### **PASSO 4: Configuração no Dashboard Vercel**

1. **Aceder ao Dashboard:** https://vercel.com/dashboard
2. **Selecionar o projeto:** clever-school-pal-ai
3. **Ir para Settings → Domains**

#### **4.1 Adicionar Domínio Principal**
```
Domain: connectai.pt
Environment: Production
```

#### **4.2 Adicionar Subdomínio de Desenvolvimento**
```
Domain: dev.connectai.pt  
Environment: Preview
```

### **PASSO 5: Configurar Variáveis de Ambiente**

**Settings → Environment Variables:**

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Outros
VITE_APP_ENV=production
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=meta-llama/llama-3.1-70b-instruct
```

### **PASSO 6: Configurar Proteção de Acesso**

**Settings → Deployment Protection:**

1. **Selecionar:** "Only Preview Deployments"
2. **Método:** "Vercel Authentication"
3. **Salvar configuração**

### **PASSO 7: Adicionar Membros da Equipe**

**Settings → Members:**

1. **Convidar colega:** email@exemplo.com
2. **Role:** Member ou Viewer
3. **Enviar convite**

---

## 🔒 **CONFIGURAÇÃO DE SEGURANÇA**

### **Níveis de Proteção Disponíveis**

| Opção | Custo | Funcionalidade |
|-------|-------|----------------|
| **Vercel Authentication** | Gratuito | Apenas membros da equipe |
| **Password Protection** | €150/mês | Proteção por palavra-passe |
| **Trusted IPs** | Enterprise | Acesso por IP específico |

**✅ RECOMENDAÇÃO:** Vercel Authentication (gratuito e adequado)

### **Configuração de Headers de Segurança**

O arquivo `vercel.json` já inclui:
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY  
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin

---

## 💰 **ANÁLISE DE CUSTOS**

### **Custos Vercel Pro**
```
📊 CUSTOS MENSAIS ESTIMADOS
├─ Vercel Pro: €20/mês
├─ Bandwidth: Incluído (100GB)
├─ Build time: Incluído (400h)
├─ Domains: Gratuito
└─ SSL: Gratuito
─────────────────────────
TOTAL: €20/mês
```

### **Custos Totais do Sistema**
```
🏢 INFRAESTRUTURA COMPLETA
├─ Vercel (Frontend): €20/mês
├─ Supabase Pro: €25/mês  
├─ OpenRouter (IA): variável conforme modelo (ex.: €10–€25/mês)
├─ WhatsApp API: €14/mês
└─ Domínio: €10/ano
─────────────────────────
TOTAL: €74/mês + €10/ano
```

---

## 🛡️ **AVALIAÇÃO DE SEGURANÇA**

### **✅ PONTOS FORTES**

1. **Isolamento de Ambientes**
   - Produção e desenvolvimento separados
   - Acesso controlado por ambiente

2. **Autenticação Robusta**
   - Supabase Auth + RLS
   - Vercel Authentication para preview
   - 2FA disponível

3. **Infraestrutura Segura**
   - SSL/TLS automático
   - Headers de segurança
   - CDN global com proteção DDoS

4. **Compliance**
   - GDPR compliant
   - SOC 2 Type II
   - ISO 27001

### **⚠️ PONTOS DE ATENÇÃO**

1. **Variáveis de Ambiente**
   - Nunca commitar keys no Git
   - Usar Vercel Environment Variables

2. **Supabase RLS**
   - Manter políticas RLS ativas
   - Testar isolamento entre escolas

3. **Monitoramento**
   - Configurar alertas de erro
   - Monitorar usage e performance

---

## 🚀 **COMANDOS RÁPIDOS**

### **Deploy Rápido**
```bash
# Deploy de emergência
vercel --prod

# Deploy com preview
vercel

# Rollback
vercel rollback [deployment-url]
```

### **Gestão de Domínios**
```bash
# Listar domínios
vercel domains ls

# Adicionar domínio
vercel domains add connectai.pt

# Verificar DNS
vercel domains inspect connectai.pt
```

### **Logs e Debug**
```bash
# Ver logs
vercel logs

# Inspeccionar deployment
vercel inspect [deployment-url]
```

---

## 📞 **SUPORTE E RECURSOS**

### **Documentação Oficial**
- 📚 [Vercel Docs](https://vercel.com/docs)
- 🔧 [Vite on Vercel](https://vercel.com/docs/frameworks/vite)
- 🔒 [Deployment Protection](https://vercel.com/docs/deployment-protection)

### **Comunidade**
- 💬 [Vercel Discord](https://vercel.com/discord)
- 🐛 [GitHub Issues](https://github.com/vercel/vercel/issues)
- 📧 Support: support@vercel.com

---

## ✅ **CHECKLIST FINAL**

### **Pré-Deploy**
- [ ] Build local funciona
- [ ] Variáveis de ambiente configuradas
- [ ] DNS configurado
- [ ] Vercel CLI instalado

### **Pós-Deploy**
- [ ] Domínio principal funciona
- [ ] Subdomínio de dev protegido
- [ ] SSL ativo
- [ ] Equipe adicionada
- [ ] Monitoramento configurado

### **Testes**
- [ ] Login/logout funciona
- [ ] Supabase conecta
- [ ] IA responde
- [ ] WhatsApp (quando disponível)

---

## 🎉 **RESULTADO FINAL**

Após seguir este guia, terá:

✅ **Produção:** `https://connectai.pt` (público)  
✅ **Desenvolvimento:** `https://dev.connectai.pt` (protegido)  
✅ **SSL:** Certificados automáticos  
✅ **Performance:** CDN global otimizado  
✅ **Segurança:** Acesso controlado  
✅ **Escalabilidade:** Auto-scaling  

**🚀 Tempo total:** 30-45 minutos  
**💰 Custo:** €20/mês  
**🔒 Segurança:** Enterprise-grade  

---

*Criado por: Assistente IA | Janeiro 2025*