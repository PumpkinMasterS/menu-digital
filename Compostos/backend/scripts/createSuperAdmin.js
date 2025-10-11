const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: '.env' });

const Admin = require('../models/Admin');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const createSuperAdmin = async () => {
  await connectDB();

  // Verificar se já existe um admin com este email
  const existingAdmin = await Admin.findOne({ email: 'super@admin.com' });
  
  if (existingAdmin) {
    console.log('Removendo super admin existente para criar um novo...');
    await Admin.deleteOne({ email: 'super@admin.com' });
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('superadmin123', salt);

  const admin = new Admin({
    name: 'Super Admin',
    email: 'super@admin.com',
    password: hashedPassword, // Não será hasheado novamente devido ao middleware pre-save
    role: 'super_admin',
    isActive: true
  });

  await admin.save();
  console.log('Super Admin criado com sucesso:');
  console.log('Email: super@admin.com');
  console.log('Senha: superadmin123');
  console.log('Role: super_admin');
  
  // Verificar se foi salvo corretamente
  const savedAdmin = await Admin.findOne({ email: 'super@admin.com' }).select('+password');
  if (savedAdmin) {
    console.log('Admin salvo no banco de dados com ID:', savedAdmin._id);
    console.log('Hash da senha salva:', savedAdmin.password);
  }
  
  process.exit(0);
};

createSuperAdmin();