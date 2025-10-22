# Testar Subdomínios Localmente (Menu por mesa)

Este guia explica como simular acessos por subdomínio (ex.: `T01.seu-dominio.com`) em ambiente local para validar a leitura da mesa a partir do hostname.

## Opção 1 — Usar `localtest.me` (recomendado)
`localtest.me` resolve qualquer subdomínio para `127.0.0.1`. Assim, não precisa editar o arquivo `hosts`.

1) Inicie o app Menu em modo dev com host aberto:
- O arquivo `apps/menu/vite.config.ts` já foi ajustado com `server.host = true`.
- Execute: `cd apps/menu && npm run dev`

2) Abra no navegador (note a porta):
- `http://T01.localtest.me:5175/menu`
- `http://T12.localtest.me:5175/menu`

3) A app vai resolver a mesa a partir do subdomínio (`T01`, `T12`, etc.).

4) Em desenvolvimento, mantenha `QR_BASE_HOST` vazio no `backend/.env`, para os QR usarem `BASE_URL` (ex.: `http://localhost:5175/menu?table=T01`).

## Opção 2 — Editar o arquivo hosts (Windows)
Caso prefira domínios customizados, adicione entradas no `hosts` do Windows:

1) Edite como Administrador o arquivo:
- `C:\Windows\System32\drivers\etc\hosts`

2) Adicione linhas específicas para os códigos que pretende testar (wildcards não funcionam no hosts):
```
127.0.0.1   T01.menu.local
127.0.0.1   T02.menu.local
```

3) Abra com a porta do Vite:
- `http://T01.menu.local:5175/menu`

4) Para o backend gerar links de QR com subdomínio (produção), use no `backend/.env`:
```
QR_BASE_HOST=menu.seu-dominio.com
QR_PROTOCOL=https
```
Em desenvolvimento, como as portas são diferentes, prefira deixar `QR_BASE_HOST` em branco e usar `BASE_URL` (para manter o `:5175`).

## Notas Importantes
- O Vite do Menu precisa aceitar hosts customizados (`server.host = true`).
- Para QR em produção: o backend vai gerar `https://T01.seu-dominio.com/menu`. Em DEV, sem proxy reverso/porta 80, use `BASE_URL`.
- Também pode acessar com query string: `http://localhost:5175/menu?table=T01` (ignora subdomínio).