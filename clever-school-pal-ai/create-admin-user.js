import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

// Criar cliente Supabase com service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Verificando usuário existente...');
    
    // 1. Buscar usuário existente no Supabase Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError.message);
      return;
    }
    
    const existingUser = users.users.find(user => user.email === 'whiswher@gmail.com');
    
    if (!existingUser) {
      console.error('Usuário whiswher@gmail.com não encontrado');
      return;
    }
    
    console.log('Usuário encontrado:', existingUser.id);
    const authData = { user: existingUser };

    // 2. Inserir usuário na tabela admin_users existente
    console.log('Adicionando usuário à tabela admin_users...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: authData.user.id,
        email: 'whiswher@gmail.com',
        name: 'Admin User',
        role: 'super_admin'
      })
      .select();

    if (adminError) {
      console.error('Erro ao inserir na tabela admin_users:', adminError.message);
      return;
    }

    console.log('Usuário adicionado à tabela admin_users:', adminData);
    console.log('\n✅ Usuário admin criado com sucesso!');
    console.log('Email: whiswher@gmail.com');
    console.log('Senha: admin123');
    console.log('Role: super_admin');
    
  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

// Executar função
createAdminUser();