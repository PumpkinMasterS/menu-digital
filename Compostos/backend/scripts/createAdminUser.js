const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function createAdminUser() {
  console.log('👨‍💼 Criando administrador de teste...');
  
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existe um admin com este email
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Administrador já existe:', existingAdmin.email);
      console.log('✅ Login: admin@example.com');
      console.log('✅ Senha: admin123');
      console.log('📝 Nota: O administrador já estava criado');
      return;
    }

    // Criar novo administrador
    const adminData = {
      name: 'Administrador Teste',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      permissions: [
        'users.read', 'users.write', 'users.delete',
        'commissions.read', 'commissions.write',
        'audit.read',
        'settings.read', 'settings.write',
        'reports.read'
      ],
      isActive: true,
      phone: '+5511999999999',
      department: 'Administração'
    };

    const admin = new Admin(adminData);
    await admin.save();

    console.log('✅ Administrador criado com sucesso!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Senha: admin123');
    console.log('🆔 ID:', admin._id);
    console.log('📋 Permissões:', admin.permissions.length, 'permissões concedidas');

  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB fechada');
  }
}

// Executar o script
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;