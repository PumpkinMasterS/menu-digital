-- Criar tabela para cache semântico com embeddings
CREATE TABLE IF NOT EXISTS semantic_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_embedding VECTOR(1536), -- OpenAI text-embedding-3-small tem 1536 dimensões
  response TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  similarity_threshold REAL DEFAULT 0.85
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_semantic_cache_context_hash ON semantic_cache(context_hash);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_created_at ON semantic_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_usage_count ON semantic_cache(usage_count DESC);

-- Índice para busca por similaridade de embeddings (usando pgvector)
CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding ON semantic_cache 
USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

-- Função para limpeza automática de cache antigo (mais de 7 dias)
CREATE OR REPLACE FUNCTION cleanup_old_semantic_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM semantic_cache 
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND usage_count < 2; -- Manter entradas populares por mais tempo
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_semantic_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_semantic_cache_updated_at
  BEFORE UPDATE ON semantic_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_semantic_cache_updated_at();

-- Comentários para documentação
COMMENT ON TABLE semantic_cache IS 'Cache semântico para respostas da IA usando embeddings';
COMMENT ON COLUMN semantic_cache.query_embedding IS 'Embedding da pergunta do usuário (1536 dimensões)';
COMMENT ON COLUMN semantic_cache.response IS 'Resposta gerada pela IA';
COMMENT ON COLUMN semantic_cache.context_hash IS 'Hash do contexto (estudante + escola + turma)';
COMMENT ON COLUMN semantic_cache.usage_count IS 'Número de vezes que esta entrada foi reutilizada';
COMMENT ON COLUMN semantic_cache.similarity_threshold IS 'Threshold mínimo de similaridade para considerar match';