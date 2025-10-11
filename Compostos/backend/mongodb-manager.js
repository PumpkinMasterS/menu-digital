const mongoose = require('mongoose');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configurações padrão
const ENV_FILES = {
  development: '.env.development',
  production: '.env',
  staging: '.env.staging',
  test: '.env.test'
};

// Estrutura de projetos recomendada
const PROJECT_STRUCTURE = {
  databases: {
    development: 'compostos_dev',
    production: 'compostos_prod', 
    staging: 'compostos_staging',
    test: 'compostos_test'
  },
  collections: ['users', 'robots', 'investments', 'tasks', 'profits', 'referrals']
};

class MongoDBManager {
  constructor() {
    this.currentEnv = process.env.NODE_ENV || 'development';
  }

  // Conectar ao MongoDB
  async connect(uri) {
    try {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Conectado ao MongoDB Atlas');
      return true;
    } catch (error) {
      console.error('❌ Erro na conexão com MongoDB:', error.message);
      return false;
    }
  }

  // Criar novo ambiente
  async createEnvironment(envName, mongodbUri) {
    const envFile = ENV_FILES[envName] || `.env.${envName}`;
    
    const envContent = `# Configurações do Servidor - ${envName.toUpperCase()}
PORT=5000
NODE_ENV=${envName}

# MongoDB Atlas - ${envName.toUpperCase()}
MONGODB_URI=${mongodbUri}

# JWT Secret
JWT_SECRET=seu_jwt_secret_super_seguro_${envName}_${Date.now()}
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Configurações específicas do ambiente ${envName}
APP_NAME=Compostos-${envName.toUpperCase()}
`;

    try {
      await fs.writeFile(path.join(__dirname, envFile), envContent);
      console.log(`✅ Ambiente ${envName} criado: ${envFile}`);
      console.log(`📋 URI MongoDB: ${mongodbUri}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar ambiente:', error.message);
      return false;
    }
  }

  // Listar ambientes disponíveis
  async listEnvironments() {
    const files = await fs.readdir(__dirname);
    const envFiles = files.filter(file => file.startsWith('.env'));
    
    console.log('\n🌍 Ambientes disponíveis:');
    envFiles.forEach(file => {
      const envName = file === '.env' ? 'production' : file.replace('.env.', '');
      console.log(`   📁 ${file} -> ${envName}`);
    });
    
    return envFiles;
  }

  // Verificar status da conexão
  async checkConnection() {
    try {
      const state = mongoose.connection.readyState;
      const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      console.log(`🔌 Status da conexão: ${states[state]}`);
      
      if (state === 1) {
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📊 Coleções no database: ${collections.map(c => c.name).join(', ')}`);
      }
      
      return state;
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error.message);
      return 0;
    }
  }

  // Menu interativo
  async showMenu() {
    console.log('\n🚀 MongoDB Atlas Manager - Compostos');
    console.log('=========================================');
    console.log('1️⃣  Criar novo ambiente');
    console.log('2️⃣  Listar ambientes existentes');
    console.log('3️⃣  Verificar conexão atual');
    console.log('4️⃣  Testar conexão com URI');
    console.log('5️⃣  Sair');
    console.log('=========================================');

    const choice = await this.question('Escolha uma opção (1-5): ');
    
    switch (choice) {
      case '1':
        await this.createNewEnvironment();
        break;
      case '2':
        await this.listEnvironments();
        break;
      case '3':
        await this.checkConnection();
        break;
      case '4':
        await this.testConnection();
        break;
      case '5':
        console.log('👋 Até logo!');
        rl.close();
        return;
      default:
        console.log('❌ Opção inválida');
    }

    await this.showMenu();
  }

  async createNewEnvironment() {
    console.log('\n🆕 Criar Novo Ambiente');
    console.log('---------------------');
    
    const envName = await this.question('Nome do ambiente (dev, staging, test): ');
    const mongodbUri = await this.question('URI do MongoDB Atlas: ');
    
    if (!mongodbUri.includes('mongodb+srv://')) {
      console.log('⚠️  A URI deve ser do MongoDB Atlas (mongodb+srv://)');
      return;
    }

    await this.createEnvironment(envName, mongodbUri);
  }

  async testConnection() {
    console.log('\n🧪 Testar Conexão');
    console.log('-----------------');
    
    const testUri = await this.question('URI para testar: ');
    
    if (await this.connect(testUri)) {
      await this.checkConnection();
      await mongoose.disconnect();
    }
  }

  question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
  }
}

// Executar o manager
async function main() {
  const manager = new MongoDBManager();
  
  console.log('🔧 Iniciando MongoDB Atlas Manager...');
  
  // Verificar se .env existe, se não, criar padrão
  try {
    await fs.access(path.join(__dirname, '.env'));
  } catch {
    console.log('⚠️  Arquivo .env não encontrado. Criando padrão...');
    await manager.createEnvironment('production', 'mongodb://localhost:27017/compostos');
  }

  await manager.showMenu();
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MongoDBManager;