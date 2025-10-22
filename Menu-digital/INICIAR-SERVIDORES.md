# Como Iniciar os Servidores do Menu Digital

O projeto Menu Digital consiste em 5 componentes principais:

1. **Backend (API)** - Servidor da API na porta 3000
2. **Frontend Principal** - Menu digital para clientes (porta 5173)
3. **Menu App** - Interface alternativa do menu (porta 5175)
4. **Kitchen App** - Interface para a cozinha (porta 5176)
5. **Admin App** - Painel administrativo (porta 5177)

## Método 1: Usando o Script Automático (Recomendado)

1. Execute o arquivo `start-servers.bat` na raiz do projeto
2. O script iniciará automaticamente todos os 5 componentes em janelas separadas
3. Aguarde a conclusão do processo

## Método 2: Manual (em terminais separados)

### Backend (obrigatório)
```bash
cd backend
npm run dev-safe
```

### Frontend Principal
```bash
cd frontend
npm run dev-safe
```

### Menu App
```bash
cd apps/menu
npm run dev
```

### Kitchen App
```bash
cd apps/kitchen
npm run dev
```

### Admin App
```bash
cd apps/admin
npm run dev
```

## URLs de Acesso

- **Backend (API)**: http://localhost:3000
- **Frontend Principal**: http://localhost:5173
- **Menu App**: http://localhost:5175
- **Kitchen App**: http://localhost:5176
- **Admin App**: http://localhost:5177

## Resolução de Problemas

### Se o computador congelar:
1. Pressione Ctrl+Shift+Esc para abrir o Gerenciador de Tarefas
2. Finalize todos os processos "node.exe"
3. Execute o script novamente

### Se as portas estiverem em uso:
1. Verifique quais processos estão usando as portas:
   ```bash
   netstat -ano | findstr :3000  # Backend
   netstat -ano | findstr :5173  # Frontend Principal
   netstat -ano | findstr :5175  # Menu App
   netstat -ano | findstr :5176  # Kitchen App
   netstat -ano | findstr :5177  # Admin App
   ```
2. Finalize os processos se necessário

### Scripts Disponíveis
- `npm run dev`: Script original (pode causar congelamento)
- `npm run dev-safe`: Script seguro (sem respawn automático)

## Observações
- Os scripts `dev-safe` foram criados para evitar o congelamento do sistema
- O backend usa MongoDB Atlas (configurado no .env)
- Todas as aplicações frontend se conectam ao backend na porta 3000
- Use Ctrl+C nas janelas dos servidores para parar quando terminar
