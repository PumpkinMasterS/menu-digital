const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Diagnóstico da Conexão MongoDB');
console.log('📍 URI:', process.env.MONGODB_URI);
console.log('🌍 Ambiente:', process.env.NODE_ENV);

// Teste 1: Conexão básica
async function testBasicConnection() {
  console.log('\n📋 Teste 1: Conexão Básica');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conexão estabelecida');
    console.log('📊 Estado:', mongoose.connection.readyState);
    console.log('📍 Host:', mongoose.connection.host);
    console.log('🗄️ Porta:', mongoose.connection.port);
    console.log('🗄️ Nome:', mongoose.connection.name);
    
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('📋 Código:', error.code);
    console.error('📋 Nome:', error.name);
    return false;
  }
}

// Teste 2: Verificar estado da conexão
function checkConnectionState() {
  console.log('\n📋 Teste 2: Estado da Conexão');
  const states = {
    0: 'desconectado',
    1: 'conectado',
    2: 'conectando',
    3: 'desconectando'
  };
  
  console.log('📊 Estado atual:', states[mongoose.connection.readyState]);
  console.log('🔗 ReadyState:', mongoose.connection.readyState);
}

// Teste 3: Tentar ping no banco
async function testPing() {
  console.log('\n📋 Teste 3: Ping no Banco');
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Não está conectado para fazer ping');
      return false;
    }
    
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    console.log('✅ Ping bem-sucedido:', result);
    return true;
  } catch (error) {
    console.error('❌ Erro no ping:', error.message);
    return false;
  }
}

// Teste 4: Listar databases
async function testListDatabases() {
  console.log('\n📋 Teste 4: Listar Databases');
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Não está conectado para listar databases');
      return false;
    }
    
    const admin = mongoose.connection.db.admin();
    const result = await admin.listDatabases();
    console.log('✅ Databases encontrados:', result.databases.length);
    result.databases.forEach(db => {
      console.log('  -', db.name, '(size:', db.sizeOnDisk + ')');
    });
    return true;
  } catch (error) {
    console.error('❌ Erro ao listar databases:', error.message);
    return false;
  }
}

// Teste 5: Verificar coleções
async function testCollections() {
  console.log('\n📋 Teste 5: Verificar Coleções');
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Não está conectado para verificar coleções');
      return false;
    }
    
    const collections = await mongoose.connection.db.listCollections();
    console.log('✅ Coleções encontradas:', collections.length);
    collections.forEach(collection => {
      console.log('  -', collection.name, '(type:', collection.type + ')');
    });
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar coleções:', error.message);
    return false;
  }
}

// Teste 6: Inserir documento de teste
async function testInsertDocument() {
  console.log('\n📋 Teste 6: Inserir Documento de Teste');
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Não está conectado para inserir documento');
      return false;
    }
    
    const TestSchema = new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now },
      test: String
    });
    
    const TestModel = mongoose.model('DebugTest', TestSchema);
    
    const doc = new TestModel({ 
      name: 'Debug Test ' + Date.now(),
      test: 'MongoDB Connection Debug'
    });
    
    const saved = await doc.save();
    console.log('✅ Documento inserido:', saved._id);
    
    // Remover documento
    await TestModel.deleteOne({ _id: saved._id });
    console.log('🗑️ Documento removido');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inserir documento:', error.message);
    return false;
  }
}

// Função principal
async function runDiagnostics() {
  console.log('🚀 Iniciando Diagnóstico MongoDB...\n');
  
  const results = {
    basicConnection: false,
    connectionState: false,
    ping: false,
    listDatabases: false,
    collections: false,
    insertDocument: false
  };
  
  results.basicConnection = await testBasicConnection();
  results.connectionState = checkConnectionState();
  
  if (results.basicConnection) {
    results.ping = await testPing();
    results.listDatabases = await testListDatabases();
    results.collections = await testCollections();
    results.insertDocument = await testInsertDocument();
  }
  
  console.log('\n📊 Resultados do Diagnóstico:');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSOU' : 'FALHOU'}`);
  });
  
  // Fechar conexão
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('\n🔌 Conexão fechada');
  }
  
  // Retornar sucesso se todos os testes passaram
  const allPassed = Object.values(results).every(result => result === true);
  console.log(`\n🎯 Diagnóstico Final: ${allPassed ? 'TUDO OK' : 'PROBLEMAS DETECTADOS'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runDiagnostics();

