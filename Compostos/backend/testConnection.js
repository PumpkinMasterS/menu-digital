const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('Tentando conectar ao MongoDB...');
        
        // Carregar variáveis de ambiente
        require('dotenv').config();
        
        // Verificar variáveis de ambiente
        const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/composto';
        console.log('URI do MongoDB:', mongoUri.replace(/:[^:]*@/, ':********@')); // Ocultar senha no log
        
        // Tentar conexão
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
        });
        
        console.log('✅ Conexão com MongoDB estabelecida com sucesso!');
        
        // Verificar se há usuários na base
        const User = require('./models/User');
        const userCount = await User.countDocuments();
        console.log(`📊 Total de usuários na base: ${userCount}`);
        
        if (userCount > 0) {
            const sampleUser = await User.findOne();
            console.log('👤 Usuário de exemplo:', {
                id: sampleUser._id,
                name: sampleUser.name,
                email: sampleUser.email,
                referralCode: sampleUser.referralCode
            });
        }
        
        await mongoose.disconnect();
        console.log('Conexão fechada.');
        
    } catch (error) {
        console.error('❌ Erro ao conectar com MongoDB:', error.message);
        console.error('Detalhes do erro:', error);
        
        if (error.name === 'MongoServerSelectionError') {
            console.log('\n💡 Possíveis soluções:');
            console.log('1. Verifique se o MongoDB está instalado');
            console.log('2. Inicie o serviço MongoDB: mongod');
            console.log('3. Verifique se a porta 27017 está liberada');
            console.log('4. Confirme a URI de conexão:', process.env.MONGODB_URI || 'mongodb://localhost:27017/composto');
        }
    }
}

testConnection();