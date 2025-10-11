import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🚀 Iniciando script de seeds...');
console.log('📋 MongoDB URI:', MONGODB_URI ? 'Configurada' : 'Não configurada');

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
      { name: 'Noite Romântica', price: 800, duration: '8 horas' }
    ],
    description: 'Companhia de luxo para eventos sociais e momentos especiais.',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop'
    ],
    verified: true,
    featured: true,
    active: true,
    category: 'acompanhante'
  }
];

// Definir schemas simples
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

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

async function seedDatabase() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado com sucesso!');
    
    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...');
    await User.deleteMany({});
    await Listing.deleteMany({});
    console.log('✅ Dados antigos removidos');
    
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
      const model = createdModels[i];
      
      const listing = new Listing({
        ...listingData,
        userId: model._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await listing.save();
      console.log('✅ Listing criado:', listingData.name);
    }
    
    console.log('\n🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('📊 Resumo:');
    console.log(`   👑 Admin: 1`);
    console.log(`   👥 Modelos: ${createdModels.length}`);
    console.log(`   📋 Listings: ${luxuryListings.length}`);
    
    console.log('\n🔑 Credenciais de acesso:');
    console.log('   Admin: admin@luxoescort.pt / admin123');
    console.log('   Modelos: [email] / model123');
    
  } catch (error) {
    console.error('❌ ERRO durante o seed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar
seedDatabase();