-- Educational Images Database Schema
-- For scientifically accurate and pedagogically correct educational content

-- Create the educational_images table
CREATE TABLE IF NOT EXISTS educational_images (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_educational_images_category ON educational_images(category);
CREATE INDEX IF NOT EXISTS idx_educational_images_topic ON educational_images(topic);
CREATE INDEX IF NOT EXISTS idx_educational_images_verified ON educational_images(verified);
CREATE INDEX IF NOT EXISTS idx_educational_images_subjects ON educational_images USING gin(subjects);
CREATE INDEX IF NOT EXISTS idx_educational_images_keywords ON educational_images USING gin(keywords);

-- Enable Row Level Security
ALTER TABLE educational_images ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read verified images
CREATE POLICY "Allow read verified educational images" ON educational_images
  FOR SELECT USING (verified = true);

-- Policy to allow service role to insert/update
CREATE POLICY "Allow service role full access" ON educational_images
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to search educational images
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

-- Insert some initial verified educational images
INSERT INTO educational_images (category, topic, title, description, image_url, source, grade_level, subjects, keywords) VALUES
-- MATEMÁTICA
('matematica', 'fracoes', 'Frações com Pizzas', 'Diagrama científico mostrando frações 1/2, 1/4, 3/4 com pizzas reais', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Pizza_fractions.svg/800px-Pizza_fractions.svg.png', 'Wikimedia Commons', '5-7', ARRAY['matematica'], ARRAY['frações', 'pizzas', 'divisão', 'partes']),
('matematica', 'geometria', 'Formas Geométricas', 'Formas geométricas básicas com nomes e propriedades', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Basic_shapes.svg/800px-Basic_shapes.svg.png', 'Wikimedia Commons', '3-6', ARRAY['matematica'], ARRAY['geometria', 'formas', 'círculo', 'quadrado']),

-- CIÊNCIAS
('ciencias', 'sistema_solar', 'Sistema Solar Real', 'Diagrama científico real do sistema solar com planetas corretos', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1200px-Planets2013.svg.png', 'NASA/Wikimedia Commons', '5-9', ARRAY['ciencias', 'astronomia'], ARRAY['planetas', 'sol', 'órbitas', 'astronomia']),
('ciencias', 'ciclo_agua', 'Ciclo da Água', 'Diagrama científico do ciclo da água com todas as fases', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Water_cycle.svg/1200px-Water_cycle.svg.png', 'USGS/Wikimedia Commons', '4-7', ARRAY['ciencias', 'geografia'], ARRAY['água', 'evaporação', 'condensação', 'precipitação']),
('ciencias', 'corpo_humano', 'Sistema Digestivo', 'Diagrama científico do sistema digestivo humano', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Digestive_system_diagram_pt.svg/600px-Digestive_system_diagram_pt.svg.png', 'Wikimedia Commons', '6-9', ARRAY['ciencias', 'biologia'], ARRAY['digestão', 'estômago', 'intestinos', 'sistema']),

-- GEOGRAFIA
('geografia', 'portugal', 'Mapa de Portugal', 'Mapa político de Portugal com distritos e principais cidades', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Distritos_de_Portugal.svg/800px-Distritos_de_Portugal.svg.png', 'Instituto Geográfico Português', '4-9', ARRAY['geografia', 'historia'], ARRAY['portugal', 'distritos', 'cidades', 'geografia'])

ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT SELECT ON educational_images TO anon, authenticated;
GRANT ALL ON educational_images TO service_role; 