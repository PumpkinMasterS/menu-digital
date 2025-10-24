# Produção: Links e Deploy

Objetivo
- Registrar estado atual dos endpoints públicos e o que validar antes de alterar produção.

Estado atual (24/10/2025)
- `https://menu-online.site/public/menu/` → 404
- `https://menu-online.site/public/admin/` → 404
- `https://menu-online.site/public/kitchen/` → 404
- Vercel (preview): `https://menu-digital-al22rbqmm-fabio-vasoncelos-projects.vercel.app/public/*` → 200 OK
- Railway backend: `https://backend-production-348d.up.railway.app/public/*` e `/health` → 200 OK

Hipótese raiz
- O domínio `menu-online.site` parece não estar apontando para o projeto Vercel correto (ou está em um projeto sem `rewrites`), dado que preview e backend funcionam.

vercel.json (resumo esperado)
- `rewrites`:
  - `/public/(.*)` → `https://backend-production-348d.up.railway.app/public/$1`
  - `/v1/(.*)` → `https://backend-production-348d.up.railway.app/v1/$1`

Validação local segura
- Rodar `node scripts/preview-server.js` (porta `8080`), que simula as rotas e assets.
- Verifique:
  - `http://localhost:8080/public/menu/`
  - `http://localhost:8080/public/admin/`
  - `http://localhost:8080/public/kitchen/`

Verificações na produção
- Em Vercel → Project Settings → Domains: confirmar que `menu-online.site` está anexado ao projeto correto.
- Conferir `Deployments` e logs de build: garantir que `vercel.json` foi aplicado.
- Testar endpoints tanto no domínio de produção quanto no domínio preview.

Plano de correção
- Reassociar `menu-online.site` ao projeto com `vercel.json` e `rewrites` válidos.
- Se necessário, fazer um redeploy para reaplicar `vercel.json`.
- Confirmar que o backend Railway está acessível a partir da região do Vercel.

Teste rápido (PowerShell)
```
$prod='https://menu-online.site'; $paths=@('/public/menu/','/public/admin/','/public/kitchen/');
foreach($p in $paths){ try{ $r=Invoke-WebRequest -Uri ($prod+$p) -Method Head -UseBasicParsing -TimeoutSec 15; Write-Host "$prod$p -> $($r.StatusCode)" } catch { Write-Host "$prod$p -> ERROR: $($_.Exception.Message)" } }
```

Histórico
- Commit docs: remover backup e adicionar REPO-CANONICO (24/10/2025).