import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Modelos
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'model'], required: true },
  avatar: String,
  phone: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const listingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  age: { type: Number, min: 18, max: 99 },
  measurements: {
    height: { type: Number },
    weight: { type: Number },
    bust: { type: Number },
    waist: { type: Number },
    hips: { type: Number }
  },
  services: [{
    name: { type: String, required: true },
    price: { type: Number, min: 0 },
    duration: { type: String }
  }],
  description: { type: String },
  photos: [String],
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  category: { 
    type: String, 
    enum: ['acompanhante', 'massagista', 'dominatrix', 'outro'], 
    default: 'acompanhante' 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Listing = mongoose.model('Listing', listingSchema);

// Dados de teste
const testUsers = [
  {
    name: 'Administrador',
    email: 'admin@luxoescort.com',
    password: 'admin123',
    role: 'admin',
    phone: '+351912345678'
  },
  {
    name: 'Sofia Santos',
    email: 'sofia@luxoescort.com',
    password: 'model123',
    role: 'model',
    phone: '+351923456789'
  },
  {
    name: 'Carolina Silva',
    email: 'carolina@luxoescort.com',
    password: 'model123',
    role: 'model',
    phone: '+351934567890'
  },
  {
    name: 'Beatriz Costa',
    email: 'beatriz@luxoescort.com',
    password: 'model123',
    role: 'model',
    phone: '+351945678901'
  }
];

const testListings = [
  {
    name: 'Sofia - Companhia de Luxo',
    phone: '+351923456789',
    city: 'Lisboa',
    age: 25,
    measurements: {
      height: 170,
      weight: 58,
      bust: 90,
      waist: 60,
      hips: 92
    },
    services: [
      { name: 'Encontro Social', price: 200, duration: '2 horas' },
      { name: 'Noite Completa', price: 800, duration: '8 horas' },
      { name: 'Fim de Semana', price: 2000, duration: '48 horas' }
    ],
    description: 'Elegante e sofisticada, ofereço companhia de luxo para eventos sociais e momentos especiais. Discreta e profissional.',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
    ],
    verified: true,
    featured: true,
    category: 'acompanhante'
  },
  {
    name: 'Carolina - Massagem Relaxante',
    phone: '+351934567890',
    city: 'Porto',
    age: 28,
    measurements: {
      height: 165,
      weight: 55,
      bust: 88,
      waist: 58,
      hips: 90
    },
    services: [
      { name: 'Massagem Relaxante', price: 150, duration: '1 hora' },
      { name: 'Massagem Terapêutica', price: 180, duration: '1.5 horas' },
      { name: 'Pacote Premium', price: 300, duration: '2 horas' }
    ],
    description: 'Especialista em massagens relaxantes e terapêuticas. Ambiente aconchegante e profissional para seu total relaxamento.',
    photos: [
      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400'
    ],
    verified: true,
    category: 'massagista'
  },
  {
    name: 'Beatriz - Dominatrix Experience',
    phone: '+351945678901',
    city: 'Lisboa',
    age: 30,
    measurements: {
      height: 175,
      weight: 62,
      bust: 92,
      waist: 62,
      hips: 95
    },
    services: [
      { name: 'Sessão Básica', price: 250, duration: '1 hora' },
      { name: 'Sessão Premium', price: 400, duration: '2 horas' },
      { name: 'Experiência Completa', price: 600, duration: '3 horas' }
    ],
    description: 'Dominatrix profissional com experiência em BDSM. Sessões personalizadas e discretas para iniciantes e experientes.',
    photos: [
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400'
    ],
    verified: true,
    category: 'dominatrix'
  }
];

async function seedDatabase() {
  try {
    console.log('🔗 Conectando ao MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado com sucesso!');
    
    // Limpar collections existentes
    console.log('🧹 Limpando collections existentes...');
    await User.deleteMany({});
    await Listing.deleteMany({});
    
    // Criar usuários
    console.log('👥 Criando usuários...');
    const createdUsers = [];
    
    for (const userData of testUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`✅ Usuário criado: ${userData.name} (${userData.email})`);
    }
    
    // Criar listings associados aos modelos
    console.log('📋 Criando listings...');
    
    for (let i = 0; i < testListings.length; i++) {
      const listingData = testListings[i];
      const modelUser = createdUsers.find(u => u.email.includes(listingData.name.split(' ')[0].toLowerCase()));
      
      const listing = new Listing({
        ...listingData,
        userId: modelUser ? modelUser._id : null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await listing.save();
      console.log(`✅ Listing criado: ${listingData.name} em ${listingData.city}`);
    }
    
    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   👥 Usuários criados: ${createdUsers.length}`);
    console.log(`   📋 Listings criados: ${testListings.length}`);
    console.log('\n🔑 Credenciais de teste:');
    console.log('   Admin: admin@luxoescort.com / admin123');
    console.log('   Modelos: [nome]@luxoescort.com / model123');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };