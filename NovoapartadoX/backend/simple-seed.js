import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function testSeed() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!');
    
    // Testar inserção simples
    const Test = mongoose.model('Test', new mongoose.Schema({
      name: String,
      value: Number
    }));
    
    const testDoc = new Test({ name: 'test', value: 123 });
    await testDoc.save();
    console.log('✅ Documento inserido!');
    
    // Verificar se foi inserido
    const count = await Test.countDocuments();
    console.log(`📊 Total de documentos: ${count}`);
    
    // Limpar
    await Test.deleteMany({});
    console.log('🧹 Documentos limpos!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
  }
}

testSeed();