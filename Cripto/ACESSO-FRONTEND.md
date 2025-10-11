# Guia de Acesso ao Frontend

## Problema

O navegador está recusando a conexão com localhost:5173. Isso geralmente acontece quando:
1. O servidor está rodando apenas em IPv6
2. O firewall está bloqueando a conexão
3. O navegador está tentando acessar via IPv6 mas o servidor só responde em IPv4

## Soluções

### Opção 1: Usar IPv4 explícito

Tente acessar usando o endereço IPv4 explícito:
```
http://127.0.0.1:5173
```

### Opção 2: Usar o IP da máquina

1. Abra o Prompt de Comando como Administrador
2. Execute: `ipconfig`
3. Procure pelo seu endereço IPv4 (geralmente começa com 192.168.x.x)
4. Acesse: `http://SEU_IP:5173`

### Opção 3: Configurar o Vite para usar apenas IPv4

1. Pare o servidor frontend (Ctrl+C no terminal)
2. Edite o arquivo `frontend/vite.config.ts`
3. Adicione a configuração `host: '0.0.0.0'`:

```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0', // Adicione esta linha
    proxy: {
      '/risk': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/metrics': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()]
})
```

4. Reinicie o frontend com: `npm run dev`

### Opção 4: Desativar IPv6 no navegador (Chrome)

1. Abra o Chrome
2. Digite: `chrome://flags/`
3. Procure por: "IPv6"
4. Selecione "Disabled" para "Allow IPv6 to be used on network stack"
5. Reinicie o navegador

### Opção 5: Usar outro navegador

Tente acessar com um navegador diferente:
- Firefox
- Edge
- Opera

## Verificação

Para verificar se o servidor está rodando corretamente:
1. Abra o PowerShell
2. Execute: `curl -UseBasicParsing -Uri http://127.0.0.1:5173`
3. Se retornar HTML, o servidor está funcionando

## Status Atual

✅ Backend: http://localhost:3000 (funcionando)
✅ Frontend: http://127.0.0.1:5173 (funcionando via curl)
❌ Frontend: http://localhost:5173 (problema no navegador)

## Recomendação

Use a Opção 1 e acesse diretamente: **http://127.0.0.1:5173**






