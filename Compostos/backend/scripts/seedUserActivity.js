const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const ReferralReward = require('../models/ReferralReward');

async function seedUserActivity() {
  console.log('📊 Iniciando seed de atividade do usuário...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
  console.log('✅ Conectado ao MongoDB');

  try {
    // Localizar usuário de teste usado pelo script getToken.js
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      throw new Error('Usuário test@example.com não encontrado. Crie-o antes de semear atividade.');
    }

    const userId = user._id;

    // Janela de datas recentes (últimos 7 dias)
    const today = new Date();
    const daysBack = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    };

    console.log('🧹 Limpando transações e recompensas recentes do usuário para evitar duplicidade...');
    const startWindow = daysBack(10);
    await Transaction.deleteMany({ user: userId, createdAt: { $gte: startWindow } });
    await TaskCompletion.deleteMany({ user: userId, completedAt: { $gte: startWindow } });
    await ReferralReward.deleteMany({ referrerId: userId.toString(), createdAt: { $gte: startWindow } });

    // Criar transações de investimento (débito) e ganhos (crédito)
    const sampleTransactions = [
      // Investimentos (para preencher gráfico de distribuição)
      {
        type: 'investment',
        amount: 500,
        description: 'Investimento no Robô Alpha',
        status: 'completed',
        createdAt: daysBack(7)
      },
      {
        type: 'investment',
        amount: 300,
        description: 'Investimento no Robô Beta',
        status: 'completed',
        createdAt: daysBack(5)
      },
      // Ganhos diários (para preencher gráfico de earnings)
      {
        type: 'earning',
        amount: 25,
        description: 'Lucro diário',
        status: 'completed',
        createdAt: daysBack(6)
      },
      {
        type: 'earning',
        amount: 18,
        description: 'Lucro diário',
        status: 'completed',
        createdAt: daysBack(4)
      },
      {
        type: 'earning',
        amount: 22,
        description: 'Lucro diário',
        status: 'completed',
        createdAt: daysBack(2)
      }
    ].map(tx => ({ ...tx, user: userId }));

    await Transaction.insertMany(sampleTransactions);
    console.log(`💾 ${sampleTransactions.length} transações inseridas`);

    // Criar uma recompensa de tarefa reivindicada
    const anyTask = await Task.findOne({ isActive: true });
    if (anyTask) {
      const tc = new TaskCompletion({
        user: userId,
        task: anyTask._id,
        reward: anyTask.reward || 10,
        status: 'claimed',
        completedAt: daysBack(3),
        data: { verificationType: 'profile' }
      });
      await tc.save();
      console.log('🏆 TaskCompletion claimed inserida');
    } else {
      console.log('ℹ️ Nenhuma Task ativa encontrada para criar TaskCompletion');
    }

    // Criar uma recompensa de referral
    const referral = new ReferralReward({
      referrerId: userId.toString(),
      referredId: userId.toString(), // para fim de demo, usar self; em produção será outro usuário
      level: 'first',
      amount: 12.5,
      description: 'Bônus de indicação nível 1',
      date: daysBack(1),
      isPaid: true,
      paidDate: daysBack(1)
    });
    await referral.save();
    console.log('👥 ReferralReward inserida');

    // Atualizar saldo e totais do usuário para refletir ganhos
    const totalEarnings = sampleTransactions
      .filter(t => t.type === 'earning')
      .reduce((sum, t) => sum + t.amount, 0) + 12.5 + (anyTask ? (anyTask.reward || 10) : 0);

    await User.findByIdAndUpdate(userId, {
      $inc: {
        balance: totalEarnings,
        totalEarned: totalEarnings,
        totalInvested: 800,
      }
    });

    console.log('✅ Seed de atividade concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante seed de atividade:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexão fechada');
  }
}

if (require.main === module) {
  seedUserActivity();
}

module.exports = seedUserActivity;