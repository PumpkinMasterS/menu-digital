# ⚡ START AQUI - Guia de Início Rápido

**Tempo estimado**: 5-30 minutos  
**Última atualização**: 23 de Outubro de 2025

---

## 🎯 Situação Atual

✅ **90% COMPLETO** - Infraestrutura configurada e deploy realizado  
⚠️ **10% RESTANTE** - Requer **1 ação manual** sua

---

## ⚡ AÇÃO IMEDIATA (Escolha 1)

### OPÇÃO 1: Desativar Proteção (5 minutos) - MAIS RÁPIDO

1. Abra: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection
2. **Desative** "Vercel Authentication"
3. Clique em **"Save"**
4. ✅ **PRONTO!** Pule para "Testes"

### OPÇÃO 2: Domínio Customizado (30 min + DNS) - MELHOR PARA PRODUÇÃO

1. Abra: https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/domains
2. Clique em **"Add Domain"**
3. Digite seu domínio (ex: `menu.seurestaurante.pt`)
4. Configure o DNS conforme instruções
5. Aguarde propagação (10 min - 48h)
6. ✅ **PRONTO!** Use o domínio customizado nos testes

---

## 🧪 TESTES (2 minutos)

Após escolher uma opção acima:

### Windows:
```powershell
cd C:\Projetos\Menu-digital
.\scripts\test-vercel-production.ps1
```

### Linux/Mac:
```bash
cd /path/to/Menu-digital
chmod +x scripts/test-vercel-production.sh
./scripts/test-vercel-production.sh
```

**Esperado**: Todos os testes com ✅ verde

---

## 🔐 CONFIGURAR IFTHENPAY (10 minutos)

**APÓS** os testes passarem:

1. Acesse o backoffice IfThenPay
2. Vá para configurações MB WAY
3. Configure:
   - **URL de Callback**: 
     ```
     https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback
     ```
     *(ou use seu domínio customizado se configurou)*
   
   - **Anti-Phishing Key**: 
     ```
     APk9#vB7tL2xQ!sR
     ```

4. Salve as configurações

---

## ✅ VALIDAÇÃO FINAL (5 minutos)

1. Crie um pedido de teste no sistema
2. Gere um pagamento MB WAY
3. Simule callback de sucesso:
   ```bash
   curl "https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/v1/public/payments/ifthenpay/callback?Key=APk9%23vB7tL2xQ%21sR&RequestId=REQ123&Estado=000"
   ```
4. Verifique no MongoDB Atlas:
   - Collection `payments`: `status="completed"`
   - Collection `orders`: `paymentStatus="paid"`

---

## 🎉 PRONTO!

Se todos os passos acima funcionaram:
- ✅ Sistema 100% operacional
- ✅ Pagamentos funcionando
- ✅ Infraestrutura completa

---

## 📚 Precisa de Mais Detalhes?

- **Visão geral completa**: [RESUMO-EXECUTIVO-CONFIGURACAO.md](./RESUMO-EXECUTIVO-CONFIGURACAO.md)
- **Detalhes técnicos**: [CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md](./CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md)
- **Explicação do problema**: [O-QUE-NAO-CONSEGUI-FAZER.md](./O-QUE-NAO-CONSEGUI-FAZER.md)
- **Índice completo**: [INDICE-CONFIGURACAO-VERCEL.md](./INDICE-CONFIGURACAO-VERCEL.md)

---

## ❓ Problemas?

### Os testes retornam 401
→ Você não desativou a Deployment Protection ainda. Faça isso primeiro.

### Os testes retornam 500
→ Verifique os logs: `vercel logs <url>` ou `railway logs`

### Callback não funciona
→ Verifique se a Anti-Phishing Key está correta no backoffice IfThenPay

### MongoDB não atualiza
→ Verifique se o payment existe no banco antes de simular o callback

---

## 🚀 URLs Importantes

| Recurso | URL |
|---------|-----|
| **Dashboard Vercel** | https://vercel.com/fabio-vasoncelos-projects/menu-digital |
| **Deployment Protection** | [Clique aqui](https://vercel.com/fabio-vasoncelos-projects/menu-digital/settings/deployment-protection) |
| **Backend Railway** | https://backend-production-348d.up.railway.app |
| **MongoDB Atlas** | https://cloud.mongodb.com |

---

**⏱️ TEMPO TOTAL**: 22-47 minutos  
**🎯 PRÓXIMO PASSO**: Escolha Opção 1 ou 2 acima e comece!

---

*Criado por Claude AI via Cursor IDE - Todos os detalhes técnicos em [CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md](./CONFIGURACAO-VERCEL-RAILWAY-COMPLETA.md)*

