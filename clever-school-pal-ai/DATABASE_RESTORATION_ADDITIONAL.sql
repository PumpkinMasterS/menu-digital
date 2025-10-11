-- ================================================================
-- ADDITIONAL DATABASE RESTORATION SCRIPT
-- Missing Tables, Functions, and Structures
-- Execute AFTER the main restoration script
-- ================================================================

-- ================================================================
-- 1. MISSING TABLES FROM MIGRATIONS
-- ================================================================

-- System Logs Table (for monitoring and debugging)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_type TEXT NOT NULL, -- 'daily_chat_cleanup', 'error', 'info', 'warning'
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB, -- Detailed data in JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedagogical Tags Table (for content categorization)
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

-- Content Tags Junction Table (many-to-many)
CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES pedagogical_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, tag_id)
);

-- Educational Images Table (for visual content)
CREATE TABLE IF NOT EXISTS public.educational_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL, -- matematica, ciencias, geografia, historia, etc.
  topic TEXT NOT NULL,    -- sistema_solar, fracoes, corpo_humano, etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL,   -- NASA, Wikimedia Commons, etc.
  verified BOOLEAN DEFAULT true,
  grade_level TEXT NOT NULL, -- '4-6', '7-9', etc.
  subjects TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Personalities Table (for AI customization)
CREATE TABLE IF NOT EXISTS public.custom_personalities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true
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
    timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    school_id UUID REFERENCES schools(id),
    student_id UUID REFERENCES students(id),
    response_sent BOOLEAN DEFAULT false
);

-- Admin Preferences Table
CREATE TABLE IF NOT EXISTS public.admin_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- Global Preferences Table
CREATE TABLE IF NOT EXISTS public.global_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage Configuration Table
CREATE TABLE IF NOT EXISTS public.storage_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_name TEXT NOT NULL,
    max_file_size BIGINT DEFAULT 10485760, -- 10MB
    allowed_mime_types TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Educational Resources Table
CREATE TABLE IF NOT EXISTS public.recursos_educacionais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT CHECK (tipo IN ('video', 'documento', 'link', 'imagem', 'audio')),
    url TEXT,
    disciplina TEXT,
    ano_escolar INTEGER,
    tags TEXT[] DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Media Educational Table
CREATE TABLE IF NOT EXISTS public.midia_educacional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo_midia TEXT CHECK (tipo_midia IN ('video', 'audio', 'imagem', 'documento', 'interativo')),
    url_arquivo TEXT,
    thumbnail_url TEXT,
    duracao INTEGER, -- em segundos para vídeos/áudios
    tamanho_arquivo BIGINT, -- em bytes
    formato TEXT, -- mp4, jpg, pdf, etc.
    disciplinas TEXT[] DEFAULT '{}',
    anos_escolares INTEGER[] DEFAULT '{}',
    palavras_chave TEXT[] DEFAULT '{}',
    nivel_dificuldade INTEGER CHECK (nivel_dificuldade BETWEEN 1 AND 5) DEFAULT 3,
    aprovado BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ================================================================

-- System Logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(log_type, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- Pedagogical Tags indexes
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_category ON pedagogical_tags(category);
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_name ON pedagogical_tags(name);

-- Content Tags indexes
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);

-- Educational Images indexes
CREATE INDEX IF NOT EXISTS idx_educational_images_category ON educational_images(category);
CREATE INDEX IF NOT EXISTS idx_educational_images_topic ON educational_images(topic);
CREATE INDEX IF NOT EXISTS idx_educational_images_verified ON educational_images(verified);
CREATE INDEX IF NOT EXISTS idx_educational_images_subjects ON educational_images USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_educational_images_keywords ON educational_images USING GIN(keywords);

-- WhatsApp indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_school_id ON whatsapp_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_school_id ON whatsapp_incoming_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_processed ON whatsapp_incoming_messages(processed);

-- Resources indexes
CREATE INDEX IF NOT EXISTS idx_recursos_disciplina ON recursos_educacionais(disciplina);
CREATE INDEX IF NOT EXISTS idx_recursos_ano ON recursos_educacionais(ano_escolar);
CREATE INDEX IF NOT EXISTS idx_recursos_tags ON recursos_educacionais USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_midia_disciplinas ON midia_educacional USING GIN(disciplinas);
CREATE INDEX IF NOT EXISTS idx_midia_anos ON midia_educacional USING GIN(anos_escolares);
CREATE INDEX IF NOT EXISTS idx_midia_palavras_chave ON midia_educacional USING GIN(palavras_chave);

-- ================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all new tables
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_incoming_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_educacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE midia_educacional ENABLE ROW LEVEL SECURITY;

-- System Logs policies
CREATE POLICY "Allow service_role full access on system_logs" 
  ON system_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow authenticated read on system_logs" 
  ON system_logs FOR SELECT TO authenticated USING (true);

-- Pedagogical Tags policies
CREATE POLICY "Allow read pedagogical_tags" ON pedagogical_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage pedagogical_tags" ON pedagogical_tags
  FOR ALL TO authenticated USING (true);

-- Content Tags policies
CREATE POLICY "Allow read content_tags" ON content_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow manage content_tags" ON content_tags
  FOR ALL TO authenticated USING (true);

-- Educational Images policies
CREATE POLICY "Allow read verified educational images" ON educational_images
  FOR SELECT USING (verified = true);
CREATE POLICY "Allow service role full access on educational_images" ON educational_images
  FOR ALL USING (auth.role() = 'service_role');

-- Custom Personalities policies
CREATE POLICY "Users can view their own personalities" ON custom_personalities
  FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create their own personalities" ON custom_personalities
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their own personalities" ON custom_personalities
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete their own personalities" ON custom_personalities
  FOR DELETE USING (created_by = auth.uid());

-- WhatsApp policies (school-based access)
CREATE POLICY "School access whatsapp_config" ON whatsapp_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "School access whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (
    school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Resources policies
CREATE POLICY "Allow read recursos_educacionais" ON recursos_educacionais
  FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "Allow manage recursos_educacionais" ON recursos_educacionais
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read midia_educacional" ON midia_educacional
  FOR SELECT TO authenticated USING (aprovado = true);
CREATE POLICY "Allow manage midia_educacional" ON midia_educacional
  FOR ALL TO authenticated USING (true);

-- ================================================================
-- 4. UTILITY FUNCTIONS
-- ================================================================

-- Function to search educational images
CREATE OR REPLACE FUNCTION search_educational_images(
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
  FROM educational_images ei
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

-- Function to search educational resources
CREATE OR REPLACE FUNCTION search_recursos_educacionais(
  search_query TEXT,
  disciplina_filter TEXT DEFAULT NULL,
  ano_filter INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descricao TEXT,
  tipo TEXT,
  url TEXT,
  disciplina TEXT,
  ano_escolar INTEGER,
  tags TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.id,
    re.titulo,
    re.descricao,
    re.tipo,
    re.url,
    re.disciplina,
    re.ano_escolar,
    re.tags
  FROM recursos_educacionais re
  WHERE 
    re.ativo = true
    AND (search_query IS NULL OR 
         re.titulo ILIKE '%' || search_query || '%' OR
         re.descricao ILIKE '%' || search_query || '%' OR
         array_to_string(re.tags, ' ') ILIKE '%' || search_query || '%')
    AND (disciplina_filter IS NULL OR re.disciplina = disciplina_filter)
    AND (ano_filter IS NULL OR re.ano_escolar = ano_filter)
  ORDER BY re.titulo
  LIMIT 50;
END;
$$;

-- Function to cleanup old system logs
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  INSERT INTO public.system_logs (log_type, level, message, metadata)
  VALUES (
    'system_maintenance',
    'info',
    'Logs antigos removidos automaticamente',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'retention_period', '90 days'
    )
  );
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================================================
-- 5. TRIGGERS
-- ================================================================

-- Update triggers for timestamp columns
CREATE TRIGGER update_pedagogical_tags_updated_at
  BEFORE UPDATE ON pedagogical_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_educational_images_updated_at
  BEFORE UPDATE ON educational_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_personalities_updated_at
  BEFORE UPDATE ON custom_personalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recursos_educacionais_updated_at
  BEFORE UPDATE ON recursos_educacionais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_midia_educacional_updated_at
  BEFORE UPDATE ON midia_educacional
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 6. SAMPLE DATA INSERTION
-- ================================================================

-- Insert basic pedagogical tags
INSERT INTO pedagogical_tags (name, description, category, is_system) VALUES
('Iniciante', 'Conteúdo para iniciantes', 'difficulty', true),
('Intermediário', 'Conteúdo de nível intermediário', 'difficulty', true),
('Avançado', 'Conteúdo avançado', 'difficulty', true),
('Resolução de Problemas', 'Foco em resolução de problemas', 'skill', true),
('Pensamento Crítico', 'Desenvolvimento do pensamento crítico', 'skill', true),
('Trabalho em Equipe', 'Atividades colaborativas', 'method', true),
('Avaliação Formativa', 'Avaliação contínua', 'assessment', true),
('Avaliação Sumativa', 'Avaliação final', 'assessment', true);

-- Insert sample educational images
INSERT INTO educational_images (category, topic, title, description, image_url, source, grade_level, subjects, keywords) VALUES
('matematica', 'fracoes', 'Frações com Pizzas', 'Diagrama científico mostrando frações 1/2, 1/4, 3/4 com pizzas reais', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Pizza_fractions.svg/800px-Pizza_fractions.svg.png', 'Wikimedia Commons', '5-7', ARRAY['matematica'], ARRAY['frações', 'pizzas', 'divisão', 'partes', 'inteiro']),
('ciencias', 'sistema_solar', 'Sistema Solar Real', 'Diagrama científico real do sistema solar com planetas corretos', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1200px-Planets2013.svg.png', 'NASA/Wikimedia Commons', '5-9', ARRAY['ciencias', 'astronomia'], ARRAY['planetas', 'sol', 'órbitas', 'astronomia', 'espaço']),
('geografia', 'portugal', 'Mapa de Portugal', 'Mapa político de Portugal com distritos e principais cidades', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Distritos_de_Portugal.svg/800px-Distritos_de_Portugal.svg.png', 'Instituto Geográfico Português', '4-9', ARRAY['geografia', 'historia'], ARRAY['portugal', 'distritos', 'cidades', 'geografia']);

-- Insert sample educational resources
INSERT INTO recursos_educacionais (titulo, descricao, tipo, disciplina, ano_escolar, tags) VALUES
('Vídeo: Frações Básicas', 'Explicação visual sobre frações usando exemplos práticos', 'video', 'Matemática', 5, ARRAY['frações', 'básico', 'visual']),
('Documento: Sistema Solar', 'Guia completo sobre os planetas do sistema solar', 'documento', 'Ciências', 6, ARRAY['planetas', 'astronomia', 'sistema solar']),
('Link: Mapa Interativo de Portugal', 'Ferramenta interativa para explorar a geografia de Portugal', 'link', 'Geografia', 7, ARRAY['portugal', 'geografia', 'interativo']);

-- Insert sample storage configuration
INSERT INTO storage_config (bucket_name, max_file_size, allowed_mime_types) VALUES
('educational-content', 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4', 'audio/mp3']);

-- ================================================================
-- 7. GRANT PERMISSIONS
-- ================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ================================================================
-- RESTORATION COMPLETE
-- ================================================================

SELECT 'Additional database restoration completed successfully! All missing tables, functions, and structures have been created.' as status;