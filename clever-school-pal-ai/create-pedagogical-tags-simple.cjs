const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPedagogicalTags() {
  console.log('🏷️ Criando tabela pedagogical_tags via inserção direta...');

  try {
    // Primeiro, tentar inserir dados para verificar se a tabela existe
    console.log('\n1️⃣ Testando se a tabela pedagogical_tags existe...');
    const { data: testData, error: testError } = await supabase
      .from('pedagogical_tags')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('❌ Tabela pedagogical_tags não existe');
      console.log('\n📋 Para criar a tabela, execute este SQL no Supabase Dashboard:');
      console.log('\n' + '='.repeat(60));
      console.log(`
-- 1. Criar tabela pedagogical_tags
CREATE TABLE IF NOT EXISTS public.pedagogical_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  category VARCHAR(50) DEFAULT 'general',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_category ON public.pedagogical_tags(category);
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_name ON public.pedagogical_tags(name);

-- 3. Configurar RLS
ALTER TABLE public.pedagogical_tags ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "Allow read access for authenticated users" ON public.pedagogical_tags
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON public.pedagogical_tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON public.pedagogical_tags
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON public.pedagogical_tags
  FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Inserir dados iniciais
INSERT INTO public.pedagogical_tags (name, category, description, color, is_system) VALUES
('Matemática Básica', 'matematica', 'Conceitos fundamentais de matemática', '#FF6B6B', true),
('Português', 'linguagem', 'Língua portuguesa e literatura', '#4ECDC4', true),
('Ciências', 'ciencias', 'Ciências naturais e experimentais', '#45B7D1', true),
('História', 'humanas', 'História geral e do Brasil', '#96CEB4', true),
('Geografia', 'humanas', 'Geografia física e humana', '#FFEAA7', true),
('Inglês', 'linguagem', 'Língua inglesa', '#DDA0DD', true),
('Educação Física', 'praticas', 'Atividades físicas e esportivas', '#98FB98', true),
('Arte', 'criativas', 'Artes visuais e expressão artística', '#F0E68C', true)
ON CONFLICT (name) DO NOTHING;
`);
      console.log('\n' + '='.repeat(60));
      console.log('\n🔧 Passos para executar:');
      console.log('1. Abra o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Cole o SQL acima');
      console.log('4. Execute o script');
      console.log('5. Recarregue a aplicação');
      return;
    }

    if (testError) {
      console.log('❌ Erro ao acessar pedagogical_tags:', testError.message);
      return;
    }

    console.log('✅ Tabela pedagogical_tags já existe!');
    
    // Verificar se há dados
    const { data: existingData, error: countError } = await supabase
      .from('pedagogical_tags')
      .select('*');

    if (countError) {
      console.log('❌ Erro ao contar registros:', countError.message);
      return;
    }

    console.log(`📊 Registros existentes: ${existingData?.length || 0}`);

    if (!existingData || existingData.length === 0) {
      console.log('\n2️⃣ Inserindo dados iniciais...');
      
      const tagsToInsert = [
        {
          name: 'Matemática Básica',
          category: 'matematica',
          description: 'Conceitos fundamentais de matemática',
          color: '#FF6B6B',
          is_system: true
        },
        {
          name: 'Português',
          category: 'linguagem',
          description: 'Língua portuguesa e literatura',
          color: '#4ECDC4',
          is_system: true
        },
        {
          name: 'Ciências',
          category: 'ciencias',
          description: 'Ciências naturais e experimentais',
          color: '#45B7D1',
          is_system: true
        },
        {
          name: 'História',
          category: 'humanas',
          description: 'História geral e do Brasil',
          color: '#96CEB4',
          is_system: true
        },
        {
          name: 'Geografia',
          category: 'humanas',
          description: 'Geografia física e humana',
          color: '#FFEAA7',
          is_system: true
        }
      ];

      const { data: insertData, error: insertError } = await supabase
        .from('pedagogical_tags')
        .insert(tagsToInsert)
        .select();

      if (insertError) {
        console.log('❌ Erro ao inserir dados:', insertError.message);
      } else {
        console.log(`✅ ${insertData?.length || 0} tags inseridas com sucesso!`);
      }
    } else {
      console.log('✅ Dados já existem na tabela');
    }

    console.log('\n🎉 Tabela pedagogical_tags configurada!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createPedagogicalTags();