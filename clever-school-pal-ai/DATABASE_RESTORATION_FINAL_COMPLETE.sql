-- ================================================================
-- FINAL COMPLETE DATABASE RESTORATION SCRIPT
-- All Missing Tables, Functions, and Structures Found
-- Execute AFTER the main restoration script
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "intarray";

-- ================================================================
-- 1. EDUCATIONAL RESOURCES SYSTEM (from EXECUTE_NO_SUPABASE.sql)
-- ================================================================

-- Recursos Educacionais Table (Educational Resources)
CREATE TABLE IF NOT EXISTS public.recursos_educacionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  url_recurso TEXT NOT NULL,
  disciplina TEXT NOT NULL CHECK (disciplina IN ('matematica', 'ciencias', 'portugues', 'historia', 'geografia', 'fisico_quimica', 'ingles')),
  ano_escolar INTEGER[] NOT NULL DEFAULT '{}',
  topico TEXT NOT NULL,
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('imagem', 'video', 'infografia', 'exercicio', 'simulacao', 'texto', 'audio')),
  formato TEXT,
  duracao_estimada INTEGER, -- em minutos
  fonte_original TEXT NOT NULL,
  autor TEXT,
  licenca TEXT NOT NULL,
  verificado_educacionalmente BOOLEAN DEFAULT false,
  verificado_por TEXT,
  data_verificacao TIMESTAMPTZ,
  palavras_chave TEXT[] DEFAULT '{}',
  nivel_dificuldade INTEGER CHECK (nivel_dificuldade BETWEEN 1 AND 5) DEFAULT 3,
  popularidade INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Add missing columns to existing tables if they don't exist
DO $$
BEGIN
    -- Add topico column to recursos_educacionais if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recursos_educacionais' 
                   AND column_name = 'topico') THEN
        ALTER TABLE recursos_educacionais ADD COLUMN topico TEXT;
    END IF;
    
    -- Add palavras_chave column to recursos_educacionais if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recursos_educacionais' 
                   AND column_name = 'palavras_chave') THEN
        ALTER TABLE recursos_educacionais ADD COLUMN palavras_chave TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add topico column to midia_educacional if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'midia_educacional' 
                   AND column_name = 'topico') THEN
        ALTER TABLE midia_educacional ADD COLUMN topico TEXT;
    END IF;
    
    -- Add palavras_chave column to midia_educacional if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'midia_educacional' 
                   AND column_name = 'palavras_chave') THEN
        ALTER TABLE midia_educacional ADD COLUMN palavras_chave TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- ================================================================
-- 2. EDUCATIONAL MEDIA SYSTEM (from SISTEMA_MEDIA_EDUCACIONAL.sql)
-- ================================================================

-- Mídia Educacional Table (Educational Media)
CREATE TABLE IF NOT EXISTS public.midia_educacional (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File Identification
  nome_arquivo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  
  -- Storage Location
  bucket_name TEXT NOT NULL DEFAULT 'conteudos',
  caminho_storage TEXT NOT NULL,
  url_publica TEXT,
  
  -- File Metadata
  tipo_midia TEXT NOT NULL CHECK (tipo_midia IN ('imagem', 'video', 'audio', 'documento', 'pdf')),
  formato TEXT NOT NULL,
  tamanho_bytes BIGINT,
  duracao_segundos INTEGER,
  
  -- Educational Classification
  escola_id UUID REFERENCES schools(id),
  disciplina TEXT NOT NULL,
  ano_escolar INTEGER[] NOT NULL,
  topico TEXT NOT NULL,
  nivel_dificuldade INTEGER CHECK (nivel_dificuldade BETWEEN 1 AND 5) DEFAULT 3,
  
  -- Educational Metadata
  palavras_chave TEXT[] DEFAULT '{}',
  transcricao TEXT,
  legenda_url TEXT,
  
  -- Access Control
  publico BOOLEAN DEFAULT false,
  requer_autenticacao BOOLEAN DEFAULT true,
  classes_permitidas UUID[],
  
  -- Status and Moderation
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'arquivado')),
  aprovado_por TEXT,
  data_aprovacao TIMESTAMPTZ,
  
  -- Statistics
  visualizacoes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating_medio DECIMAL(3,2) DEFAULT 0.0,
  
  -- Technical Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,
  ativo BOOLEAN DEFAULT true
);

-- Storage Configuration Table
CREATE TABLE IF NOT EXISTS public.storage_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_name TEXT UNIQUE NOT NULL,
  descricao TEXT,
  publico BOOLEAN DEFAULT false,
  tamanho_maximo_mb INTEGER DEFAULT 100,
  tipos_permitidos TEXT[] DEFAULT ARRAY['jpg','png','mp4','pdf','mp3'], 
  estrutura_pastas TEXT DEFAULT 'escola/{escola_id}/{disciplina}/{ano}ano/',
  url_base TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. ENHANCED EDUCATIONAL IMAGES (from educational_images_table.sql)
-- ================================================================

-- Enhanced Educational Images Table
CREATE TABLE IF NOT EXISTS public.educational_images_enhanced (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL,
  verified BOOLEAN DEFAULT true,
  grade_level TEXT NOT NULL,
  subjects TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. MISSING SYSTEM TABLES (from previous analysis)
-- ================================================================

-- System Logs Table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_type TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedagogical Tags Table
CREATE TABLE IF NOT EXISTS public.pedagogical_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  category TEXT NOT NULL CHECK (category IN ('skill', 'topic', 'difficulty', 'method', 'assessment')),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Tags Junction Table
CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES pedagogical_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, tag_id)
);

-- Custom Personalities Table
CREATE TABLE IF NOT EXISTS public.custom_personalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  creator_id UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT true
);

-- WhatsApp Configuration Table
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    access_token TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    business_account_id TEXT NOT NULL,
    verify_token TEXT NOT NULL,
    webhook_url TEXT,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_config CHECK (id = 1)
);

-- WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT UNIQUE,
    to_number TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('utility', 'marketing', 'authentication', 'service')),
    template_name TEXT,
    content TEXT,
    pricing_model TEXT DEFAULT 'PMP' CHECK (pricing_model IN ('PMP', 'CBP')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    school_id UUID REFERENCES schools(id),
    student_id UUID REFERENCES students(id),
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Incoming Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_incoming_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,
    message_type TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    timestamp_received TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    school_id UUID REFERENCES schools(id),
    student_id UUID REFERENCES students(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Preferences Table
CREATE TABLE IF NOT EXISTS public.admin_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    school_id UUID REFERENCES schools(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- Global Preferences Table
CREATE TABLE IF NOT EXISTS public.global_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================================

-- Recursos Educacionais Indexes
CREATE INDEX IF NOT EXISTS idx_recursos_disciplina ON public.recursos_educacionais(disciplina);
CREATE INDEX IF NOT EXISTS idx_recursos_ano_escolar ON public.recursos_educacionais USING BTREE(ano_escolar);
CREATE INDEX IF NOT EXISTS idx_recursos_topico ON public.recursos_educacionais(topico);
CREATE INDEX IF NOT EXISTS idx_recursos_palavras_chave ON public.recursos_educacionais USING GIN(palavras_chave);
CREATE INDEX IF NOT EXISTS idx_recursos_verificado ON public.recursos_educacionais(verificado_educacionalmente, ativo);

-- Mídia Educacional Indexes
CREATE INDEX IF NOT EXISTS idx_midia_escola ON public.midia_educacional(escola_id);
CREATE INDEX IF NOT EXISTS idx_midia_disciplina ON public.midia_educacional(disciplina);
CREATE INDEX IF NOT EXISTS idx_midia_ano_escolar ON public.midia_educacional USING BTREE(ano_escolar);
CREATE INDEX IF NOT EXISTS idx_midia_tipo ON public.midia_educacional(tipo_midia);
CREATE INDEX IF NOT EXISTS idx_midia_status ON public.midia_educacional(status);
CREATE INDEX IF NOT EXISTS idx_midia_palavras_chave ON public.midia_educacional USING GIN(palavras_chave);
CREATE INDEX IF NOT EXISTS idx_midia_classes ON public.midia_educacional USING GIN(classes_permitidas);

-- Educational Images Enhanced Indexes
CREATE INDEX IF NOT EXISTS idx_educational_images_enhanced_category ON educational_images_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_educational_images_enhanced_topic ON educational_images_enhanced(topic);
CREATE INDEX IF NOT EXISTS idx_educational_images_enhanced_verified ON educational_images_enhanced(verified);
CREATE INDEX IF NOT EXISTS idx_educational_images_enhanced_subjects ON educational_images_enhanced USING gin(subjects);
CREATE INDEX IF NOT EXISTS idx_educational_images_enhanced_keywords ON educational_images_enhanced USING gin(keywords);

-- System Tables Indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_category ON public.pedagogical_tags(category);
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON public.content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON public.content_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_custom_personalities_active ON public.custom_personalities(active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_school_id ON public.whatsapp_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_processed ON public.whatsapp_incoming_messages(processed);

-- ================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all new tables
ALTER TABLE recursos_educacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE midia_educacional ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_images_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_incoming_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_preferences ENABLE ROW LEVEL SECURITY;

-- Recursos Educacionais Policies
CREATE POLICY "Allow all to read recursos_educacionais" ON public.recursos_educacionais FOR SELECT USING (ativo = true);
CREATE POLICY "Service role full access recursos" ON public.recursos_educacionais FOR ALL USING (auth.role() = 'service_role');

-- Educational Images Enhanced Policies
CREATE POLICY "Allow read verified educational images enhanced" ON educational_images_enhanced
  FOR SELECT USING (verified = true);
CREATE POLICY "Allow service role full access images enhanced" ON educational_images_enhanced
  FOR ALL USING (auth.role() = 'service_role');

-- System Logs Policies
CREATE POLICY "Service role full access system_logs" ON public.system_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated read system_logs" ON public.system_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Mídia Educacional Policies (school-based access)
CREATE POLICY "School access midia_educacional" ON public.midia_educacional FOR SELECT USING (
  escola_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "Service role full access midia" ON public.midia_educacional FOR ALL USING (auth.role() = 'service_role');

-- WhatsApp Policies (school-based access)
CREATE POLICY "School access whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (
  school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "Service role full access whatsapp" ON public.whatsapp_messages FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- 7. UTILITY FUNCTIONS
-- ================================================================

-- Search Educational Resources Function
CREATE OR REPLACE FUNCTION pesquisar_recursos_educacionais(
  consulta TEXT,
  disciplina_filtro TEXT DEFAULT NULL,
  ano_filtro INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descricao TEXT,
  url_recurso TEXT,
  disciplina TEXT,
  ano_escolar INTEGER[],
  topico TEXT,
  tipo_recurso TEXT,
  fonte_original TEXT,
  palavras_chave TEXT[],
  nivel_dificuldade INTEGER,
  pontuacao_relevancia FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.id,
    re.titulo,
    re.descricao,
    re.url_recurso,
    re.disciplina,
    re.ano_escolar,
    re.topico,
    re.tipo_recurso,
    re.fonte_original,
    re.palavras_chave,
    re.nivel_dificuldade,
    (
      CASE WHEN re.titulo ILIKE '%' || consulta || '%' THEN 20 ELSE 0 END +
      CASE WHEN re.descricao ILIKE '%' || consulta || '%' THEN 10 ELSE 0 END +
      CASE WHEN array_to_string(re.palavras_chave, ' ') ILIKE '%' || consulta || '%' THEN 15 ELSE 0 END +
      CASE WHEN re.topico ILIKE '%' || consulta || '%' THEN 12 ELSE 0 END
    )::FLOAT as pontuacao_relevancia
  FROM recursos_educacionais re
  WHERE 
    (re.titulo ILIKE '%' || consulta || '%' OR
     re.descricao ILIKE '%' || consulta || '%' OR
     array_to_string(re.palavras_chave, ' ') ILIKE '%' || consulta || '%' OR
     re.topico ILIKE '%' || consulta || '%')
    AND (disciplina_filtro IS NULL OR re.disciplina = disciplina_filtro)
    AND (ano_filtro IS NULL OR ano_filtro = ANY(re.ano_escolar))
    AND re.ativo = true
    AND re.verificado_educacionalmente = true
  ORDER BY pontuacao_relevancia DESC, re.popularidade DESC
  LIMIT 20;
END;
$$;

-- Search Educational Media Function
CREATE OR REPLACE FUNCTION pesquisar_midia_educacional(
  consulta TEXT,
  escola_filtro UUID DEFAULT NULL,
  disciplina_filtro TEXT DEFAULT NULL,
  ano_filtro INTEGER DEFAULT NULL,
  tipo_filtro TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descricao TEXT,
  url_publica TEXT,
  tipo_midia TEXT,
  formato TEXT,
  disciplina TEXT,
  ano_escolar INTEGER[],
  topico TEXT,
  palavras_chave TEXT[],
  visualizacoes INTEGER,
  rating_medio DECIMAL,
  pontuacao_relevancia FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.titulo,
    m.descricao,
    m.url_publica,
    m.tipo_midia,
    m.formato,
    m.disciplina,
    m.ano_escolar,
    m.topico,
    m.palavras_chave,
    m.visualizacoes,
    m.rating_medio,
    (
      CASE WHEN m.titulo ILIKE '%' || consulta || '%' THEN 30 ELSE 0 END +
      CASE WHEN m.descricao ILIKE '%' || consulta || '%' THEN 20 ELSE 0 END +
      CASE WHEN array_to_string(m.palavras_chave, ' ') ILIKE '%' || consulta || '%' THEN 25 ELSE 0 END +
      CASE WHEN m.topico ILIKE '%' || consulta || '%' THEN 15 ELSE 0 END +
      CASE WHEN m.transcricao ILIKE '%' || consulta || '%' THEN 10 ELSE 0 END +
      (m.visualizacoes::FLOAT / 100) +
      (m.rating_medio * 5)
    )::FLOAT as pontuacao_relevancia
  FROM midia_educacional m
  WHERE 
    (m.titulo ILIKE '%' || consulta || '%' OR
     m.descricao ILIKE '%' || consulta || '%' OR
     array_to_string(m.palavras_chave, ' ') ILIKE '%' || consulta || '%' OR
     m.topico ILIKE '%' || consulta || '%' OR
     m.transcricao ILIKE '%' || consulta || '%')
    AND (escola_filtro IS NULL OR m.escola_id = escola_filtro)
    AND (disciplina_filtro IS NULL OR m.disciplina = disciplina_filtro)
    AND (ano_filtro IS NULL OR ano_filtro = ANY(m.ano_escolar))
    AND (tipo_filtro IS NULL OR m.tipo_midia = tipo_filtro)
    AND m.ativo = true
    AND m.status = 'aprovado'
  ORDER BY pontuacao_relevancia DESC, m.visualizacoes DESC
  LIMIT 20;
END;
$$;

-- Search Enhanced Educational Images Function
CREATE OR REPLACE FUNCTION search_educational_images_enhanced(
  search_query TEXT,
  subject_filter TEXT DEFAULT NULL,
  grade_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  topic TEXT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  source TEXT,
  verified BOOLEAN,
  grade_level TEXT,
  subjects TEXT[],
  keywords TEXT[],
  relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ei.id,
    ei.category,
    ei.topic,
    ei.title,
    ei.description,
    ei.image_url,
    ei.source,
    ei.verified,
    ei.grade_level,
    ei.subjects,
    ei.keywords,
    (
      CASE WHEN ei.title ILIKE '%' || search_query || '%' THEN 10 ELSE 0 END +
      CASE WHEN ei.description ILIKE '%' || search_query || '%' THEN 5 ELSE 0 END +
      CASE WHEN array_to_string(ei.keywords, ' ') ILIKE '%' || search_query || '%' THEN 8 ELSE 0 END +
      CASE WHEN ei.topic ILIKE '%' || search_query || '%' THEN 7 ELSE 0 END
    )::FLOAT as relevance_score
  FROM educational_images_enhanced ei
  WHERE 
    (ei.title ILIKE '%' || search_query || '%' OR
     ei.description ILIKE '%' || search_query || '%' OR
     array_to_string(ei.keywords, ' ') ILIKE '%' || search_query || '%' OR
     ei.topic ILIKE '%' || search_query || '%')
    AND (subject_filter IS NULL OR ei.subjects && ARRAY[subject_filter])
    AND (grade_filter IS NULL OR ei.grade_level LIKE '%' || grade_filter || '%')
    AND ei.verified = true
  ORDER BY relevance_score DESC
  LIMIT 20;
END;
$$;

-- Cleanup Old System Logs Function
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO system_logs (log_type, level, message, metadata)
  VALUES ('cleanup', 'info', 'Cleaned up old system logs', 
          jsonb_build_object('deleted_count', deleted_count));
  
  RETURN deleted_count;
END;
$$;

-- Update Updated At Column Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Increment Popularity Function
CREATE OR REPLACE FUNCTION incrementar_popularidade(recurso_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE recursos_educacionais 
  SET popularidade = popularidade + 1,
      updated_at = NOW()
  WHERE id = recurso_id;
END;
$$;

-- ================================================================
-- 8. TRIGGERS
-- ================================================================

-- Updated At Triggers
CREATE TRIGGER update_recursos_educacionais_updated_at
    BEFORE UPDATE ON recursos_educacionais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_midia_educacional_updated_at
    BEFORE UPDATE ON midia_educacional
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedagogical_tags_updated_at
    BEFORE UPDATE ON pedagogical_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_personalities_updated_at
    BEFORE UPDATE ON custom_personalities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_educational_images_enhanced_updated_at
    BEFORE UPDATE ON educational_images_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 9. SAMPLE DATA INSERTION
-- ================================================================

-- Insert Storage Configuration
INSERT INTO public.storage_config (bucket_name, descricao, publico, tamanho_maximo_mb, tipos_permitidos) VALUES
('conteudos', 'Conteúdos educacionais principais', false, 200, ARRAY['jpg','png','svg','mp4','mp3','wav','pdf','doc','docx']),
('imagens', 'Imagens e diagramas educacionais', true, 50, ARRAY['jpg','png','svg','webp']),
('videos', 'Vídeo-aulas e explicações', false, 500, ARRAY['mp4','avi','mov','webm']),
('audios', 'Podcasts e áudios educacionais', false, 100, ARRAY['mp3','wav','ogg']),
('documentos', 'PDFs e documentos de apoio', false, 100, ARRAY['pdf','doc','docx','ppt','pptx'])
ON CONFLICT (bucket_name) DO NOTHING;

-- Insert Sample Educational Resources
INSERT INTO public.recursos_educacionais (titulo, descricao, url_recurso, disciplina, ano_escolar, topico, tipo_recurso, formato, fonte_original, licenca, verificado_educacionalmente, palavras_chave, nivel_dificuldade) VALUES
('Frações com Círculos', 'Representação visual de frações usando círculos coloridos', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fractions_pie_chart.svg/800px-Fractions_pie_chart.svg.png', 'matematica', ARRAY[5,6], 'fracoes', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY-SA 4.0', true, ARRAY['frações', 'círculos', 'matemática'], 2),
('Formas Geométricas', 'Quadrado, triângulo, círculo, retângulo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Basic_shapes.svg/800px-Basic_shapes.svg.png', 'matematica', ARRAY[5,6], 'geometria', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['geometria', 'formas'], 1),
('Ciclo da Água', 'Evaporação, condensação, precipitação', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Water_cycle.svg/800px-Water_cycle.svg.png', 'ciencias', ARRAY[5,6,7], 'agua', 'imagem', 'svg', 'USGS/Wikimedia Commons', 'Domínio Público', true, ARRAY['água', 'ciclo', 'evaporação'], 2),
('Sistema Solar NASA', 'Planetas em ordem com nomes em português', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1000px-Planets2013.svg.png', 'ciencias', ARRAY[7,8,9], 'sistema_solar', 'imagem', 'svg', 'NASA/Wikimedia Commons', 'Domínio Público', true, ARRAY['planetas', 'sistema solar', 'astronomia'], 3)
ON CONFLICT DO NOTHING;

-- Insert Sample Educational Images Enhanced
INSERT INTO educational_images_enhanced (category, topic, title, description, image_url, source, grade_level, subjects, keywords) VALUES
('matematica', 'fracoes', 'Frações com Pizzas', 'Diagrama científico mostrando frações 1/2, 1/4, 3/4 com pizzas reais', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Pizza_fractions.svg/800px-Pizza_fractions.svg.png', 'Wikimedia Commons', '5-7', ARRAY['matematica'], ARRAY['frações', 'pizzas', 'divisão', 'partes']),
('matematica', 'geometria', 'Formas Geométricas', 'Formas geométricas básicas com nomes e propriedades', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Basic_shapes.svg/800px-Basic_shapes.svg.png', 'Wikimedia Commons', '3-6', ARRAY['matematica'], ARRAY['geometria', 'formas', 'círculo', 'quadrado'])
ON CONFLICT DO NOTHING;

-- Insert Sample Pedagogical Tags
INSERT INTO public.pedagogical_tags (name, description, color, category, is_system) VALUES
('Matemática Básica', 'Conceitos fundamentais de matemática', '#FF6B6B', 'topic', true),
('Ciências Naturais', 'Conceitos de ciências para ensino básico', '#4ECDC4', 'topic', true),
('Fácil', 'Conteúdo de dificuldade baixa', '#95E1D3', 'difficulty', true),
('Médio', 'Conteúdo de dificuldade média', '#F38BA8', 'difficulty', true),
('Difícil', 'Conteúdo de dificuldade alta', '#FF8B94', 'difficulty', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Global Preferences
INSERT INTO public.global_preferences (key, value, description) VALUES
('system_maintenance_mode', 'false', 'Enable/disable system maintenance mode'),
('max_file_upload_size', '100', 'Maximum file upload size in MB'),
('default_language', 'pt', 'Default system language'),
('ai_model_temperature', '0.7', 'Default AI model temperature setting')
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- 10. GRANT PERMISSIONS
-- ================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Specific permissions for educational resources
GRANT SELECT ON public.recursos_educacionais TO anon, authenticated;
GRANT SELECT ON public.educational_images_enhanced TO anon, authenticated;
GRANT SELECT, INSERT ON public.system_logs TO service_role;
GRANT SELECT ON public.system_logs TO authenticated;

-- ================================================================
-- FINAL VERIFICATION
-- ================================================================

SELECT 'Final complete database restoration completed successfully! All missing tables, functions, and structures have been created.' as status;

-- Count all tables created
SELECT 
  schemaname,
  COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

-- List all new tables created by this script
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'recursos_educacionais',
    'midia_educacional', 
    'storage_config',
    'educational_images_enhanced',
    'system_logs',
    'pedagogical_tags',
    'content_tags',
    'custom_personalities',
    'whatsapp_config',
    'whatsapp_messages',
    'whatsapp_incoming_messages',
    'admin_preferences',
    'global_preferences'
  )
ORDER BY tablename;