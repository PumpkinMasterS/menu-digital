const mongoose = require('mongoose');
const Commission = require('../models/Commission');
const User = require('../models/User');
require('dotenv').config();

async function generateTestCommissions() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Buscar usuário de teste
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.log('Usuário de teste não encontrado. Execute createTestUser.js primeiro.');
      await mongoose.connection.close();
      return;
    }

    console.log('Usuário encontrado:', testUser.email);

    // Criar algumas comissões de exemplo
    const testCommissions = [
      {
        userId: testUser._id,
        referrerId: testUser._id, // Simulando que o próprio usuário é o referenciador
        level: 1,
        amount: 50.00,
        percentage: 0.10,
        source: 'Investimento Premium',
        sourceType: 'investment',
        sourceId: new mongoose.Types.ObjectId(),
        description: 'Comissão nível 1 - Investimento Premium',
        status: 'approved'
      },
      {
        userId: testUser._id,
        referrerId: testUser._id,
        level: 2,
        amount: 25.00,
        percentage: 0.08,
        source: 'Tarefa Completa',
        sourceType: 'task',
        sourceId: new mongoose.Types.ObjectId(),
        description: 'Comissão nível 2 - Tarefa Completa',
        status: 'pending'
      },
      {
        userId: testUser._id,
        referrerId: testUser._id,
        level: 3,
        amount: 15.00,
        percentage: 0.05,
        source: 'Trade Realizado',
        sourceType: 'trading',
        sourceId: new mongoose.Types.ObjectId(),
        description: 'Comissão nível 3 - Trade Realizado',
        status: 'paid'
      }
    ];

    // Limpar comissões existentes do usuário
    await Commission.deleteMany({ userId: testUser._id });
    console.log('Comissões anteriores removidas');

    // Inserir novas comissões
    const createdCommissions = await Commission.insertMany(testCommissions);
    console.log('Comissões de teste criadas com sucesso:');
    
    createdCommissions.forEach(commission => {
      console.log(`- ${commission.description}: € ${commission.amount.toFixed(2)} (${commission.status})`);
    });

    await mongoose.connection.close();
    console.log('Conexão fechada');

  } catch (error) {
    console.error('Erro ao gerar comissões de teste:', error.message);
    process.exit(1);
  }
}

// Executar a função
if (require.main === module) {
  generateTestCommissions();
}

module.exports = generateTestCommissions;