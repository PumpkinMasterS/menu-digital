-- ================================================================
-- RECURSOS EDUCACIONAIS - EXECUTE NO SUPABASE DASHBOARD
-- Cole este código completo no SQL Editor do Supabase
-- ================================================================

-- Criar tabela de recursos educacionais
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
  fonte_original TEXT NOT NULL,
  autor TEXT,
  licenca TEXT NOT NULL,
  verificado_educacionalmente BOOLEAN DEFAULT false,
  palavras_chave TEXT[] DEFAULT '{}',
  nivel_dificuldade INTEGER CHECK (nivel_dificuldade BETWEEN 1 AND 5) DEFAULT 3,
  popularidade INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Índices para pesquisa
CREATE INDEX IF NOT EXISTS idx_recursos_disciplina ON public.recursos_educacionais(disciplina);
CREATE INDEX IF NOT EXISTS idx_recursos_ano_escolar ON public.recursos_educacionais USING GIN(ano_escolar);
CREATE INDEX IF NOT EXISTS idx_recursos_palavras_chave ON public.recursos_educacionais USING GIN(palavras_chave);

-- Permissões
ALTER TABLE public.recursos_educacionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all to read recursos" ON public.recursos_educacionais FOR SELECT USING (ativo = true);
GRANT SELECT ON public.recursos_educacionais TO anon, authenticated;
GRANT ALL ON public.recursos_educacionais TO service_role;

-- ================================================================
-- INSERIR RECURSOS EDUCACIONAIS (20 RECURSOS INICIAIS)
-- ================================================================

INSERT INTO public.recursos_educacionais (titulo, descricao, url_recurso, disciplina, ano_escolar, topico, tipo_recurso, formato, fonte_original, licenca, verificado_educacionalmente, palavras_chave, nivel_dificuldade) VALUES

-- MATEMÁTICA
('Frações com Círculos', 'Representação visual de frações usando círculos coloridos', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fractions_pie_chart.svg/800px-Fractions_pie_chart.svg.png', 'matematica', ARRAY[5,6], 'fracoes', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY-SA 4.0', true, ARRAY['frações', 'círculos', 'matemática'], 2),

('Formas Geométricas', 'Quadrado, triângulo, círculo, retângulo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Basic_shapes.svg/800px-Basic_shapes.svg.png', 'matematica', ARRAY[5,6], 'geometria', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['geometria', 'formas'], 1),

('Teorema de Pitágoras', 'Demonstração visual do teorema', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Pythagorean.svg/400px-Pythagorean.svg.png', 'matematica', ARRAY[8,9], 'pitagoras', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['pitágoras', 'teorema'], 4),

-- CIÊNCIAS
('Ciclo da Água', 'Evaporação, condensação, precipitação', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Water_cycle.svg/800px-Water_cycle.svg.png', 'ciencias', ARRAY[5,6,7], 'agua', 'imagem', 'svg', 'USGS/Wikimedia Commons', 'Domínio Público', true, ARRAY['água', 'ciclo', 'evaporação'], 2),

('Sistema Solar NASA', 'Planetas em ordem com nomes em português', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1000px-Planets2013.svg.png', 'ciencias', ARRAY[7,8,9], 'sistema_solar', 'imagem', 'svg', 'NASA/Wikimedia Commons', 'Domínio Público', true, ARRAY['planetas', 'sistema solar', 'astronomia'], 3),

('Fotossíntese', 'Como as plantas produzem alimento', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Photosynthesis.svg/600px-Photosynthesis.svg.png', 'ciencias', ARRAY[5,6,7], 'plantas', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['fotossíntese', 'plantas'], 3),

('Sistema Digestivo', 'Aparelho digestivo humano', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Digestive_system_diagram_pt.svg/400px-Digestive_system_diagram_pt.svg.png', 'ciencias', ARRAY[8,9], 'corpo_humano', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['digestão', 'sistema digestivo'], 3),

-- GEOGRAFIA
('Mapa Físico de Portugal', 'Relevo, rios e montanhas de Portugal', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Portugal_topographic_map-pt.svg/600px-Portugal_topographic_map-pt.svg.png', 'geografia', ARRAY[5,6,7], 'portugal', 'imagem', 'svg', 'Instituto Geográfico Português', 'CC BY 4.0', true, ARRAY['portugal', 'relevo', 'geografia'], 2),

('Distritos de Portugal', 'Mapa político com 18 distritos', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Distritos_de_Portugal.svg/600px-Distritos_de_Portugal.svg.png', 'geografia', ARRAY[5,6,7,8,9], 'portugal', 'imagem', 'svg', 'Instituto Geográfico Português', 'CC BY 4.0', true, ARRAY['portugal', 'distritos'], 2),

('Continentes e Oceanos', 'Planisfério com continentes identificados', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/World_map_continents_oceans_pt.svg/800px-World_map_continents_oceans_pt.svg.png', 'geografia', ARRAY[7,8], 'mundo', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['continentes', 'oceanos', 'mundo'], 2),

-- HISTÓRIA
('Descobrimentos Portugueses', 'Rotas de Vasco da Gama e Cabral', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Portuguese_discoveries_routes.svg/700px-Portuguese_discoveries_routes.svg.png', 'historia', ARRAY[5,6], 'descobrimentos', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, ARRAY['descobrimentos', 'navegação'], 3);

-- ================================================================
-- FUNÇÕES UTILITÁRIAS
-- ================================================================

-- Função de pesquisa
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

-- Função para incrementar popularidade
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
-- VERIFICAÇÃO FINAL
-- ================================================================

-- Contar recursos inseridos por disciplina
SELECT 
  disciplina,
  COUNT(*) as total_recursos
FROM recursos_educacionais 
WHERE ativo = true 
GROUP BY disciplina 
ORDER BY disciplina;

-- Mostrar alguns recursos de exemplo
SELECT 
  titulo,
  disciplina,
  ano_escolar,
  tipo_recurso,
  verificado_educacionalmente
FROM recursos_educacionais 
WHERE ativo = true 
ORDER BY disciplina, titulo
LIMIT 10; 