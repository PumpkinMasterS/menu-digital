# 🔧 Configuração do .env

## Copie e cole este conteúdo no arquivo `backend/.env`

```env
# MongoDB - Use local ou Atlas (escolha um)
# Local MongoDB (RECOMENDADO PARA INICIAR):
MONGODB_URI=mongodb://localhost:27017/menu_digital

# MongoDB Atlas (comente a linha acima e use esta):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority

# Porta do servidor
PORT=3000

# JWT Secret (troque em produção)
JWT_SECRET=menu_digital_secret_key_2024_change_in_production

# URL base do frontend (para QR codes)
BASE_URL=http://localhost:5175

# Login de desenvolvimento (funciona sem DB)
DEV_LOGIN_EMAIL=admin@menu.com
DEV_LOGIN_PASSWORD=admin123
DEV_LOGIN_ROLES=admin,staff

# MB Way (AINDA NÃO IMPLEMENTADO - futuro)
# MBWAY_API_KEY=your_api_key_here
# MBWAY_API_SECRET=your_api_secret_here
# MBWAY_WEBHOOK_SECRET=your_webhook_secret_here
```

## Como usar:

1. Crie o arquivo `backend/.env`
2. Cole o conteúdo acima
3. Se usar MongoDB local, deixe como está
4. Se usar MongoDB Atlas, comente a linha local e descomente a do Atlas, substituindo username e password

## Para MongoDB Atlas:

1. Acesse https://www.mongodb.com/cloud/atlas
2. Crie conta gratuita
3. Crie cluster M0 (grátis)
4. Database Access → Crie usuário
5. Network Access → Adicione 0.0.0.0/0
6. Connect → Get connection string
7. Substitua na linha do Atlas no .env

