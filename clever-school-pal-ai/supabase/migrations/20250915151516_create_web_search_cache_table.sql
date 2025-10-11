-- Tabela para cache de resultados de web search
-- Otimizada para performance e redução de custos

CREATE TABLE IF NOT EXISTS web_search_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash TEXT NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    results JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_web_search_cache_query_hash ON web_search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_web_search_cache_expires_at ON web_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_web_search_cache_created_at ON web_search_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_web_search_cache_hit_count ON web_search_cache(hit_count DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_web_search_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_web_search_cache_updated_at
    BEFORE UPDATE ON web_search_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_web_search_cache_updated_at();

-- Função para limpeza automática de cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_web_search_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM web_search_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    RAISE NOTICE 'Cleaned up % expired web search cache entries', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE web_search_cache IS 'Cache de resultados de busca web para otimizar performance e reduzir custos de API';
COMMENT ON COLUMN web_search_cache.query_hash IS 'Hash único da query para identificação rápida';
COMMENT ON COLUMN web_search_cache.query_text IS 'Texto original da query para debug e análise';
COMMENT ON COLUMN web_search_cache.results IS 'Resultados da busca em formato JSON';
COMMENT ON COLUMN web_search_cache.expires_at IS 'Data/hora de expiração do cache';
COMMENT ON COLUMN web_search_cache.hit_count IS 'Número de vezes que este cache foi utilizado';
COMMENT ON COLUMN web_search_cache.last_accessed_at IS 'Última vez que este cache foi acessado';