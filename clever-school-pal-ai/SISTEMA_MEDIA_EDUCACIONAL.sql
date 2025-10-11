-- ================================================================
-- SISTEMA DE MÍDIA EDUCACIONAL COMPLETO
-- Supabase Storage + WhatsApp + IA Integration
-- ================================================================

-- ================================================================
-- 1. TABELA DE ARQUIVOS DE MÍDIA EDUCACIONAL
-- ================================================================

CREATE TABLE IF NOT EXISTS public.midia_educacional (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação do Arquivo
  nome_arquivo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  
  -- Localização no Storage
  bucket_name TEXT NOT NULL DEFAULT 'conteudos',
  caminho_storage TEXT NOT NULL, -- exemplo: escola123/matematica/5ano/fracoes_video.mp4
  url_publica TEXT, -- URL pública ou temporária
  
  -- Metadados do Arquivo
  tipo_midia TEXT NOT NULL CHECK (tipo_midia IN ('imagem', 'video', 'audio', 'documento', 'pdf')),
  formato TEXT NOT NULL, -- mp4, jpg, png, pdf, mp3, etc.
  tamanho_bytes BIGINT,
  duracao_segundos INTEGER, -- para vídeos e áudios
  
  -- Classificação Educacional
  escola_id UUID REFERENCES schools(id),
  disciplina TEXT NOT NULL,
  ano_escolar INTEGER[] NOT NULL,
  topico TEXT NOT NULL,
  nivel_dificuldade INTEGER CHECK (nivel_dificuldade BETWEEN 1 AND 5) DEFAULT 3,
  
  -- Metadados Educacionais
  palavras_chave TEXT[] DEFAULT '{}',
  transcricao TEXT, -- para vídeos e áudios
  legenda_url TEXT, -- URL do arquivo de legendas
  
  -- Controle de Acesso
  publico BOOLEAN DEFAULT false,
  requer_autenticacao BOOLEAN DEFAULT true,
  classes_permitidas UUID[], -- IDs das turmas que podem acessar
  
  -- Status e Moderação
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'arquivado')),
  aprovado_por TEXT,
  data_aprovacao TIMESTAMPTZ,
  
  -- Estatísticas
  visualizacoes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating_medio DECIMAL(3,2) DEFAULT 0.0,
  
  -- Metadados Técnicos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,
  ativo BOOLEAN DEFAULT true
);

-- ================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_midia_escola ON public.midia_educacional(escola_id);
CREATE INDEX IF NOT EXISTS idx_midia_disciplina ON public.midia_educacional(disciplina);
CREATE INDEX IF NOT EXISTS idx_midia_ano_escolar ON public.midia_educacional USING GIN(ano_escolar);
CREATE INDEX IF NOT EXISTS idx_midia_tipo ON public.midia_educacional(tipo_midia);
CREATE INDEX IF NOT EXISTS idx_midia_status ON public.midia_educacional(status);
CREATE INDEX IF NOT EXISTS idx_midia_palavras_chave ON public.midia_educacional USING GIN(palavras_chave);
CREATE INDEX IF NOT EXISTS idx_midia_classes ON public.midia_educacional USING GIN(classes_permitidas);

-- ================================================================
-- 3. TABELA DE METADATA DE STORAGE BUCKETS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.storage_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_name TEXT UNIQUE NOT NULL,
  descricao TEXT,
  publico BOOLEAN DEFAULT false,
  tamanho_maximo_mb INTEGER DEFAULT 100, -- Limite por arquivo
  tipos_permitidos TEXT[] DEFAULT ARRAY['jpg','png','mp4','pdf','mp3'], 
  estrutura_pastas TEXT DEFAULT 'escola/{escola_id}/{disciplina}/{ano}ano/',
  url_base TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO public.storage_config (bucket_name, descricao, publico, tamanho_maximo_mb, tipos_permitidos) VALUES
('conteudos', 'Conteúdos educacionais principais', false, 200, ARRAY['jpg','png','svg','mp4','mp3','wav','pdf','doc','docx']),
('imagens', 'Imagens e diagramas educacionais', true, 50, ARRAY['jpg','png','svg','webp']),
('videos', 'Vídeo-aulas e explicações', false, 500, ARRAY['mp4','avi','mov','webm']),
('audios', 'Podcasts e áudios educacionais', false, 100, ARRAY['mp3','wav','ogg']),
('documentos', 'PDFs e documentos de apoio', false, 100, ARRAY['pdf','doc','docx','ppt','pptx']);

-- ================================================================
-- 4. FUNÇÕES DE PESQUISA E GESTÃO
-- ================================================================

-- Função para pesquisar mídia educacional
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
      (m.visualizacoes::FLOAT / 100) + -- Bonificação por popularidade
      (m.rating_medio * 5) -- Bonificação por qualidade
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
    AND m.status = 'aprovado'
    AND m.ativo = true
  ORDER BY pontuacao_relevancia DESC, m.visualizacoes DESC
  LIMIT 20;
END;
$$;

-- Função para incrementar visualizações
CREATE OR REPLACE FUNCTION incrementar_visualizacao(midia_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE midia_educacional 
  SET visualizacoes = visualizacoes + 1,
      updated_at = NOW()
  WHERE id = midia_id;
END;
$$;

-- Função para gerar URL temporária (simulada)
CREATE OR REPLACE FUNCTION gerar_url_temporaria(
  midia_id UUID,
  duracao_minutos INTEGER DEFAULT 60
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  url_base TEXT;
  caminho TEXT;
  token TEXT;
BEGIN
  SELECT url_publica, caminho_storage 
  INTO url_base, caminho
  FROM midia_educacional 
  WHERE id = midia_id;
  
  -- Gerar token simples (em produção usar JWT ou similar)
  token := encode(digest(midia_id::TEXT || NOW()::TEXT, 'sha256'), 'hex');
  
  RETURN url_base || '?token=' || token || '&expires=' || (EXTRACT(EPOCH FROM NOW() + INTERVAL '1 hour' * duracao_minutos))::TEXT;
END;
$$;

-- ================================================================
-- 5. SISTEMA DE RATINGS E FEEDBACK
-- ================================================================

CREATE TABLE IF NOT EXISTS public.midia_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  midia_id UUID REFERENCES midia_educacional(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comentario TEXT,
  util BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(midia_id, student_id)
);

-- Trigger para atualizar rating médio
CREATE OR REPLACE FUNCTION atualizar_rating_medio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE midia_educacional 
  SET rating_medio = (
    SELECT AVG(rating)::DECIMAL(3,2) 
    FROM midia_ratings 
    WHERE midia_id = COALESCE(NEW.midia_id, OLD.midia_id)
  )
  WHERE id = COALESCE(NEW.midia_id, OLD.midia_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_atualizar_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.midia_ratings
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_rating_medio();

-- ================================================================
-- 6. LOGS DE ACESSO PARA WHATSAPP
-- ================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_midia_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  midia_id UUID REFERENCES midia_educacional(id),
  student_id UUID REFERENCES students(id),
  phone_number TEXT NOT NULL,
  
  -- Contexto da Conversa
  pergunta_original TEXT,
  resposta_ia TEXT,
  
  -- Dados do Envio WhatsApp
  whatsapp_message_id TEXT,
  tipo_envio TEXT CHECK (tipo_envio IN ('url_temporaria', 'arquivo_direto', 'preview')),
  sucesso BOOLEAN DEFAULT true,
  erro_mensagem TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- ================================================================
-- 7. PERMISSÕES E SEGURANÇA
-- ================================================================

-- RLS para mídia educacional
ALTER TABLE public.midia_educacional ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública de conteúdo aprovado
CREATE POLICY "Allow read approved media" ON public.midia_educacional
  FOR SELECT 
  USING (status = 'aprovado' AND ativo = true);

-- Política para leitura por escola (para professores/admin)
CREATE POLICY "Allow school access" ON public.midia_educacional
  FOR ALL 
  USING (
    escola_id IN (
      SELECT s.school_id 
      FROM students s 
      WHERE s.id = auth.uid()::UUID
    )
  );

-- Permissões básicas
GRANT SELECT ON public.midia_educacional TO anon, authenticated;
GRANT ALL ON public.midia_educacional TO service_role;
GRANT SELECT ON public.storage_config TO anon, authenticated;
GRANT SELECT ON public.midia_ratings TO authenticated;
GRANT INSERT, UPDATE ON public.midia_ratings TO authenticated;
GRANT SELECT ON public.whatsapp_midia_logs TO service_role;
GRANT INSERT ON public.whatsapp_midia_logs TO service_role;

-- ================================================================
-- 8. DADOS DE EXEMPLO
-- ================================================================

-- Inserir algumas mídias de exemplo
INSERT INTO public.midia_educacional (
  nome_arquivo, titulo, descricao, bucket_name, caminho_storage, url_publica,
  tipo_midia, formato, disciplina, ano_escolar, topico, palavras_chave,
  status, publico, nivel_dificuldade
) VALUES

-- Vídeos Matemática
('fracoes_introducao.mp4', 'Introdução às Frações', 'Vídeo explicativo sobre conceitos básicos de frações', 'videos', 'matematica/5ano/fracoes_introducao.mp4', 'https://storage.supabase.co/videos/matematica/5ano/fracoes_introducao.mp4', 'video', 'mp4', 'matematica', ARRAY[5,6], 'fracoes', ARRAY['frações', 'matemática', 'divisão'], 'aprovado', true, 2),

('pitagoras_demonstracao.mp4', 'Teorema de Pitágoras - Demonstração', 'Demonstração visual e prática do teorema', 'videos', 'matematica/8ano/pitagoras_demo.mp4', 'https://storage.supabase.co/videos/matematica/8ano/pitagoras_demo.mp4', 'video', 'mp4', 'matematica', ARRAY[8,9], 'geometria', ARRAY['pitágoras', 'teorema', 'geometria'], 'aprovado', true, 4),

-- Áudios Ciências
('sistema_solar.mp3', 'Podcast: Viagem pelo Sistema Solar', 'Exploração narrada dos planetas do sistema solar', 'audios', 'ciencias/7ano/sistema_solar.mp3', 'https://storage.supabase.co/audios/ciencias/7ano/sistema_solar.mp3', 'audio', 'mp3', 'ciencias', ARRAY[7,8], 'astronomia', ARRAY['planetas', 'sistema solar', 'astronomia'], 'aprovado', true, 3),

-- PDFs Geografia
('portugal_relevo.pdf', 'Atlas do Relevo Português', 'Mapas e explicações sobre o relevo de Portugal', 'documentos', 'geografia/5ano/portugal_relevo.pdf', 'https://storage.supabase.co/documentos/geografia/5ano/portugal_relevo.pdf', 'documento', 'pdf', 'geografia', ARRAY[5,6,7], 'portugal', ARRAY['portugal', 'relevo', 'geografia'], 'aprovado', true, 2),

-- Imagens História
('descobrimentos_mapa.jpg', 'Mapa dos Descobrimentos Portugueses', 'Rotas das grandes navegações portuguesas', 'imagens', 'historia/5ano/descobrimentos_mapa.jpg', 'https://storage.supabase.co/imagens/historia/5ano/descobrimentos_mapa.jpg', 'imagem', 'jpg', 'historia', ARRAY[5,6], 'descobrimentos', ARRAY['descobrimentos', 'navegação', 'portugal'], 'aprovado', true, 3);

-- ================================================================
-- 9. ESTATÍSTICAS E RELATÓRIOS
-- ================================================================

-- View para dashboard de mídia
CREATE OR REPLACE VIEW dashboard_midia AS
SELECT 
  disciplina,
  tipo_midia,
  COUNT(*) as total_arquivos,
  SUM(visualizacoes) as total_visualizacoes,
  AVG(rating_medio) as rating_medio_disciplina,
  SUM(tamanho_bytes) as espaco_usado_bytes,
  COUNT(DISTINCT escola_id) as escolas_usando
FROM midia_educacional 
WHERE status = 'aprovado' AND ativo = true
GROUP BY disciplina, tipo_midia
ORDER BY disciplina, tipo_midia;

-- Função para relatório de uso
CREATE OR REPLACE FUNCTION relatorio_uso_midia(
  periodo_dias INTEGER DEFAULT 30
)
RETURNS TABLE (
  disciplina TEXT,
  tipo_midia TEXT,
  acessos_periodo BIGINT,
  arquivos_mais_populares TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.disciplina,
    m.tipo_midia,
    COUNT(w.id) as acessos_periodo,
    STRING_AGG(m.titulo, ', ' ORDER BY COUNT(w.id) DESC LIMIT 3) as arquivos_mais_populares
  FROM midia_educacional m
  LEFT JOIN whatsapp_midia_logs w ON m.id = w.midia_id
  WHERE w.created_at >= NOW() - INTERVAL '1 day' * periodo_dias
    AND m.status = 'aprovado'
  GROUP BY m.disciplina, m.tipo_midia
  ORDER BY acessos_periodo DESC;
END;
$$;

-- ================================================================
-- VERIFICAÇÃO FINAL
-- ================================================================

-- Contar mídias por tipo
SELECT 
  tipo_midia,
  disciplina,
  COUNT(*) as total,
  STRING_AGG(DISTINCT UNNEST(ano_escolar)::TEXT, ',' ORDER BY UNNEST(ano_escolar)::TEXT) as anos_cobertos
FROM midia_educacional 
WHERE status = 'aprovado' AND ativo = true 
GROUP BY tipo_midia, disciplina 
ORDER BY tipo_midia, disciplina; 