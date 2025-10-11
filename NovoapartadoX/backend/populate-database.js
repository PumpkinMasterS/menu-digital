import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Dados realistas para o site de acompanhantes de luxo
const luxuryModels = [
  {
    name: 'Sofia Carvalho',
    email: 'sofia.carvalho@luxoescort.pt',
    password: 'model123',
    role: 'model',
    phone: '+351912345678',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Carolina Mendes',
    email: 'carolina.mendes@luxoescort.pt', 
    password: 'model123',
    role: 'model',
    phone: '+351923456789',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Beatriz Santos',
    email: 'beatriz.santos@luxoescort.pt',
    password: 'model123',
    role: 'model',
    phone: '+351934567890',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Inês Oliveira',
    email: 'ines.oliveira@luxoescort.pt',
    password: 'model123',
    role: 'model',
    phone: '+351945678901',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Maria Rodrigues',
    email: 'maria.rodrigues@luxoescort.pt',
    password: 'model123',
    role: 'model',
    phone: '+351956789012',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face'
  }
];

const adminUser = {
  name: 'Administrador',
  email: 'admin@luxoescort.pt',
  password: 'admin123',
  role: 'admin',
  phone: '+351900000000',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face'
};

const luxuryListings = [
  {
    name: 'Sofia - Elegância e Sofisticação',
    phone: '+351912345678',
    city: 'Lisboa',
    age: 26,
    measurements: {
      height: 172,
      weight: 58,
      bust: 92,
      waist: 62,
      hips: 94
    },
    services: [
      { name: 'Jantar de Gala', price: 300, duration: '3 horas' },
      { name: 'Noite Romântica', price: 800, duration: '8 horas' },
      { name: 'Weekend Premium', price: 2000, duration: '48 horas' }
    ],
    description: 'Companhia de luxo para eventos sociais e momentos especiais. Elegante, discreta e com excelente conversação. Fluente em inglês, francês e português.',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop'
    ],
    verified: true,
    featured: true,
    active: true,
    category: 'acompanhante'
  },
  {
    name: 'Carolina - Massagem Premium',
    phone: '+351923456789',
    city: 'Porto',
    age: 28,
    measurements: {
      height: 168,
      weight: 56,
      bust: 90,
      waist: 60,
      hips: 92
    },
    services: [
      { name: 'Massagem Relaxante', price: 150, duration: '1 hora' },
      { name: 'Massagem Terapêutica', price: 200, duration: '1.5 horas' },
      { name: 'Pacote Luxo', price: 350, duration: '2.5 horas' }
    ],
    description: 'Especialista em massagens relaxantes com óleos essenciais premium. Ambiente luxury com música relaxante e aromaterapia. Formação em técnicas orientais.',
    photos: [
      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=800&fit=crop'
    ],
    verified: true,
    featured: false,
    active: true,
    category: 'massagista'
  },
  {
    name: 'Beatriz - Experiência Exclusive',
    phone: '+351934567890',
    city: 'Lisboa',
    age: 31,
    measurements: {
      height: 175,
      weight: 63,
      bust: 94,
      waist: 64,
      hips: 96
    },
    services: [
      { name: 'Sessão VIP', price: 400, duration: '2 horas' },
      { name: 'Experiência Premium', price: 700, duration: '4 horas' },
      { name: 'Noite Exclusive', price: 1200, duration: '12 horas' }
    ],
    description: 'Companhia de alto nível para clientes exigentes. Experiência personalizada com foco em sofisticação e discrição. Disponível para viagens nacionais.',
    photos: [
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=600&h=800&fit=crop'
    ],
    verified: true,
    featured: true,
    active: true,
    category: 'acompanhante'
  },
  {
    name: 'Inês - Relaxamento Total',
    phone: '+351945678901',
    city: 'Faro',
    age: 24,
    measurements: {
      height: 165,
      weight: 52,
      bust: 86,
      waist: 58,
      hips: 88
    },
    services: [
      { name: 'Massagem Relaxante', price: 120, duration: '1 hora' },
      { name: 'Tratamento Completo', price: 220, duration: '2 horas' },
      { name: 'Dia de Spa', price: 450, duration: '5 horas' }
    ],
    description: 'Especialista em técnicas de relaxamento profundo. Ambiente acolhedor no Algarve com vista para o mar. Utilizo produtos orgânicos e naturais.',
    photos: [
      'https://images.unsplash.com/photo-1596079890744-c1a4392a9ac5?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=800&fit=crop'
    ],
    verified: true,
    featured: false,
    active: true,
    category: 'massagista'
  },
  {
    name: 'Maria - Elegância Clássica',
    phone: '+351956789012',
    city: 'Lisboa',
    age: 29,
    measurements: {
      height: 170,
      weight: 59,
      bust: 91,
      waist: 61,
      hips: 93
    },
    services: [
      { name: 'Encontro Social', price: 250, duration: '3 horas' },
      { name: 'Jantar Executivo', price: 350, duration: '4 horas' },
      { name: 'Weekend Cultural', price: 1800, duration: '48 horas' }
    ],
    description: 'Companhia ideal para eventos corporativos e culturais. Conhecedora de arte, vinhos e gastronomia. Perfeita para compromissos empresariais.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop'
    ],
    verified: true,
    featured: true,
    active: true,
    category: 'acompanhante'
  }
];

async function populateDatabase() {
  try {
    console.log('🔗 Conectando ao MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado com sucesso!');
    
    // Obter referências às coleções existentes
    const User = mongoose.model('User');
    const Listing = mongoose.model('Listing');
    
    // Limpar dados existentes (opcional - comentado para segurança)
    // console.log('🧹 Limpando dados existentes...');
    // await User.deleteMany({});
    // await Listing.deleteMany({});
    
    // Criar admin
    console.log('👑 Criando usuário admin...');
    const adminPasswordHash = await bcrypt.hash(adminUser.password, 10);
    const admin = new User({
      ...adminUser,
      passwordHash: adminPasswordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await admin.save();
    console.log('✅ Admin criado:', adminUser.email);
    
    // Criar modelos
    console.log('👥 Criando modelos...');
    const createdModels = [];
    
    for (const modelData of luxuryModels) {
      const passwordHash = await bcrypt.hash(modelData.password, 10);
      const model = new User({
        ...modelData,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const savedModel = await model.save();
      createdModels.push(savedModel);
      console.log('✅ Modelo criado:', modelData.email);
    }
    
    // Criar listings
    console.log('📋 Criando listings...');
    
    for (let i = 0; i < luxuryListings.length; i++) {
      const listingData = luxuryListings[i];
      const model = createdModels[i]; // Associar cada listing a um modelo
      
      const listing = new Listing({
        ...listingData,
        userId: model._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await listing.save();
      console.log('✅ Listing criado:', listingData.name);
    }
    
    console.log('\n🎉 Base de dados populada com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   👑 Admin: 1`);
    console.log(`   👥 Modelos: ${createdModels.length}`);
    console.log(`   📋 Listings: ${luxuryListings.length}`);
    
    console.log('\n🔑 Credenciais de acesso:');
    console.log('   Admin: admin@luxoescort.pt / admin123');
    console.log('   Modelos: [email] / model123');
    
    console.log('\n🌐 URLs das imagens:');
    console.log('   Todas as imagens são do Unsplash e estão disponíveis publicamente');
    
  } catch (error) {
    console.error('❌ Erro durante a população:', error.message);
    if (error.code === 11000) {
      console.log('💡 Dica: Alguns dados já existem. Execute novamente para atualizar ou limpe primeiro.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  populateDatabase();
}

export { populateDatabase };