const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Testando conexão com MongoDB Atlas...');
console.log('📍 URI:', MONGODB_URI);

async function testMongoConnection() {
  try {
    // Conectar ao MongoDB Atlas
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conexão com MongoDB Atlas estabelecida com sucesso!');
    
    // Testar listagem de databases
    const admin = mongoose.connection.db.admin();
    const databases = await admin.listDatabases();
    
    console.log('📊 Databases disponíveis:');
    databases.databases.forEach(db => {
      console.log('  -', db.name);
    });
    
    // Testar listagem de coleções
    const collections = await mongoose.connection.db.listCollections();
    
    console.log('📁 Coleções no database compostos:');
    collections.forEach(collection => {
      console.log('  -', collection.name);
    });
    
    // Testar inserção de um documento de teste
    const TestSchema = new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('Test', TestSchema);
    
    const testDoc = new TestModel({ name: 'Teste de Conexão' });
    await testDoc.save();
    
    console.log('📝 Documento de teste inserido com sucesso!');
    
    // Limpar documento de teste
    await TestModel.deleteOne({ name: 'Teste de Conexão' });
    console.log('🗑️ Documento de teste removido!');
    
    console.log('🎉 Todos os testes de conexão passaram!');
    
  } catch (error) {
    console.error('❌ Erro na conexão com MongoDB Atlas:', error.message);
    console.error('📋 Detalhes do erro:', error);
    process.exit(1);
  } finally {
    // Fechar conexão
    await mongoose.disconnect();
    console.log('🔌 Conexão fechada');
    process.exit(0);
  }
}

testMongoConnection();

