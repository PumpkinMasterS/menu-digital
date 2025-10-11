# Deploy do site2 em Vercel com domínio web.connectai.pt

Este guia explica como publicar `site2` no Vercel e ligar o domínio `web.connectai.pt`.

## Pré-requisitos
- Conta Vercel ativa e acesso ao projeto (ou Git do repositório).
- Domínio `connectai.pt` configurável (acesso ao DNS / Vercel Domains).
- Vercel CLI instalado: `npm i -g vercel`.

## Passos via CLI
1. Login na Vercel:
   ```
   vercel login
   ```
2. Criar/Ligar projeto apontando para a pasta `site2`:
   ```
   vercel --cwd site2 --confirm
   ```
   - Siga as instruções interativas (framework: "Other", output: `.`).
3. Fazer deploy de produção:
   ```
   vercel --cwd site2 --prod --confirm
   ```
   - Guarde o URL gerado (ex.: `site2-xxxxx.vercel.app`).
4. Adicionar o domínio ao projeto:
   ```
   vercel domains add web.connectai.pt
   ```
   - Se o domínio raiz estiver fora do Vercel, crie o registo CNAME para `web.connectai.pt` apontando para o valor sugerido pela Vercel.
5. Apontar o alias para produção:
   ```
   vercel alias set site2-xxxxx.vercel.app web.connectai.pt
   ```
   - Substitua `site2-xxxxx.vercel.app` pelo URL do passo 3.

## Passos via Dashboard
- Crie um novo projeto em Vercel a partir da pasta `site2`.
- Em Domains, adicione `web.connectai.pt` ao projeto e siga as instruções de DNS.
- Faça o primeiro deploy (Production) e verifique HTTPS ativo.

## Observações
- O `site2/vercel.json` já contém configuração de cache/segurança adequada para estático.
- Commits no repositório poderão acionar novos deploys, conforme a ligação do projeto ao Git.
- Mantenha `site` e `site2` como projetos independentes no monorepo, cada um com seu domínio.
