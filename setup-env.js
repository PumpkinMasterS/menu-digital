const fs = require('fs');
const path = require('path');

const envContent = `# MongoDB - Use local ou Atlas (escolha um)
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
  console.log('   - MongoDB: Local (mongodb://localhost:27017/menu_digital)');
  console.log('   - Login: admin@menu.com / admin123');
  console.log('   - Porta: 3000\n');
  console.log('💡 Para usar MongoDB Atlas, edite backend/.env e troque a string de conexão.\n');
}

console.log('🚀 Próximos passos:');
console.log('   1. cd backend');
console.log('   2. npm install');
console.log('   3. npm run seed');
console.log('   4. npm run dev\n');

