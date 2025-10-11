const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin'); // Importar o modelo para registrar o schema

dotenv.config({ path: '.env' });

// Conexão com o MongoDB
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

const fixSuperAdminPassword = async () => {
  await connectDB();
  
  // Verificar se existe um super admin usando o modelo
  let superAdmin = await Admin.findOne({ email: 'super@admin.com' });
  
  if (!superAdmin) {
    console.log('Super Admin não encontrado. Criando um novo...');
    
    // Criar um novo documento Admin diretamente no MongoDB para evitar middleware
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('superadmin123', salt);
    
    const result = await mongoose.connection.collection('admins').insertOne({
      name: 'Super Admin',
      email: 'super@admin.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      permissions: {
        users: { read: true, write: true, delete: true },
        financial: { read: true, write: true, manage_balances: true },
        commissions: { read: true, manage: true },
        settings: { read: true, write: true },
        audit: { read: true }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      loginAttempts: 0
    });
    
    console.log('Super Admin criado com sucesso:', result.insertedId);
    superAdmin = await Admin.findById(result.insertedId);
  } else {
    console.log('Super Admin encontrado. Atualizando senha...');
    
    // Gerar hash da senha
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('superadmin123', salt);
    
    // Atualizar diretamente na coleção para evitar middleware de hash
    const result = await mongoose.connection.collection('admins').updateOne(
      { _id: superAdmin._id },
      { 
        $set: { 
          password: hashedPassword,
          loginAttempts: 0,
          lockUntil: null,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('Senha do Super Admin atualizada com sucesso:', result.modifiedCount);
    superAdmin = await Admin.findById(superAdmin._id);
  }
  
  // Verificar se a senha foi salva corretamente
  const updatedAdmin = await Admin.findOne({ email: 'super@admin.com' }).select('+password');
  if (updatedAdmin) {
    console.log('Admin ID:', updatedAdmin._id);
    console.log('Hash da senha salva:', updatedAdmin.password);
    
    // Testar a senha
    const isMatch = await bcrypt.compare('superadmin123', updatedAdmin.password);
    console.log('Teste de senha:', isMatch ? 'SUCESSO' : 'FALHA');
  }
  
  process.exit(0);
};

fixSuperAdminPassword();