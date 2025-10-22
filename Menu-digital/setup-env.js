const fs = require('fs');
const path = require('path');

const envContent = `## MongoDB Atlas
MONGODB_URI=mongodb+srv://SEU_USERNAME:SUA_PASSWORD@cluster.mongodb.net/menu_digital?retryWrites=true&w=majority

# Porta do servidor
PORT=3000

# JWT Secret (troque em produção)
JWT_SECRET=menu_digital_secret_key_2024_change_in_production

# URL base do frontend (para QR codes - fallback DEV)
# Em desenvolvimento, use a porta onde o Menu corre (ex.: 5175)
BASE_URL=http://localhost:5175

# Subdomínio base para QR por mesa (produção)
# Ex.: seu-dominio.com -> QR: T01.seu-dominio.com
# Em DEV normalmente deixe vazio e use BASE_URL
QR_BASE_HOST=

# Protocolo para QR em produção (https recomendado)
QR_PROTOCOL=https


# MB Way (AINDA NÃO IMPLEMENTADO - futuro)
# MBWAY_API_KEY=your_api_key_here
# MBWAY_API_SECRET=your_api_secret_here
# MBWAY_WEBHOOK_SECRET=your_webhook_secret_here
`;

const envPath = path.join(__dirname, 'backend', '.env');

console.log('🔧 Configurando arquivo .env...\n');

if (fs.existsSync(envPath)) {
  console.log('⚠️  Arquivo .env já existe em backend/.env');
  console.log('   Não foi sobrescrito para preservar suas configurações.\n');
  console.log('💡 Para ver o conteúdo recomendado, veja: docs/ENV-CONFIG.md\n');
} else {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env criado em backend/.env\n');
  console.log('📋 Configurações:');
  console.log('   - MongoDB: Atlas (via MONGODB_URI no .env)');
  console.log('   - Login: admin@menu.com / admin123');
  console.log('   - Porta: 3000\n');
  console.log('💡 Para usar MongoDB Atlas, edite backend/.env e troque a string de conexão.\n');
}

console.log('🚀 Próximos passos:');
console.log('   1. cd backend');
console.log('   2. npm install');
console.log('   3. npm run seed');
console.log('   4. npm run dev\n');

