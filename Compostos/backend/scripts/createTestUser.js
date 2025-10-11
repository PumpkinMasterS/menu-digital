const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar o modelo User
const User = require('../models/User');

async function createTestUser() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Verificar se já existe um usuário com este email
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Usuário de teste já existe:', existingUser.email);
      await mongoose.connection.close();
      return;
    }

    // Criar usuário de teste
    const testUser = await User.create({
      name: 'Usuário Teste',
      email: 'test@example.com',
      password: '123456', // Será hasheado automaticamente
      phone: '+5511999999999',
      balance: 1000,
      totalInvested: 0,
      totalEarned: 0
    });

    console.log('Usuário de teste criado com sucesso:');
    console.log('Email:', testUser.email);
    console.log('Senha: 123456');
    console.log('Saldo inicial: € 1000,00');

    await mongoose.connection.close();
    console.log('Conexão fechada');

  } catch (error) {
    console.error('Erro ao criar usuário de teste:', error.message);
    process.exit(1);
  }
}

// Executar a função
createTestUser();