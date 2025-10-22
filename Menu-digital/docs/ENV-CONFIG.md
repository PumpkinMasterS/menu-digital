# 🔧 Configuração do .env

## Copie e cole este conteúdo no arquivo `backend/.env`

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://SEU_USERNAME:SUA_PASSWORD@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority

# Porta do servidor
PORT=3000

# JWT Secret (troque em produção)
JWT_SECRET=menu_digital_secret_key_2024_change_in_production

# URL base do frontend (para QR codes - fallback dev)
BASE_URL=http://localhost:5175

# Subdomínio base para QR por mesa (produção)
# Ex.: seu-dominio.com -> QR: T01.seu-dominio.com
QR_BASE_HOST=

# Protocolo para QR em produção (https recomendado)
QR_PROTOCOL=https


# MB Way (AINDA NÃO IMPLEMENTADO - futuro)
# MBWAY_API_KEY=your_api_key_here
# MBWAY_API_SECRET=your_api_secret_here
# MBWAY_WEBHOOK_SECRET=your_webhook_secret_here
```

## Como usar:

1. Crie o arquivo `backend/.env`
2. Cole o conteúdo acima
3. Use MongoDB Atlas: substitua `SEU_USERNAME` e `SUA_PASSWORD` na connection string

## Para MongoDB Atlas:

1. Acesse https://www.mongodb.com/cloud/atlas
2. Crie conta gratuita
3. Crie cluster M0 (grátis)
4. Database Access → Crie usuário
5. Network Access → Adicione 0.0.0.0/0
6. Connect → Get connection string
7. Substitua na linha do Atlas no .env

