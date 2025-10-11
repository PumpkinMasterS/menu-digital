const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const LeadershipBonus = require('./models/LeadershipBonus');
const User = require('./models/User');

async function createTestBonuses() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    console.log('✅ Conectado ao MongoDB');

    // Buscar usuários existentes
    const users = await User.find().limit(4);
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado. Criando usuários de teste...');
      
      // Criar usuários de teste se não existirem
      const testUsers = [
        { name: 'João Silva', email: 'joao@email.com', phone: '11999999999' },
        { name: 'Maria Santos', email: 'maria@email.com', phone: '11888888888' },
        { name: 'Pedro Costa', email: 'pedro@email.com', phone: '11777777777' },
        { name: 'Ana Oliveira', email: 'ana@email.com', phone: '11666666666' }
      ];

      const createdUsers = await User.insertMany(testUsers);
      users.push(...createdUsers);
      console.log('✅ Usuários de teste criados');
    }

    console.log(`📊 ${users.length} usuários encontrados`);

    // Dados de bônus de teste
    const testBonuses = [
      {
        userId: users[0]._id,
        amount: 1500.00,
        period: '2024-01',
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-01-31'),
        status: 'pending',
        description: 'Bônus de liderança - Rede nível 1',
        percentage: 15.0,
        bonusType: 'leadership',
        rankName: 'Líder',
        rankLevel: 1
      },
      {
        userId: users[1]._id,
        amount: 2750.50,
        period: '2024-01',
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-01-31'),
        status: 'pending',
        description: 'Bônus de liderança - Rede nível 2',
        percentage: 12.5,
        bonusType: 'leadership',
        rankName: 'Supervisor',
        rankLevel: 2
      },
      {
        userId: users[2]._id,
        amount: 4200.75,
        period: '2024-01',
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-01-31'),
        status: 'approved',
        approvedBy: users[3]._id,
        approvedAt: new Date(),
        description: 'Bônus de liderança - Rede nível 3',
        percentage: 10.0,
        bonusType: 'leadership',
        rankName: 'Gerente',
        rankLevel: 3
      },
      {
        userId: users[3]._id,
        amount: 1800.25,
        period: '2024-01',
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-01-31'),
        status: 'rejected',
        rejectedBy: users[0]._id,
        rejectedAt: new Date(),
        rejectionReason: 'Documentação incompleta',
        description: 'Bônus de liderança - Rede nível 1',
        percentage: 15.0,
        bonusType: 'leadership',
        rankName: 'Líder',
        rankLevel: 1
      },
      {
        userId: users[0]._id,
        amount: 3100.00,
        period: '2023-12',
        periodStartDate: new Date('2023-12-01'),
        periodEndDate: new Date('2023-12-31'),
        status: 'approved',
        approvedBy: users[1]._id,
        approvedAt: new Date(Date.now() - 86400000), // 1 dia atrás
        description: 'Bônus de liderança - Rede nível 2',
        percentage: 12.5,
        bonusType: 'leadership',
        rankName: 'Supervisor',
        rankLevel: 2
      }
    ];

    // Limpar bônus existentes (opcional)
    await LeadershipBonus.deleteMany({});
    console.log('🧹 Bônus antigos removidos');

    // Inserir bônus de teste
    const createdBonuses = await LeadershipBonus.insertMany(testBonuses);
    console.log(`✅ ${createdBonuses.length} bônus de teste criados:`);

    createdBonuses.forEach((bonus, index) => {
      console.log(`   ${index + 1}. ${bonus.amount.toFixed(2)} - ${bonus.status} - ${bonus.period}`);
    });

    // Verificar estatísticas
    const stats = await LeadershipBonus.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    console.log('\n📈 Estatísticas dos bônus:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} bônus, € ${stat.totalAmount.toFixed(2)}`);
    });

    console.log('\n🎯 Dados de teste criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB fechada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestBonuses();
}

module.exports = createTestBonuses;