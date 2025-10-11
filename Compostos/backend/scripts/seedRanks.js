const mongoose = require('mongoose');
const Rank = require('../models/Rank');
require('dotenv').config();

const ranks = [
  {
    name: 'starter',
    level: 1,
    displayName: 'Iniciante',
    color: '#6B7280',
    icon: '🌱',
    requirements: {
      personalInvestment: 100,
      teamInvestment: 0,
      directReferrals: 0,
      teamSize: 0,
      activeTeamMembers: 0,
      monthlyCommission: 0
    },
    benefits: {
      commissionBonus: 0,
      leadershipBonus: 0,
      matchingBonus: 0,
      maxLevels: 5,
      specialAccess: [],
      prioritySupport: false
    }
  },
  {
    name: 'bronze',
    level: 2,
    displayName: 'Bronze',
    color: '#CD7F32',
    icon: '🥉',
    requirements: {
      personalInvestment: 1000,
      teamInvestment: 5000,
      directReferrals: 3,
      teamSize: 10,
      activeTeamMembers: 5,
      monthlyCommission: 100
    },
    benefits: {
      commissionBonus: 5,
      leadershipBonus: 0,
      matchingBonus: 0,
      maxLevels: 5,
      specialAccess: ['basic_training'],
      prioritySupport: false
    }
  },
  {
    name: 'silver',
    level: 3,
    displayName: 'Prata',
    color: '#C0C0C0',
    icon: '🥈',
    requirements: {
      personalInvestment: 5000,
      teamInvestment: 25000,
      directReferrals: 10,
      teamSize: 25,
      activeTeamMembers: 15,
      monthlyCommission: 500
    },
    benefits: {
      commissionBonus: 10,
      leadershipBonus: 2,
      matchingBonus: 5,
      maxLevels: 5,
      specialAccess: ['advanced_training', 'webinars'],
      prioritySupport: true
    }
  },
  {
    name: 'gold',
    level: 4,
    displayName: 'Ouro',
    color: '#FFD700',
    icon: '🥇',
    requirements: {
      personalInvestment: 15000,
      teamInvestment: 100000,
      directReferrals: 25,
      teamSize: 50,
      activeTeamMembers: 30,
      monthlyCommission: 1500
    },
    benefits: {
      commissionBonus: 15,
      leadershipBonus: 5,
      matchingBonus: 8,
      maxLevels: 5,
      specialAccess: ['mastermind_group', 'retreat_invites'],
      prioritySupport: true
    }
  },
  {
    name: 'platinum',
    level: 5,
    displayName: 'Platina',
    color: '#E5E4E2',
    icon: '💎',
    requirements: {
      personalInvestment: 30000,
      teamInvestment: 250000,
      directReferrals: 50,
      teamSize: 100,
      activeTeamMembers: 60,
      monthlyCommission: 3000
    },
    benefits: {
      commissionBonus: 20,
      leadershipBonus: 8,
      matchingBonus: 10,
      maxLevels: 5,
      specialAccess: ['executive_coaching', 'luxury_retreats'],
      prioritySupport: true
    }
  },
  {
    name: 'diamond',
    level: 6,
    displayName: 'Diamante',
    color: '#B9F2FF',
    icon: '✨',
    requirements: {
      personalInvestment: 50000,
      teamInvestment: 500000,
      directReferrals: 100,
      teamSize: 200,
      activeTeamMembers: 100,
      monthlyCommission: 7500
    },
    benefits: {
      commissionBonus: 25,
      leadershipBonus: 12,
      matchingBonus: 15,
      maxLevels: 5,
      specialAccess: ['private_jet_events', 'car_bonus'],
      prioritySupport: true
    }
  },
  {
    name: 'crown',
    level: 7,
    displayName: 'Coroa',
    color: '#FF69B4',
    icon: '👑',
    requirements: {
      personalInvestment: 100000,
      teamInvestment: 1000000,
      directReferrals: 200,
      teamSize: 400,
      activeTeamMembers: 200,
      monthlyCommission: 15000
    },
    benefits: {
      commissionBonus: 30,
      leadershipBonus: 15,
      matchingBonus: 20,
      maxLevels: 5,
      specialAccess: ['house_bonus', 'world_travel'],
      prioritySupport: true
    }
  }
];

async function seedRanks() {
  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    console.log('Conectado à base de dados');

    // Limpar ranks existentes
    await Rank.deleteMany({});
    console.log('Ranks existentes removidos');

    // Inserir novos ranks
    const createdRanks = await Rank.insertMany(ranks);
    console.log(`${createdRanks.length} ranks criados com sucesso!`);

    // Listar ranks criados
    console.log('\nRanks criados:');
    createdRanks.forEach(rank => {
      console.log(`- ${rank.displayName} (Nível ${rank.level})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar ranks:', error);
    process.exit(1);
  }
}

seedRanks();