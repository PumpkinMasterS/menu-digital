const fs = require('fs').promises;
const path = require('path');

// Mapeamento de ambientes para arquivos
const ENV_MAP = {
  dev: '.env.development',
  development: '.env.development',
  prod: '.env',
  production: '.env',
  staging: '.env.staging',
  test: '.env.test'
};

async function switchEnvironment(envName) {
  const targetFile = ENV_MAP[envName.toLowerCase()];
  
  if (!targetFile) {
    console.error(`❌ Ambiente "${envName}" não reconhecido. Use: dev, prod, staging, test`);
    return false;
  }

  try {
    // Verificar se o arquivo de destino existe
    await fs.access(path.join(__dirname, '..', targetFile));
    
    // Ler o conteúdo do arquivo de destino
    const envContent = await fs.readFile(path.join(__dirname, '..', targetFile), 'utf8');
    
    // Escrever no arquivo .env principal
    await fs.writeFile(path.join(__dirname, '..', '.env'), envContent);
    
    console.log(`✅ Ambiente alterado para: ${envName}`);
    console.log(`📁 Usando configurações de: ${targetFile}`);
    
    // Mostrar algumas informações do ambiente
    const lines = envContent.split('\n');
    const nodeEnv = lines.find(line => line.startsWith('NODE_ENV='));
    const mongoUri = lines.find(line => line.startsWith('MONGODB_URI='));
    
    if (nodeEnv) console.log(`🌍 ${nodeEnv}`);
    if (mongoUri) {
      const maskedUri = mongoUri.replace(/:[^:]*@/, ':****@');
      console.log(`🗄️  ${maskedUri}`);
    }
    
    return true;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Arquivo ${targetFile} não encontrado. Execute primeiro:');
      console.error(`   node mongodb-manager.js -> Criar novo ambiente`);
    } else {
      console.error('❌ Erro ao alterar ambiente:', error.message);
    }
    return false;
  }
}

// Execução via linha de comando
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 Uso: node scripts/switch-env.js [dev|prod|staging|test]');
    console.log('');
    console.log('Exemplos:');
    console.log('  node scripts/switch-env.js dev     -> Usa .env.development');
    console.log('  node scripts/switch-env.js prod    -> Usa .env (produção)');
    console.log('  node scripts/switch-env.js staging -> Usa .env.staging');
    console.log('  node scripts/switch-env.js test    -> Usa .env.test');
    return;
  }
  
  const envName = args[0];
  await switchEnvironment(envName);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { switchEnvironment };