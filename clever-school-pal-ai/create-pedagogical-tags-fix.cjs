const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPedagogicalTags() {
  console.log('🏷️ Criando tabela pedagogical_tags...');
  
  try {
    // Primeiro, verificar se a tabela já existe
    const { data: existingData, error: checkError } = await supabase
      .from('pedagogical_tags')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Tabela pedagogical_tags já existe!');
      console.log('📊 Verificando dados existentes...');
      
      const { data: allTags, error: countError } = await supabase
        .from('pedagogical_tags')
        .select('*');
      
      if (!countError) {
        console.log(`📋 Total de tags encontradas: ${allTags.length}`);
        allTags.forEach(tag => {
          console.log(`  - ${tag.name} (${tag.category})`);
        });
      }
      return;
    }
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('❌ Erro ao verificar tabela:', checkError);
      return;
    }
    
    console.log('📋 Tabela não existe. Para criar, execute este SQL no Supabase Dashboard:');
    console.log('\n' + '='.repeat(80));
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

-- 5. Inserir dados iniciais
INSERT INTO public.pedagogical_tags (name, category, description, color, is_system) VALUES
('matemática', 'subject', 'Matemática e cálculos', '#EF4444', true),
('português', 'subject', 'Língua portuguesa', '#10B981', true),
('ciências', 'subject', 'Ciências naturais', '#8B5CF6', true),
('história', 'subject', 'História e eventos passados', '#F59E0B', true),
('geografia', 'subject', 'Geografia e localização', '#06B6D4', true),
('inglês', 'subject', 'Língua inglesa', '#EC4899', true),
('exercício', 'activity', 'Exercícios práticos', '#3B82F6', true),
('teoria', 'activity', 'Conteúdo teórico', '#6B7280', true),
('prática', 'activity', 'Atividade prática', '#059669', true),
('básico', 'difficulty', 'Nível básico', '#22C55E', true),
('intermédio', 'difficulty', 'Nível intermédio', '#F59E0B', true),
('avançado', 'difficulty', 'Nível avançado', '#EF4444', true)
ON CONFLICT (name) DO NOTHING;
`);
    console.log('\n' + '='.repeat(80));
    console.log('\n🔗 Acesse: https://supabase.com/dashboard/project/nsaodmuqjtabfblrrdqv/sql/new');
    console.log('\n📋 Copie e cole o SQL acima no editor e execute.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createPedagogicalTags();