import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkExactEmail() {
  console.log('🔍 Verificando emails exatos no sistema...');
  
  try {
    // 1. Listar todos os utilizadores em auth.users
    console.log('\n📋 Utilizadores em auth.users:');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Erro ao listar auth.users:', authError.message);
    } else {
      console.log(`Total: ${authUsers.users.length} utilizadores`);
      authUsers.users.forEach((user, index) => {
        console.log(`${index + 1}. Email: "${user.email}" (ID: ${user.id})`);
        console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`   Criado: ${user.created_at}`);
        console.log(`   Último login: ${user.last_sign_in_at || 'Nunca'}`);
        console.log('---');
      });
    }
    
    // 2. Listar todos os utilizadores em admin_users
    console.log('\n📋 Utilizadores em admin_users:');
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*');
    
    if (adminError) {
      console.log('❌ Erro ao listar admin_users:', adminError.message);
    } else {
      console.log(`Total: ${adminUsers.length} utilizadores`);
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: "${user.email}" (User ID: ${user.user_id})`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Ativo: ${user.is_active}`);
        console.log('---');
      });
    }
    
    // 3. Verificar se há diferenças nos emails
    console.log('\n🔍 Análise de integridade:');
    
    if (authUsers && adminUsers) {
      const authEmails = authUsers.users.map(u => u.email.toLowerCase().trim());
      const adminEmails = adminUsers.map(u => u.email.toLowerCase().trim());
      
      console.log('📊 Emails únicos em auth.users:', [...new Set(authEmails)]);
      console.log('📊 Emails únicos em admin_users:', [...new Set(adminEmails)]);
      
      // Procurar por variações do email whishwher
      const whishwherVariations = [
        'whishwher@gmail.com',
        'whiswher@gmail.com',
        'wishwher@gmail.com',
        'whishwer@gmail.com'
      ];
      
      console.log('\n🔍 Procurando variações do email whishwher:');
      
      whishwherVariations.forEach(variation => {
        const authMatch = authUsers.users.find(u => u.email.toLowerCase() === variation.toLowerCase());
        const adminMatch = adminUsers.find(u => u.email.toLowerCase() === variation.toLowerCase());
        
        if (authMatch || adminMatch) {
          console.log(`✅ Encontrado: ${variation}`);
          if (authMatch) console.log(`   • Em auth.users: ID ${authMatch.id}`);
          if (adminMatch) console.log(`   • Em admin_users: User ID ${adminMatch.user_id}`);
        }
      });
      
      // Se encontrarmos o utilizador correto, vamos resetar a password
      const correctUser = authUsers.users.find(u => 
        whishwherVariations.some(v => v.toLowerCase() === u.email.toLowerCase())
      );
      
      if (correctUser) {
        console.log(`\n🔑 Resetando password para ${correctUser.email}...`);
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          correctUser.id,
          {
            password: 'admin123',
            email_confirmed_at: new Date().toISOString()
          }
        );
        
        if (updateError) {
          console.log('❌ Erro ao resetar password:', updateError.message);
        } else {
          console.log('✅ Password resetada com sucesso!');
          console.log('\n📋 Credenciais de acesso:');
          console.log(`   • Email: ${correctUser.email}`);
          console.log('   • Password: admin123');
          console.log('   • Role: super_admin');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

checkExactEmail();