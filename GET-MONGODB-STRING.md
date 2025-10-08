# 🔗 Como Obter a Connection String do MongoDB Atlas

## Passo a Passo (2 minutos)

### 1. Acesse MongoDB Atlas
Vá para: https://cloud.mongodb.com

### 2. Faça Login
Use suas credenciais do MongoDB Atlas

### 3. Selecione seu Cluster
- Você verá uma lista de clusters
- Clique no cluster que está usando para este projeto

### 4. Clique em "Connect"
- Procure o botão verde "Connect"
- Clique nele

### 5. Escolha "Drivers"
- Clique em "Connect your application"
- Ou "Drivers" se aparecer

### 6. Configure as Opções
- **Driver:** Node.js
- **Version:** 5.5 or later (ou a mais recente)

### 7. Copie a Connection String
Você verá algo assim:
```
mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 8. Substitua os Valores

**Original:**
```
mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Modificado:**
```
mongodb+srv://MEU_USERNAME:MINHA_SENHA@cluster0.xxxxx.mongodb.net/menu_digital?retryWrites=true&w=majority
```

**IMPORTANTE:**
- Substitua `username` pelo seu username real
- Substitua `<password>` pela sua senha real (sem os `<>`)
- Adicione `/menu_digital` antes do `?` para especificar o database

---

## 📝 Exemplo Completo

Se seu username é `joao` e sua senha é `senha123`, ficaria:

```
mongodb+srv://joao:senha123@cluster0.abc123.mongodb.net/menu_digital?retryWrites=true&w=majority
```

---

## ⚠️ Problemas Comuns

### 1. Senha com caracteres especiais
Se sua senha tem `@`, `$`, `#`, etc, precisa fazer URL encoding:
- `@` → `%40`
- `$` → `%24`
- `#` → `%23`

Exemplo:
- Senha: `senha@123`
- Na string: `senha%40123`

### 2. IP não autorizado
Se der erro de conexão:
1. Vá em "Network Access" no MongoDB Atlas
2. Clique em "Add IP Address"
3. Adicione `0.0.0.0/0` (permite todos - só para desenvolvimento)
4. Ou adicione seu IP específico

### 3. Usuário sem permissão
1. Vá em "Database Access"
2. Verifique se seu usuário tem permissão "Read and write to any database"

---

## 🧪 Testar Connection String

Depois de copiar para o `.env`, teste:

```bash
cd backend
npm run dev
```

Se conectar, você verá:
```
API listening on http://localhost:3000
```

Se der erro:
```
MongoDB connection failed
```

**Solução:** Reveja os passos acima!

---

## 💡 Dica Rápida

Se não conseguir a string, o MCP já está conectado! Isso significa que:
- Seu MongoDB Atlas está funcionando
- A connection string está configurada no MCP
- Só precisa copiá-la para o backend/.env

Para ver a string do MCP, procure nas configurações do Cursor em:
**Settings → MCP → MongoDB**

---

## 🆘 Ainda com Dúvida?

Veja este vídeo tutorial (3 minutos):
https://www.youtube.com/watch?v=rPqRyYJmx2g

Ou use MongoDB local:
```env
MONGODB_URI=mongodb://localhost:27017/menu_digital
```


