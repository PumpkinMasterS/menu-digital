# 📑 Índice - Documentação de Configuração Vercel + Railway + IfThenPay

Este é o índice de toda a documentação criada durante a configuração da infraestrutura em produção.

---

## 🎯 COMECE AQUI

### Para Visão Rápida (5 min de leitura)
👉 **[RESUMO-EXECUTIVO-CONFIGURACAO.md](./RESUMO-EXECUTIVO-CONFIGURACAO.md)**
- ✅ O que foi feito
- ⚠️ O que falta fazer
- 🔧 Ações imediatas necessárias
- 📊 Status geral

---

## 📚 DOCUMENTAÇÃO COMPLETA

### 1. Configuração Técnica Detalhada
**[CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md](./CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md)**

**Conteúdo**:
- ✅ Todas as variáveis configuradas (11 variáveis × 3 ambientes)
- 🏗️ Arquitetura completa do sistema
- 🧪 Checklist completo de testes
- 🔧 Configuração IfThenPay backoffice
- 📊 Diagramas de fluxo

**Quando usar**:
- Precisa de detalhes técnicos
- Quer entender a arquitetura
- Precisa configurar o backoffice IfThenPay
- Quer executar testes manuais

---

### 2. Explicação do Bloqueio e Soluções
**[O-QUE-NAO-CONSEGUI-FAZER.md](./O-QUE-NAO-CONSEGUI-FAZER.md)**

**Conteúdo**:
- ❌ O que ficou bloqueado e por quê
- 🔐 Deployment Protection explicada
- 🔧 3 métodos para resolver (passo a passo)
- 🧪 Testes que ficaram pendentes
- 💡 Dicas e troubleshooting

**Quando usar**:
- Quer entender por que os testes não rodaram
- Precisa de instruções passo a passo para remover proteção
- Quer configurar domínio customizado
- Precisa de bypass token para testes

---

### 3. Scripts de Teste Automatizados

#### Windows (PowerShell)
**[scripts/test-vercel-production.ps1](./scripts/test-vercel-production.ps1)**

**Como usar**:
```powershell
cd C:\Projetos\Menu-digital
.\scripts\test-vercel-production.ps1
```

**O que testa**:
- ✅ Healthcheck HEAD
- ✅ Healthcheck GET
- ✅ Anti-phishing inválido (deve falhar)
- ✅ Anti-phishing válido sem RequestId (deve falhar)
- ✅ Proxy /v1 para Railway
- ✅ Proxy /public para Railway
- 📊 Relatório colorido de resultados

---

#### Linux/Mac (Bash)
**[scripts/test-vercel-production.sh](./scripts/test-vercel-production.sh)**

**Como usar**:
```bash
cd /path/to/Menu-digital
chmod +x scripts/test-vercel-production.sh
./scripts/test-vercel-production.sh
```

**O que testa**: Igual ao PowerShell (mesmos testes, mesma saída)

---

## 🚀 FLUXO DE TRABALHO RECOMENDADO

### Se você é novo ou quer visão geral:
1. 📖 Leia **[RESUMO-EXECUTIVO-CONFIGURACAO.md](./RESUMO-EXECUTIVO-CONFIGURACAO.md)** (5 min)
2. 🔧 Escolha e aplique uma solução de **[O-QUE-NAO-CONSEGUI-FAZER.md](./O-QUE-NAO-CONSEGUI-FAZER.md)** (5-30 min)
3. 🧪 Execute **scripts/test-vercel-production** (.ps1 ou .sh) (2 min)
4. ✅ Se tudo passou, configure o backoffice IfThenPay usando **[CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md](./CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md)** (10 min)

**Tempo total**: 22-47 minutos

---

### Se você é técnico e quer detalhes:
1. 📖 Leia **[CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md](./CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md)** (10 min)
2. 🔧 Siga as instruções de **[O-QUE-NAO-CONSEGUI-FAZER.md](./O-QUE-NAO-CONSEGUI-FAZER.md)** (5-30 min)
3. 🧪 Execute **scripts/test-vercel-production** (.ps1 ou .sh) (2 min)
4. 🔍 Analise os logs e faça troubleshooting se necessário (variável)

**Tempo total**: 17-42 minutos + troubleshooting

---

## 📊 MAPA MENTAL DA DOCUMENTAÇÃO

```
Menu-digital/
│
├─ 📄 INDICE-CONFIGURACAO-VERCEL.md (você está aqui)
│   └─ Guia para todos os documentos
│
├─ 🎯 RESUMO-EXECUTIVO-CONFIGURACAO.md
│   ├─ ✅ Status geral
│   ├─ ⚠️ Ações necessárias
│   └─ 📋 Checklist rápido
│
├─ 🔧 CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md
│   ├─ 📊 Variáveis de ambiente (11 × 3)
│   ├─ 🏗️ Arquitetura completa
│   ├─ 🧪 Testes detalhados
│   └─ 🔐 Configuração IfThenPay
│
├─ 💡 O-QUE-NAO-CONSEGUI-FAZER.md
│   ├─ ❌ Problemas encontrados
│   ├─ 🔐 Deployment Protection
│   ├─ 🛠️ 3 métodos de solução
│   └─ 🧪 Testes pendentes
│
└─ scripts/
    ├─ 🪟 test-vercel-production.ps1 (Windows)
    └─ 🐧 test-vercel-production.sh (Linux/Mac)
```

---

## 🔍 REFERÊNCIA RÁPIDA

### URLs Importantes

| Recurso | URL |
|---------|-----|
| **Backend Railway** | https://menu-digital-production.up.railway.app |
| **Frontend Vercel** | https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app |
| **Callback IfThenPay** | `{vercel-url}/v1/public/payments/ifthenpay/callback` |
| **Dashboard Vercel** | https://vercel.com/fabio-vasoncelos-projects/menu-digital |
| **Deployment Protection** | https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection |
| **Domains Settings** | https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/domains |
| **MongoDB Atlas** | https://cloud.mongodb.com |

### Variáveis Críticas

| Variável | Valor |
|----------|-------|
| **BACKEND_PUBLIC_URL** | `https://menu-digital-production.up.railway.app` |
| **MONGODB_URI** | `mongodb+srv://whiswher_db_user:...@digitalmenu.gapfz.mongodb.net/menu_digital?...` |
| **IFTHENPAY_ANTI_PHISHING_KEY** | `APk9#vB7tL2xQ!sR` |
| **JWT_SECRET** | `vM9#tY7qP@4zL!xR2fQ8sH6wK0uB1nE3` |

### Comandos Úteis

```bash
# Vercel
vercel env ls                    # Listar variáveis
vercel deploy --prod             # Deploy produção
vercel logs <url>                # Ver logs

# Railway
railway status                   # Status do serviço
railway logs                     # Ver logs
railway domain                   # Ver domínio

# Testes
.\scripts\test-vercel-production.ps1   # Windows
./scripts/test-vercel-production.sh    # Linux/Mac
```

---

## ❓ FAQ - Perguntas Frequentes

### Q: Por que os endpoints retornam 401?
**A**: Deployment Protection está ativa. Veja **[O-QUE-NAO-CONSEGUI-FAZER.md](./O-QUE-NAO-CONSEGUI-FAZER.md)** para soluções.

### Q: Qual opção devo escolher para resolver o 401?
**A**: 
- **Produção**: Domínio customizado (melhor)
- **Teste rápido**: Desativar proteção
- **Debug**: Bypass token

### Q: Onde configuro o callback no IfThenPay?
**A**: Veja seção "CONFIGURAÇÃO NO BACKOFFICE IFTHENPAY" em **[CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md](./CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md)**

### Q: Como sei se tudo está funcionando?
**A**: Execute os scripts de teste. Se todos passarem (✅), está OK.

### Q: O teste falhou, e agora?
**A**: 
1. Verifique se removeu a Deployment Protection
2. Veja os logs: `vercel logs <url>` e `railway logs`
3. Verifique a conexão MongoDB Atlas
4. Consulte a seção de troubleshooting

### Q: Preciso fazer algo no MongoDB Atlas?
**A**: Não! Já está configurado. Apenas verifique os dados após testar o callback.

---

## 🎓 GLOSSÁRIO

| Termo | Significado |
|-------|-------------|
| **Deployment Protection** | Sistema de autenticação da Vercel que bloqueia acesso público aos deployments |
| **Bypass Token** | Token temporário para acessar deployments protegidos |
| **Callback** | URL que o IfThenPay chama para notificar pagamentos |
| **Anti-Phishing Key** | Chave secreta para validar callbacks do IfThenPay |
| **Proxy** | Redirecionamento de requisições `/v1` e `/public` para o backend Railway |
| **Healthcheck** | Endpoint de teste para verificar se o serviço está ativo |
| **RequestId** | Identificador único do pedido de pagamento MB WAY |
| **Estado** | Status do pagamento (`000` = pago, outros = recusado) |

---

## 📞 SUPORTE E RECURSOS

### Documentação Oficial
- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **IfThenPay**: https://ifthenpay.com/documentacao

### Ferramentas Usadas
- **Vercel CLI**: `npm i -g vercel`
- **Railway CLI**: `npm i -g @railway/cli`
- **MongoDB Compass**: https://www.mongodb.com/products/compass
- **Curl**: Testes de API (incluso no Windows 10+)

---

## 🏁 CHECKLIST FINAL

Use este checklist para garantir que tudo está completo:

- [ ] Li o **RESUMO-EXECUTIVO-CONFIGURACAO.md**
- [ ] Entendi o problema da Deployment Protection
- [ ] Escolhi uma solução (desativar proteção OU domínio customizado)
- [ ] Apliquei a solução escolhida
- [ ] Executei os scripts de teste
- [ ] Todos os testes passaram (✅)
- [ ] Configurei o callback no backoffice IfThenPay
- [ ] Testei um pagamento real
- [ ] Verifiquei o MongoDB Atlas (payments e orders atualizados)
- [ ] 🎉 Sistema 100% operacional!

---

## 📝 HISTÓRICO DE ALTERAÇÕES

| Data | Mudanças |
|------|----------|
| 2025-10-23 | Configuração inicial completa |
| 2025-10-23 | Identificado bloqueio por Deployment Protection |
| 2025-10-23 | Criada documentação completa e scripts de teste |

---

## 👨‍💻 INFORMAÇÕES TÉCNICAS

**Configurado por**: Claude AI (Cursor IDE)  
**Ferramentas usadas**: MCP, Vercel CLI, Railway CLI  
**Tempo de configuração**: ~10 minutos  
**Variáveis configuradas**: 33 (11 × 3 ambientes)  
**Deploy status**: ✅ Completo  
**Testes**: ⏸️ Aguardando remoção de proteção

---

**🚀 VOCÊ TEM TUDO O QUE PRECISA PARA FINALIZAR A CONFIGURAÇÃO!**

Escolha o documento apropriado acima e siga em frente. Boa sorte! 💪

