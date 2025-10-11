// Script para criar usuários de teste para cada role
// Execute com: node create-test-users.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando variáveis de ambiente...');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não encontrada');
console.log('SERVICE_KEY:', supabaseServiceKey ? '✅ Definida' : '❌ Não encontrada');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no .env');
  process.exit(1);
}

console.log('🔧 Criando cliente Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
console.log('✅ Cliente Supabase criado com sucesso!');

// Usuários de teste para cada role
const testUsers = [
  {
    email: 'superadmin@escola.com',
    password: 'SuperAdmin123!',
    role: 'super_admin',
    metadata: {
      role: 'super_admin',
      name: 'Super Administrador',
      phone: '+55 11 99999-0001'
    }
  },
  {
    email: 'diretor@escola1.com',
    password: 'Diretor123!',
    role: 'director',
    metadata: {
      role: 'director',
      name: 'João Silva - Diretor',
      phone: '+55 11 99999-0002',
      school_id: 1
    }
  },
  {
    email: 'diretor@escola2.com',
    password: 'Diretor123!',
    role: 'director',
    metadata: {
      role: 'director',
      name: 'Maria Santos - Diretora',
      phone: '+55 11 99999-0003',
      school_id: 2
    }
  },
  {
    email: 'professor1@escola1.com',
    password: 'Professor123!',
    role: 'teacher',
    metadata: {
      role: 'teacher',
      name: 'Carlos Oliveira - Professor',
      phone: '+55 11 99999-0004',
      school_id: 1,
      subjects: ['Matemática', 'Física']
    }
  },
  {
    email: 'professor2@escola1.com',
    password: 'Professor123!',
    role: 'teacher',
    metadata: {
      role: 'teacher',
      name: 'Ana Costa - Professora',
      phone: '+55 11 99999-0005',
      school_id: 1,
      subjects: ['Português', 'História']
    }
  },
  {
    email: 'professor3@escola2.com',
    password: 'Professor123!',
    role: 'teacher',
    metadata: {
      role: 'teacher',
      name: 'Pedro Lima - Professor',
      phone: '+55 11 99999-0006',
      school_id: 2,
      subjects: ['Ciências', 'Geografia']
    }
  },
  {
    email: 'aluno1@escola1.com',
    password: 'Aluno123!',
    role: 'student',
    metadata: {
      role: 'student',
      name: 'Lucas Ferreira - Aluno',
      phone: '+55 11 99999-0007',
      school_id: 1,
      class_id: 1
    }
  },
  {
    email: 'aluno2@escola1.com',
    password: 'Aluno123!',
    role: 'student',
    metadata: {
      role: 'student',
      name: 'Sofia Rodrigues - Aluna',
      phone: '+55 11 99999-0008',
      school_id: 1,
      class_id: 2
    }
  },
  {
    email: 'aluno3@escola2.com',
    password: 'Aluno123!',
    role: 'student',
    metadata: {
      role: 'student',
      name: 'Gabriel Santos - Aluno',
      phone: '+55 11 99999-0009',
      school_id: 2,
      class_id: 3
    }
  }
];

async function createTestUsers() {
  console.log('🚀 Iniciando criação de usuários de teste...');
  
  const results = {
    success: [],
    errors: []
  };

  for (const user of testUsers) {
    try {
      console.log(`\n📝 Criando usuário: ${user.email} (${user.role})`);
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata
      });

      if (authError) {
        console.error(`❌ Erro ao criar usuário ${user.email}:`, authError.message);
        results.errors.push({ email: user.email, error: authError.message });
        continue;
      }

      console.log(`✅ Usuário ${user.email} criado com sucesso`);
      console.log(`   ID: ${authData.user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Metadata:`, JSON.stringify(user.metadata, null, 2));
      
      results.success.push({
        email: user.email,
        id: authData.user.id,
        role: user.role
      });

      // Aguardar um pouco entre criações para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Erro inesperado ao criar usuário ${user.email}:`, error.message);
      results.errors.push({ email: user.email, error: error.message });
    }
  }

  // Resumo final
  console.log('\n📊 RESUMO DA CRIAÇÃO DE USUÁRIOS:');
  console.log(`✅ Sucessos: ${results.success.length}`);
  console.log(`❌ Erros: ${results.errors.length}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ Usuários criados com sucesso:');
    results.success.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    results.errors.forEach(error => {
      console.log(`   - ${error.email}: ${error.error}`);
    });
  }

  console.log('\n🔐 CREDENCIAIS DE ACESSO:');
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });

  return results;
}

// Função para listar usuários existentes
async function listExistingUsers() {
  console.log('\n👥 Listando usuários existentes...');
  
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erro ao listar usuários:', error.message);
      return;
    }

    console.log(`\n📋 Total de usuários: ${users.users.length}`);
    
    if (users.users.length > 0) {
      console.log('\n👤 Usuários encontrados:');
      users.users.forEach(user => {
        const role = user.user_metadata?.role || 'sem role';
        const name = user.user_metadata?.name || 'sem nome';
        console.log(`   - ${user.email} (${role}) - ${name} - ID: ${user.id}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro inesperado ao listar usuários:', error.message);
  }
}

// Executar script
async function main() {
  console.log('🚀 Iniciando script de criação de usuários...');
  try {
    console.log('📋 Listando usuários existentes...');
    await listExistingUsers();
    console.log('👥 Criando usuários de teste...');
    await createTestUsers();
    console.log('\n🎉 Script concluído!');
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Executar main() se este arquivo foi chamado diretamente
if (process.argv[1] && process.argv[1].endsWith('create-test-users.js')) {
  main();
}

export { createTestUsers, listExistingUsers };