const mongoose = require('mongoose');
require('dotenv').config();

const Task = require('../models/Task');

const sampleTasks = [
  // Tarefas de Cadastro e Perfil
  {
    title: 'Completar Perfil',
    description: 'Complete suas informações pessoais no perfil',
    type: 'one_time',
    reward: 10,
    requirements: {
      minInvestment: 0,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'verification',
    priority: 1,
    isActive: true
  },
  {
    title: 'Verificar Email',
    description: 'Confirme seu endereço de email',
    type: 'one_time',
    reward: 5,
    requirements: {
      minInvestment: 0,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'verification',
    priority: 2,
    isActive: true
  },
  {
    title: 'Adicionar Telefone',
    description: 'Adicione seu número de telefone para segurança',
    type: 'one_time',
    reward: 8,
    requirements: {
      minInvestment: 0,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'verification',
    priority: 2,
    isActive: true
  },

  // Tarefas de Investimento
  {
    title: 'Primeiro Investimento',
    description: 'Faça seu primeiro investimento na plataforma',
    type: 'one_time',
    reward: 20,
    requirements: {
      minInvestment: 1,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'investment',
    priority: 1,
    isActive: true
  },
  {
    title: 'Investidor Iniciante',
    description: 'Realize 3 investimentos diferentes',
    type: 'one_time',
    reward: 50,
    requirements: {
      minInvestment: 3,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'investment',
    priority: 2,
    isActive: true
  },
  {
    title: 'Diversificar Portfolio',
    description: 'Invista em pelo menos 2 robôs diferentes',
    type: 'one_time',
    reward: 30,
    requirements: {
      minInvestment: 2,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'investment',
    priority: 2,
    isActive: true
  },

  // Tarefas de Indicação
  {
    title: 'Primeira Indicação',
    description: 'Indique um amigo para a plataforma',
    type: 'one_time',
    reward: 25,
    requirements: {
      minInvestment: 0,
      minReferrals: 1,
      minBalance: 0
    },
    category: 'referral',
    priority: 1,
    isActive: true
  },
  {
    title: 'Network Builder',
    description: 'Indique 3 amigos',
    type: 'one_time',
    reward: 75,
    requirements: {
      minInvestment: 0,
      minReferrals: 3,
      minBalance: 0
    },
    category: 'referral',
    priority: 2,
    isActive: true
  },
  {
    title: 'Embaixador',
    description: 'Indique 5 amigos que façam seu primeiro investimento',
    type: 'one_time',
    reward: 150,
    requirements: {
      minInvestment: 0,
      minReferrals: 5,
      minBalance: 0
    },
    category: 'referral',
    priority: 3,
    isActive: true
  },

  // Tarefas de Cashback
  {
    title: 'Primeiro Cashback',
    description: 'Receba seu primeiro pagamento de cashback',
    type: 'one_time',
    reward: 15,
    requirements: {
      minInvestment: 0,
      minReferrals: 0,
      minBalance: 0
    },
    category: 'investment',
    priority: 2,
    isActive: true
  },
  {
    title: 'Acumulador de Cashback',
    description: 'Receba mais de €100 em cashback',
    type: 'one_time',
    reward: 50,
    requirements: {
      minInvestment: 0,
      minReferrals: 0,
      minBalance: 100
    },
    category: 'investment',
    priority: 3,
    isActive: true
  }
];

async function seedTasks() {
  try {
    console.log('🌱 Iniciando seed de tarefas...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    console.log('✅ Conectado ao MongoDB');

    // Limpar tarefas existentes
    await Task.deleteMany({});
    console.log('🧹 Tarefas existentes removidas');

    // Inserir tarefas de exemplo
    const tasks = await Task.insertMany(sampleTasks);
    console.log(`✅ ${tasks.length} tarefas inseridas com sucesso!`);

    // Exibir tarefas inseridas
    console.log('\n📋 Tarefas disponíveis:');
    tasks.forEach(task => {
      console.log(`- ${task.title} (${task.category})`);
      console.log(`  📝 ${task.description}`);
      console.log(`  🎁 Recompensa: €${task.reward}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ Conexão fechada');
    console.log('\n🎉 Seed de tarefas concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedTasks();
}

module.exports = seedTasks;