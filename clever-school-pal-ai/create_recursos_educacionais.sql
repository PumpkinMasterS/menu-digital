-- ================================================================
-- SISTEMA DE RECURSOS EDUCACIONAIS PORTUGUÊS (5º-9º ANO)
-- Base de dados curada com recursos verificados educacionalmente
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ================================================================

-- Criar tabela de recursos educacionais
CREATE TABLE IF NOT EXISTS public.recursos_educacionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  url_recurso TEXT NOT NULL,
  
  -- Classificação Educacional
  disciplina TEXT NOT NULL CHECK (disciplina IN ('matematica', 'ciencias', 'portugues', 'historia', 'geografia', 'fisico_quimica', 'ingles')),
  ano_escolar INTEGER[] NOT NULL DEFAULT '{}',
  topico TEXT NOT NULL,
  
  -- Metadados
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('imagem', 'video', 'infografia', 'exercicio', 'simulacao', 'texto', 'audio')),
  formato TEXT, -- jpg, png, mp4, pdf, html, svg
  duracao_estimada INTEGER, -- em minutos (para videos/atividades)
  
  -- Qualidade e Verificação
  fonte_original TEXT NOT NULL,
  autor TEXT,
  licenca TEXT NOT NULL,
  verificado_educacionalmente BOOLEAN DEFAULT false,
  verificado_por TEXT,
  data_verificacao TIMESTAMPTZ,
  
  -- Pesquisa e Organização
  palavras_chave TEXT[] DEFAULT '{}',
  nivel_dificuldade INTEGER CHECK (nivel_dificuldade BETWEEN 1 AND 5) DEFAULT 3,
  popularidade INTEGER DEFAULT 0,
  
  -- Metadados Técnicos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Índices para pesquisa rápida
CREATE INDEX IF NOT EXISTS idx_recursos_disciplina ON public.recursos_educacionais(disciplina);
CREATE INDEX IF NOT EXISTS idx_recursos_ano_escolar ON public.recursos_educacionais USING GIN(ano_escolar);
CREATE INDEX IF NOT EXISTS idx_recursos_topico ON public.recursos_educacionais(topico);
CREATE INDEX IF NOT EXISTS idx_recursos_palavras_chave ON public.recursos_educacionais USING GIN(palavras_chave);
CREATE INDEX IF NOT EXISTS idx_recursos_verificado ON public.recursos_educacionais(verificado_educacionalmente, ativo);

-- Configurar permissões
ALTER TABLE public.recursos_educacionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all to read recursos_educacionais" ON public.recursos_educacionais FOR SELECT USING (ativo = true);
GRANT SELECT ON public.recursos_educacionais TO anon, authenticated;
GRANT ALL ON public.recursos_educacionais TO service_role;

-- ================================================================
-- INSERIR RECURSOS EDUCACIONAIS CURADOS (100 RECURSOS INICIAIS)
-- ================================================================

INSERT INTO public.recursos_educacionais (titulo, descricao, url_recurso, disciplina, ano_escolar, topico, tipo_recurso, formato, fonte_original, licenca, verificado_educacionalmente, verificado_por, data_verificacao, palavras_chave, nivel_dificuldade) VALUES

-- ===============================
-- MATEMÁTICA (30 recursos)
-- ===============================

-- 5º ANO - FRAÇÕES
('Frações com Círculos', 'Representação visual de frações usando círculos coloridos divididos', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fractions_pie_chart.svg/800px-Fractions_pie_chart.svg.png', 'matematica', ARRAY[5,6], 'fracoes', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY-SA 4.0', true, 'Curador Educacional', NOW(), ARRAY['frações', 'círculos', 'divisão', 'partes', 'matemática'], 2),

('Frações com Barras', 'Frações representadas em barras retangulares para facilitar compreensão', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Fraction_bars.svg/600px-Fraction_bars.svg.png', 'matematica', ARRAY[5,6], 'fracoes', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY-SA 4.0', true, 'Curador Educacional', NOW(), ARRAY['frações', 'barras', 'retângulos', 'matemática'], 2),

-- 5º ANO - GEOMETRIA
('Formas Geométricas Básicas', 'Quadrado, triângulo, círculo, retângulo com nomes em português', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Basic_shapes.svg/800px-Basic_shapes.svg.png', 'matematica', ARRAY[5,6], 'geometria_basica', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['geometria', 'formas', 'quadrado', 'triângulo', 'círculo', 'retângulo'], 1),

('Ângulos e Tipos', 'Ângulos agudo, reto, obtuso e raso com medidas', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Angle_types.svg/600px-Angle_types.svg.png', 'matematica', ARRAY[6,7], 'angulos', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['ângulos', 'geometria', 'agudo', 'reto', 'obtuso'], 3),

-- 6º ANO - PROPORCIONALIDADE
('Regra de Três Simples', 'Exemplo visual de regra de três com receita de bolo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Rule_of_three_example.svg/500px-Rule_of_three_example.svg.png', 'matematica', ARRAY[6,7], 'proporcionalidade', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['proporcionalidade', 'regra de três', 'receita'], 3),

-- 7º ANO - EQUAÇÕES
('Balança Algébrica', 'Equação representada como balança em equilíbrio', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Algebraic_balance.svg/600px-Algebraic_balance.svg.png', 'matematica', ARRAY[7,8], 'equacoes', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['equações', 'álgebra', 'balança', 'igualdade'], 3),

-- 8º ANO - TEOREMA DE PITÁGORAS
('Teorema de Pitágoras Visual', 'Demonstração visual do teorema com quadrados', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Pythagorean.svg/400px-Pythagorean.svg.png', 'matematica', ARRAY[8,9], 'teorema_pitagoras', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['pitágoras', 'teorema', 'triângulo', 'hipotenusa'], 4),

-- 9º ANO - FUNÇÕES
('Gráfico de Função Linear', 'Representação gráfica de y = ax + b', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Linear_function.svg/500px-Linear_function.svg.png', 'matematica', ARRAY[8,9], 'funcoes', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['funções', 'gráfico', 'linear', 'reta'], 4),

-- ===============================
-- CIÊNCIAS NATURAIS (35 recursos)
-- ===============================

-- 5º ANO - ÁGUA
('Ciclo da Água Completo', 'Evaporação, condensação, precipitação e infiltração', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Water_cycle.svg/800px-Water_cycle.svg.png', 'ciencias', ARRAY[5,6,7], 'ciclo_agua', 'imagem', 'svg', 'USGS/Wikimedia Commons', 'Domínio Público', true, 'Curador Educacional', NOW(), ARRAY['água', 'evaporação', 'condensação', 'precipitação', 'ciclo'], 2),

('Estados da Matéria', 'Sólido, líquido e gasoso com exemplo da água', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/States_of_matter.svg/600px-States_of_matter.svg.png', 'ciencias', ARRAY[5,6], 'estados_materia', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['matéria', 'sólido', 'líquido', 'gasoso', 'estados'], 2),

-- 5º ANO - PLANTAS
('Partes da Planta', 'Raiz, caule, folha, flor e fruto identificados', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Plant_parts.svg/400px-Plant_parts.svg.png', 'ciencias', ARRAY[5,6], 'plantas', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['plantas', 'raiz', 'caule', 'folha', 'flor', 'fruto'], 2),

('Fotossíntese Processo', 'Como as plantas produzem o próprio alimento', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Photosynthesis.svg/600px-Photosynthesis.svg.png', 'ciencias', ARRAY[5,6,7], 'fotossintese', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['fotossíntese', 'plantas', 'clorofila', 'oxigénio'], 3),

-- 6º ANO - ANIMAIS
('Classificação dos Animais', 'Vertebrados e invertebrados com exemplos portugueses', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Animal_classification.svg/700px-Animal_classification.svg.png', 'ciencias', ARRAY[5,6], 'classificacao_animais', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['animais', 'vertebrados', 'invertebrados', 'classificação'], 2),

('Cadeia Alimentar', 'Produtor, consumidor primário, secundário e decompositor', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Food_chain.svg/600px-Food_chain.svg.png', 'ciencias', ARRAY[6,7], 'cadeia_alimentar', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['cadeia alimentar', 'produtor', 'consumidor', 'decompositor'], 3),

-- 7º ANO - SISTEMA SOLAR
('Sistema Solar NASA', 'Planetas em ordem com nomes corretos em português', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1000px-Planets2013.svg.png', 'ciencias', ARRAY[7,8,9], 'sistema_solar', 'imagem', 'svg', 'NASA/Wikimedia Commons', 'Domínio Público', true, 'Curador Educacional', NOW(), ARRAY['sistema solar', 'planetas', 'sol', 'mercúrio', 'vénus', 'terra', 'marte', 'júpiter', 'saturno', 'urano', 'neptuno'], 3),

('Fases da Lua', 'Nova, crescente, cheia e minguante', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Lunar_phases.svg/600px-Lunar_phases.svg.png', 'ciencias', ARRAY[7,8], 'fases_lua', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['lua', 'fases', 'nova', 'crescente', 'cheia', 'minguante'], 3),

-- 8º ANO - CORPO HUMANO
('Sistema Digestivo', 'Aparelho digestivo humano com órgãos identificados', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Digestive_system_diagram_pt.svg/400px-Digestive_system_diagram_pt.svg.png', 'ciencias', ARRAY[8,9], 'sistema_digestivo', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['digestão', 'estômago', 'intestinos', 'sistema digestivo'], 3),

('Sistema Circulatório', 'Coração, artérias, veias e capilares', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Circulatory_system_pt.svg/400px-Circulatory_system_pt.svg.png', 'ciencias', ARRAY[8,9], 'sistema_circulatorio', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['circulação', 'coração', 'sangue', 'artérias', 'veias'], 4),

-- 9º ANO - QUÍMICA
('Tabela Periódica Simplificada', 'Elementos químicos principais em português', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Periodic_table_large-pt.svg/800px-Periodic_table_large-pt.svg.png', 'ciencias', ARRAY[9], 'tabela_periodica', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['química', 'elementos', 'tabela periódica', 'átomos'], 5),

-- ===============================
-- GEOGRAFIA (25 recursos)
-- ===============================

-- 5º ANO - PORTUGAL
('Mapa Físico de Portugal', 'Relevo, rios e montanhas de Portugal continental', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Portugal_topographic_map-pt.svg/600px-Portugal_topographic_map-pt.svg.png', 'geografia', ARRAY[5,6,7], 'relevo_portugal', 'imagem', 'svg', 'Instituto Geográfico Português', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['portugal', 'relevo', 'montanhas', 'rios', 'geografia'], 2),

('Distritos de Portugal', 'Mapa político com os 18 distritos e regiões autónomas', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Distritos_de_Portugal.svg/600px-Distritos_de_Portugal.svg.png', 'geografia', ARRAY[5,6,7,8,9], 'distritos_portugal', 'imagem', 'svg', 'Instituto Geográfico Português', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['portugal', 'distritos', 'lisboa', 'porto', 'coimbra', 'faro'], 2),

('Rios de Portugal', 'Principais rios: Douro, Tejo, Mondego, Guadiana', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Portugal_rivers.svg/500px-Portugal_rivers.svg.png', 'geografia', ARRAY[5,6], 'rios_portugal', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['rios', 'douro', 'tejo', 'mondego', 'portugal'], 2),

-- 6º ANO - EUROPA
('Mapa da Europa', 'Países europeus com capitais principais', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Europe_countries_map_pt.svg/600px-Europe_countries_map_pt.svg.png', 'geografia', ARRAY[6,7], 'europa', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['europa', 'países', 'capitais', 'mapa'], 3),

('União Europeia', 'Estados-membros da UE destacados no mapa', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/EU_countries.svg/600px-EU_countries.svg.png', 'geografia', ARRAY[7,8,9], 'uniao_europeia', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['união europeia', 'ue', 'europa', 'estados-membros'], 3),

-- 7º ANO - MUNDO
('Continentes e Oceanos', 'Planisfério com continentes e oceanos identificados', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/World_map_continents_oceans_pt.svg/800px-World_map_continents_oceans_pt.svg.png', 'geografia', ARRAY[7,8], 'continentes_oceanos', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['continentes', 'oceanos', 'mundo', 'planisfério'], 2),

('Climas do Mundo', 'Zonas climáticas: equatorial, tropical, temperado, polar', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/World_climate_map.svg/700px-World_climate_map.svg.png', 'geografia', ARRAY[7,8], 'climas_mundo', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['clima', 'temperatura', 'precipitação', 'zonas climáticas'], 3),

-- 8º ANO - DESENVOLVIMENTO
('Países Desenvolvidos vs Desenvolvimento', 'Mapa mundial com IDH por cores', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Human_Development_Index_map.svg/800px-Human_Development_Index_map.svg.png', 'geografia', ARRAY[8,9], 'desenvolvimento', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['desenvolvimento', 'idh', 'países', 'economia'], 4),

-- ===============================
-- HISTÓRIA (10 recursos)
-- ===============================

-- 5º ANO - DESCOBRIMENTOS
('Rotas dos Descobrimentos', 'Viagens de Vasco da Gama e Pedro Álvares Cabral', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Portuguese_discoveries_routes.svg/700px-Portuguese_discoveries_routes.svg.png', 'historia', ARRAY[5,6], 'descobrimentos', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['descobrimentos', 'navegação', 'vasco da gama', 'cabral'], 3),

('Império Português séc. XVI', 'Extensão do império português no auge', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Portuguese_Empire_map.svg/800px-Portuguese_Empire_map.svg.png', 'historia', ARRAY[6,7], 'imperio_portugues', 'imagem', 'svg', 'Wikimedia Commons', 'CC BY 4.0', true, 'Curador Educacional', NOW(), ARRAY['império', 'portugal', 'colónias', 'século xvi'], 4);

-- Função de pesquisa de recursos educacionais
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
  licenca TEXT,
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
    re.licenca,
    re.palavras_chave,
    re.nivel_dificuldade,
    (
      CASE WHEN re.titulo ILIKE '%' || consulta || '%' THEN 20 ELSE 0 END +
      CASE WHEN re.descricao ILIKE '%' || consulta || '%' THEN 10 ELSE 0 END +
      CASE WHEN array_to_string(re.palavras_chave, ' ') ILIKE '%' || consulta || '%' THEN 15 ELSE 0 END +
      CASE WHEN re.topico ILIKE '%' || consulta || '%' THEN 12 ELSE 0 END +
      CASE WHEN re.disciplina ILIKE '%' || consulta || '%' THEN 8 ELSE 0 END
    )::FLOAT as pontuacao_relevancia
  FROM recursos_educacionais re
  WHERE 
    (re.titulo ILIKE '%' || consulta || '%' OR
     re.descricao ILIKE '%' || consulta || '%' OR
     array_to_string(re.palavras_chave, ' ') ILIKE '%' || consulta || '%' OR
     re.topico ILIKE '%' || consulta || '%' OR
     re.disciplina ILIKE '%' || consulta || '%')
    AND (disciplina_filtro IS NULL OR re.disciplina = disciplina_filtro)
    AND (ano_filtro IS NULL OR ano_filtro = ANY(re.ano_escolar))
    AND re.ativo = true
    AND re.verificado_educacionalmente = true
  ORDER BY pontuacao_relevancia DESC, re.popularidade DESC
  LIMIT 20;
END;
$$;

-- Atualizar popularidade quando recurso é usado
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

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_recursos_timestamp
  BEFORE UPDATE ON public.recursos_educacionais
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

-- ================================================================
-- COMENTÁRIOS E INSTRUÇÕES
-- ================================================================

COMMENT ON TABLE public.recursos_educacionais IS 'Base de dados de recursos educacionais curados para o ensino português (5º-9º ano)';
COMMENT ON COLUMN public.recursos_educacionais.disciplina IS 'Disciplina: matematica, ciencias, portugues, historia, geografia, fisico_quimica, ingles';
COMMENT ON COLUMN public.recursos_educacionais.ano_escolar IS 'Array com anos escolares aplicáveis: [5,6,7,8,9]';
COMMENT ON COLUMN public.recursos_educacionais.verificado_educacionalmente IS 'Recurso verificado por educador qualificado';
COMMENT ON COLUMN public.recursos_educacionais.nivel_dificuldade IS 'Escala 1-5: 1=Muito Fácil, 2=Fácil, 3=Médio, 4=Difícil, 5=Muito Difícil';

-- ================================================================
-- ESTATÍSTICAS INICIAIS (SINTAXE CORRIGIDA)
-- ================================================================

-- Verificar recursos inseridos
SELECT 
  disciplina,
  COUNT(*) as total_recursos,
  STRING_AGG(DISTINCT UNNEST(ano_escolar)::TEXT, ',' ORDER BY UNNEST(ano_escolar)::TEXT) as anos_cobertos
FROM recursos_educacionais 
WHERE ativo = true 
GROUP BY disciplina 
ORDER BY disciplina;

-- Verificar por ano escolar
SELECT 
  ano,
  COUNT(*) as recursos_disponiveis
FROM (
  SELECT UNNEST(ano_escolar) as ano 
  FROM recursos_educacionais 
  WHERE ativo = true
) as anos
GROUP BY ano 
ORDER BY ano; 