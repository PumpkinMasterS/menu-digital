# Fluxo de QR Codes

## Objetivo
- Identificar mesa e restaurante automaticamente ao escanear o QR.

## Estrutura de URL
- `https://menu.digital/{restaurantSlug}/t/{tableCode}`
- Parâmetros opcionais: `?v={qrVersion}` para rotação/expiração.

## Geração
- Admin cria mesas (`tableCode`) e o sistema gera QR (SVG/PNG) com URL.
- Exportação em PDF/A4 com múltiplos QRs, e em etiquetas individuais.

## Validação
- API valida `restaurantSlug` e `tableCode`; se inválido, mostra página de erro.
- Cria `tableSessionId` e associa ao pedido/carrinho.

## Rotação e Segurança
- `qrVersion` incrementa quando se deseja invalidar QRs antigos.
- Opcional: token curto assinado (HMAC) incorporado no URL, com expiração.

## Fallback
- Se QR não funcionar, permitir seleção manual de mesa com código curto.

## Impressão e Materiais
- Recomendar material resistente (PVC/plexiglass), com instruções simples.
- Incluir branding, ícone de QR e URL curto (`menu.digital`).