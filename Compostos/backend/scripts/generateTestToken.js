const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
require('dotenv').config();

async function generateTestToken() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Buscar um usuário existente ou criar um de teste
    let testUser = await User.findOne({ email: 'admin@test.com' });
    
    if (!testUser) {
      console.log('Criando usuário de teste...');
      testUser = new User({
        name: 'Admin Test',
        email: 'admin@test.com',
        phone: '+351912345678', // Telefone português
        password: 'hashedpassword123', // Em produção seria hash real
        role: 'admin',
        isActive: true
      });
      await testUser.save();
      console.log('Usuário de teste criado');
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: testUser._id,
        email: testUser.email,
        role: testUser.role 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('\n=== TOKEN DE TESTE GERADO ===');
    console.log('Token:', token);
    console.log('\nPara usar nas requisições:');
    console.log('Authorization: Bearer', token);
    console.log('\nUsuário:', {
      id: testUser._id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role
    });
    console.log('===============================\n');

    process.exit(0);
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    process.exit(1);
  }
}

generateTestToken();