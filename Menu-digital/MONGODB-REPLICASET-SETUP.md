# Configuração do MongoDB Replica Set

## Por Que é Necessário?

MongoDB Change Streams (usado para sincronização em tempo real) **REQUER** que o MongoDB esteja em modo Replica Set. 

### Opções:

1. **MongoDB Atlas (Recomendado)** ✅
   - Já vem configurado com Replica Set
   - Não precisa fazer nada
   - Funciona imediatamente

2. **MongoDB Local com Replica Set** 🔧
   - Precisa configurar manualmente
   - Segue guia abaixo

---

## Verificar Se Já Está em Replica Set

```bash
# Conectar ao MongoDB
mongosh

# Executar comando
rs.status()

# Se retornar erro: "no replset config has been received"
# Então precisa configurar Replica Set

# Se retornar objeto com "set", "members", etc
# Então já está configurado! ✅
```

---

## Opção 1: MongoDB Atlas (Mais Fácil) ☁️

### Passos:

1. Ir para https://www.mongodb.com/cloud/atlas
2. Criar conta gratuita
3. Criar cluster gratuito (M0)
4. Aguardar provisionamento (5-10 min)
5. Criar usuário de banco de dados
6. Pegar string de conexão
7. Atualizar `.env` no backend:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/menudigital?retryWrites=true&w=majority
```

✅ **Pronto!** Change Streams já funcionam

---

## Opção 2: MongoDB Local - Replica Set Único Nó

### Para Desenvolvimento Local

#### Windows

1. **Parar MongoDB se estiver rodando**
```cmd
net stop MongoDB
```

2. **Criar diretório para dados**
```cmd
mkdir C:\data\rs0
```

3. **Iniciar MongoDB em modo Replica Set**
```cmd
mongod --replSet rs0 --dbpath C:\data\rs0 --port 27017
```

4. **Em outro terminal, conectar e inicializar**
```cmd
mongosh

# Dentro do mongosh:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" }
  ]
})

# Deve retornar: { ok: 1 }

# Verificar status
rs.status()
```

5. **Atualizar `.env`**
```env
MONGODB_URI=mongodb://localhost:27017/menudigital?replicaSet=rs0
```

---

#### Linux/Mac

1. **Parar MongoDB**
```bash
sudo systemctl stop mongod
# ou
brew services stop mongodb-community
```

2. **Criar diretório para dados**
```bash
mkdir -p ~/data/rs0
```

3. **Iniciar MongoDB em modo Replica Set**
```bash
mongod --replSet rs0 --dbpath ~/data/rs0 --port 27017
```

4. **Em outro terminal, conectar e inicializar**
```bash
mongosh

# Dentro do mongosh:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" }
  ]
})

# Verificar
rs.status()
```

5. **Atualizar `.env`**
```env
MONGODB_URI=mongodb://localhost:27017/menudigital?replicaSet=rs0
```

---

## Opção 3: Docker Compose (Recomendado para Dev)

### docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: menu-digital-mongo
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_DATABASE: menudigital

  mongo-init:
    image: mongo:6
    depends_on:
      - mongodb
    restart: "no"
    entrypoint: >
      bash -c "
        sleep 5 &&
        mongosh --host mongodb:27017 --eval '
          rs.initiate({
            _id: \"rs0\",
            members: [
              { _id: 0, host: \"mongodb:27017\" }
            ]
          })
        '
      "

volumes:
  mongo-data:
```

### Usar:

```bash
# Iniciar
docker-compose up -d

# Aguardar 10 segundos para inicialização

# Verificar logs
docker-compose logs mongodb

# Conectar
mongosh mongodb://localhost:27017/menudigital?replicaSet=rs0
```

### .env
```env
MONGODB_URI=mongodb://localhost:27017/menudigital?replicaSet=rs0
```

---

## Verificar Se Change Streams Funcionam

### Teste Manual:

```javascript
// Conectar ao MongoDB
mongosh mongodb://localhost:27017/menudigital?replicaSet=rs0

// Criar Change Stream
const changeStream = db.orders.watch();

// Listener
changeStream.on('change', (change) => {
  console.log('Change detected:');
  console.log(JSON.stringify(change, null, 2));
});

// Em outro terminal/janela do mongosh:
db.orders.insertOne({
  id: 'test-' + Date.now(),
  status: 'pending',
  items: [],
  createdAt: new Date().toISOString()
});

// No primeiro terminal, deve aparecer o evento!
```

---

## Troubleshooting

### Erro: "The $changeStream stage is only supported on replica sets"

**Causa:** MongoDB não está em modo Replica Set

**Solução:**
- Seguir um dos guias acima para configurar Replica Set
- OU usar MongoDB Atlas

### Erro: "MongoServerError: no replset config has been received"

**Causa:** Replica Set iniciado mas não configurado

**Solução:**
```javascript
mongosh
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})
```

### Erro: "connect ECONNREFUSED"

**Causa:** MongoDB não está rodando

**Solução:**
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# Mac
brew services start mongodb-community

# Docker
docker-compose up -d mongodb
```

### Backend não conecta ao Replica Set

**Verificar:**
1. String de conexão tem `?replicaSet=rs0` no final?
2. MongoDB está rodando em modo Replica Set?
3. Porta 27017 está acessível?

**Teste de conexão:**
```javascript
mongosh "mongodb://localhost:27017/menudigital?replicaSet=rs0"

// Dentro do mongosh:
db.stats()
// Se retornar estatísticas, conexão OK
```

---

## Configuração de Produção (Avançado)

### Replica Set com 3 Nós

Para produção real, recomenda-se pelo menos 3 nós:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1.example.com:27017", priority: 2 },
    { _id: 1, host: "mongo2.example.com:27017", priority: 1 },
    { _id: 2, host: "mongo3.example.com:27017", arbiterOnly: true }
  ]
})
```

**Mas para desenvolvimento, 1 nó é suficiente!**

---

## Migração de MongoDB Standalone para Replica Set

Se você já tem dados em MongoDB standalone:

### 1. Backup
```bash
mongodump --out=/backup/menudigital
```

### 2. Configurar Replica Set
```bash
# Parar MongoDB
# Seguir um dos guias acima para iniciar em modo Replica Set
```

### 3. Restaurar dados
```bash
mongorestore /backup/menudigital
```

### 4. Verificar
```javascript
mongosh
db.orders.countDocuments() // Deve retornar número correto
```

---

## Checklist de Configuração ✓

- [ ] MongoDB rodando em modo Replica Set
- [ ] `rs.status()` retorna sucesso (não erro)
- [ ] String de conexão inclui `?replicaSet=rs0`
- [ ] Backend consegue conectar
- [ ] Backend loga: "MongoDB Change Stream initialized for orders collection"
- [ ] Teste manual de Change Stream funciona
- [ ] Kitchen Dashboard mostra indicador verde "● Tempo real"

---

## Diferenças: Standalone vs Replica Set

| Característica | Standalone | Replica Set |
|---------------|-----------|-------------|
| Change Streams | ❌ Não | ✅ Sim |
| Alta Disponibilidade | ❌ Não | ✅ Sim |
| Configuração | Simples | Média |
| Ideal para | Testes básicos | Desenvolvimento e Produção |

---

## Recomendação Final

**Para este projeto:**

1. **Desenvolvimento Local:** Docker Compose (Opção 3) ⭐
   - Fácil de configurar
   - Fácil de resetar
   - Isolado do sistema

2. **Produção:** MongoDB Atlas (Opção 1) ⭐⭐⭐
   - Gerenciado
   - Backup automático
   - Alta disponibilidade
   - Gratuito até 512MB

3. **Evitar:** Replica Set manual em produção
   - Complexo de manter
   - Requer conhecimento avançado
   - Atlas é gratuito e melhor

---

## Recursos Adicionais

- [MongoDB Replica Set Documentation](https://www.mongodb.com/docs/manual/replication/)
- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [MongoDB Atlas Free Tier](https://www.mongodb.com/cloud/atlas/register)
- [Docker MongoDB Replica Set](https://www.mongodb.com/compatibility/docker)

---

## Suporte

Se continuar com problemas:
1. Verificar versão do MongoDB: `mongod --version` (precisa ser 3.6+)
2. Verificar logs do MongoDB
3. Verificar se porta 27017 está aberta
4. Tentar com MongoDB Atlas (mais simples)

