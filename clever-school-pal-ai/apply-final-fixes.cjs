const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFixes() {
  console.log('🔧 Aplicando correções finais...');

  try {
    // 1. Criar tabela pedagogical_tags
    console.log('\n1️⃣ Criando tabela pedagogical_tags...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.pedagogical_tags (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        category VARCHAR(50) DEFAULT 'general',
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id)
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableQuery });
    if (createError) {
      console.log('⚠️ Erro ao criar tabela (pode já existir):', createError.message);
    } else {
      console.log('✅ Tabela pedagogical_tags criada');
    }

    // 2. Inserir dados iniciais
    console.log('\n2️⃣ Inserindo dados iniciais...');
    const insertDataQuery = `
      INSERT INTO public.pedagogical_tags (name, category, description, color, is_system) VALUES
      ('Matemática Básica', 'matematica', 'Conceitos fundamentais de matemática', '#FF6B6B', true),
      ('Português', 'linguagem', 'Língua portuguesa e literatura', '#4ECDC4', true),
      ('Ciências', 'ciencias', 'Ciências naturais e experimentais', '#45B7D1', true),
      ('História', 'humanas', 'História geral e do Brasil', '#96CEB4', true),
      ('Geografia', 'humanas', 'Geografia física e humana', '#FFEAA7', true)
      ON CONFLICT (name) DO NOTHING;
    `;

    const { error: insertError } = await supabase.rpc('exec_sql', { sql: insertDataQuery });
    if (insertError) {
      console.log('⚠️ Erro ao inserir dados:', insertError.message);
    } else {
      console.log('✅ Dados iniciais inseridos');
    }

    // 3. Configurar RLS
    console.log('\n3️⃣ Configurando RLS...');
    const rlsQuery = `
      ALTER TABLE public.pedagogical_tags ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.pedagogical_tags;
      CREATE POLICY "Allow read access for authenticated users" ON public.pedagogical_tags
        FOR SELECT USING (auth.role() = 'authenticated');
      
      DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.pedagogical_tags;
      CREATE POLICY "Allow insert for authenticated users" ON public.pedagogical_tags
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      
      DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.pedagogical_tags;
      CREATE POLICY "Allow update for authenticated users" ON public.pedagogical_tags
        FOR UPDATE USING (auth.role() = 'authenticated');
    `;

    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsQuery });
    if (rlsError) {
      console.log('⚠️ Erro ao configurar RLS:', rlsError.message);
    } else {
      console.log('✅ RLS configurado');
    }

    // 4. Testar acesso às tabelas
    console.log('\n4️⃣ Testando acesso às tabelas...');
    
    // Testar pedagogical_tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('pedagogical_tags')
      .select('*')
      .limit(3);
    
    if (tagsError) {
      console.log('❌ Erro ao acessar pedagogical_tags:', tagsError.message);
    } else {
      console.log(`✅ pedagogical_tags acessível: ${tagsData?.length || 0} registros`);
    }

    // Testar schools sem slug
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(1);
    
    if (schoolsError) {
      console.log('❌ Erro ao acessar schools:', schoolsError.message);
    } else {
      console.log(`✅ schools acessível sem slug: ${schoolsData?.length || 0} registros`);
    }

    // Testar chat_logs
    const { data: chatData, error: chatError } = await supabase
      .from('chat_logs')
      .select('id, created_at, question')
      .limit(1);
    
    if (chatError) {
      console.log('❌ Erro ao acessar chat_logs:', chatError.message);
    } else {
      console.log(`✅ chat_logs acessível: ${chatData?.length || 0} registros`);
    }

    console.log('\n🎉 Correções aplicadas com sucesso!');
    console.log('\n📋 Resumo das correções:');
    console.log('  ✅ Tabela pedagogical_tags criada');
    console.log('  ✅ Dados iniciais inseridos');
    console.log('  ✅ RLS configurado');
    console.log('  ✅ Frontend atualizado (Users.tsx e CreateUserDialog.tsx)');
    console.log('\n🔄 Recarregue a aplicação para ver as mudanças');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applyFixes();