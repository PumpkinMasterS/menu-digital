-- =====================================
-- DELIVERY ZONES SYSTEM
-- Sistema completo de gestão de áreas de entrega
-- Suporte a: Raio circular + Polígonos personalizados
-- =====================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum para tipos de zona de entrega
CREATE TYPE delivery_zone_type AS ENUM ('circle', 'polygon');

-- Enum para status da zona
CREATE TYPE zone_status AS ENUM ('active', 'inactive', 'draft');

-- Tabela principal de zonas de entrega
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Configuração da zona
    name TEXT NOT NULL,
    description TEXT,
    zone_type delivery_zone_type NOT NULL,
    status zone_status DEFAULT 'active',
    
    -- Para zonas circulares
    center_point GEOGRAPHY(POINT, 4326), -- Centro do círculo (lat, lng)
    radius_meters INTEGER, -- Raio em metros
    
    -- Para zonas poligonais
    polygon_coordinates GEOGRAPHY(POLYGON, 4326), -- Coordenadas do polígono
    
    -- Configurações de entrega
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    minimum_order DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    estimated_delivery_time_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Configurações avançadas
    priority INTEGER DEFAULT 1, -- Prioridade quando múltiplas zonas se sobrepõem
    max_orders_per_hour INTEGER, -- Limite de pedidos por hora
    
    -- Horários de funcionamento (JSON)
    operating_hours JSONB DEFAULT '{
        "monday": {"enabled": true, "start": "09:00", "end": "23:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "23:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "23:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "23:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "23:00"},
        "saturday": {"enabled": true, "start": "09:00", "end": "23:00"},
        "sunday": {"enabled": true, "start": "09:00", "end": "23:00"}
    }',
    
    -- Configurações especiais
    special_instructions TEXT,
    requires_phone_confirmation BOOLEAN DEFAULT false,
    
    -- Metadata e timestamps
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_zone_configuration CHECK (
        (zone_type = 'circle' AND center_point IS NOT NULL AND radius_meters IS NOT NULL AND radius_meters > 0) OR
        (zone_type = 'polygon' AND polygon_coordinates IS NOT NULL)
    ),
    CONSTRAINT valid_delivery_settings CHECK (
        delivery_fee >= 0 AND 
        minimum_order >= 0 AND 
        estimated_delivery_time_minutes > 0 AND
        priority > 0
    )
);

-- Tabela para exclusões dentro das zonas (zonas que devem ser excluídas)
CREATE TABLE delivery_zone_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
    
    -- Área a ser excluída
    name TEXT NOT NULL,
    exclusion_type delivery_zone_type NOT NULL,
    
    -- Para exclusões circulares
    center_point GEOGRAPHY(POINT, 4326),
    radius_meters INTEGER,
    
    -- Para exclusões poligonais
    polygon_coordinates GEOGRAPHY(POLYGON, 4326),
    
    -- Razão da exclusão
    reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_exclusion_configuration CHECK (
        (exclusion_type = 'circle' AND center_point IS NOT NULL AND radius_meters IS NOT NULL AND radius_meters > 0) OR
        (exclusion_type = 'polygon' AND polygon_coordinates IS NOT NULL)
    )
);

-- Tabela para cache de validações de endereços (performance)
CREATE TABLE address_validation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Endereço original
    original_address TEXT NOT NULL,
    
    -- Coordenadas geocodificadas
    geocoded_lat DECIMAL(10,8) NOT NULL,
    geocoded_lng DECIMAL(11,8) NOT NULL,
    geocoded_address TEXT NOT NULL, -- Endereço formatado pelo geocoding
    
    -- Validação de entrega
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    delivery_zone_id UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
    is_deliverable BOOLEAN NOT NULL,
    
    -- Configurações aplicadas
    delivery_fee DECIMAL(10,2),
    minimum_order DECIMAL(10,2),
    estimated_delivery_time_minutes INTEGER,
    
    -- Cache metadata
    geocoding_provider TEXT DEFAULT 'google_maps',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- FUNÇÕES PARA VALIDAÇÃO GEOGRÁFICA
-- =====================================

-- Função para verificar se um ponto está dentro de uma zona circular
CREATE OR REPLACE FUNCTION point_in_circle(
    point_lat DECIMAL,
    point_lng DECIMAL,
    center_lat DECIMAL,
    center_lng DECIMAL,
    radius_meters INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN ST_DWithin(
        ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
    );
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se um ponto está dentro de um polígono
CREATE OR REPLACE FUNCTION point_in_polygon(
    point_lat DECIMAL,
    point_lng DECIMAL,
    polygon_coords GEOGRAPHY
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN ST_Within(
        ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)::geography,
        polygon_coords
    );
END;
$$ LANGUAGE plpgsql;

-- Função principal para validar endereço de entrega
CREATE OR REPLACE FUNCTION validate_delivery_address(
    restaurant_id_param UUID,
    address_lat DECIMAL,
    address_lng DECIMAL
) RETURNS TABLE (
    is_deliverable BOOLEAN,
    delivery_zone_id UUID,
    delivery_fee DECIMAL,
    minimum_order DECIMAL,
    estimated_delivery_time_minutes INTEGER,
    zone_name TEXT,
    special_instructions TEXT
) AS $$
DECLARE
    zone_record RECORD;
    exclusion_record RECORD;
    point_geog GEOGRAPHY;
BEGIN
    -- Criar ponto geográfico
    point_geog := ST_SetSRID(ST_MakePoint(address_lng, address_lat), 4326)::geography;
    
    -- Buscar zonas de entrega do restaurante ordenadas por prioridade
    FOR zone_record IN
        SELECT dz.*, ST_AsText(dz.center_point) as center_text, ST_AsText(dz.polygon_coordinates) as polygon_text
        FROM delivery_zones dz
        WHERE dz.restaurant_id = restaurant_id_param
        AND dz.status = 'active'
        ORDER BY dz.priority DESC
    LOOP
        -- Verificar se o ponto está dentro da zona
        IF (zone_record.zone_type = 'circle' AND 
            ST_DWithin(point_geog, zone_record.center_point, zone_record.radius_meters)) OR
           (zone_record.zone_type = 'polygon' AND 
            ST_Within(point_geog, zone_record.polygon_coordinates)) THEN
            
            -- Verificar se não está em nenhuma exclusão
            FOR exclusion_record IN
                SELECT dze.*
                FROM delivery_zone_exclusions dze
                WHERE dze.delivery_zone_id = zone_record.id
            LOOP
                IF (exclusion_record.exclusion_type = 'circle' AND 
                    ST_DWithin(point_geog, exclusion_record.center_point, exclusion_record.radius_meters)) OR
                   (exclusion_record.exclusion_type = 'polygon' AND 
                    ST_Within(point_geog, exclusion_record.polygon_coordinates)) THEN
                    -- Está em área de exclusão, continuar procurando
                    CONTINUE;
                END IF;
            END LOOP;
            
            -- Se chegou aqui, está dentro da zona e não está excluído
            RETURN QUERY SELECT 
                true,
                zone_record.id,
                zone_record.delivery_fee,
                zone_record.minimum_order,
                zone_record.estimated_delivery_time_minutes,
                zone_record.name,
                zone_record.special_instructions;
            RETURN;
        END IF;
    END LOOP;
    
    -- Se chegou aqui, não está em nenhuma zona de entrega
    RETURN QUERY SELECT false, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- TRIGGERS E ATUALIZAÇÕES
-- =====================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_zones_updated_at
    BEFORE UPDATE ON delivery_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_zone_exclusions_updated_at
    BEFORE UPDATE ON delivery_zone_exclusions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_address_validation_cache_updated_at
    BEFORE UPDATE ON address_validation_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================

-- Índices geográficos
CREATE INDEX idx_delivery_zones_center_point ON delivery_zones USING GIST (center_point);
CREATE INDEX idx_delivery_zones_polygon ON delivery_zones USING GIST (polygon_coordinates);
CREATE INDEX idx_delivery_zone_exclusions_center_point ON delivery_zone_exclusions USING GIST (center_point);
CREATE INDEX idx_delivery_zone_exclusions_polygon ON delivery_zone_exclusions USING GIST (polygon_coordinates);

-- Índices de performance
CREATE INDEX idx_delivery_zones_restaurant_status ON delivery_zones (restaurant_id, status);
CREATE INDEX idx_delivery_zones_priority ON delivery_zones (restaurant_id, priority DESC);
CREATE INDEX idx_address_validation_cache_lookup ON address_validation_cache (original_address, restaurant_id);
CREATE INDEX idx_address_validation_cache_expires ON address_validation_cache (expires_at);

-- =====================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================

-- Habilitar RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zone_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_validation_cache ENABLE ROW LEVEL SECURITY;

-- Política para delivery_zones
CREATE POLICY "Users can view zones for accessible restaurants" ON delivery_zones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = delivery_zones.restaurant_id
            AND (
                r.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('super_admin', 'platform_owner')
                )
            )
        )
    );

CREATE POLICY "Restaurant owners can manage their zones" ON delivery_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = delivery_zones.restaurant_id
            AND r.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all zones" ON delivery_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('super_admin', 'platform_owner')
        )
    );

-- Política para exclusões (herda do delivery_zones)
CREATE POLICY "Users can view exclusions for accessible zones" ON delivery_zone_exclusions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM delivery_zones dz
            JOIN restaurants r ON r.id = dz.restaurant_id
            WHERE dz.id = delivery_zone_exclusions.delivery_zone_id
            AND (
                r.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('super_admin', 'platform_owner')
                )
            )
        )
    );

CREATE POLICY "Restaurant owners can manage their zone exclusions" ON delivery_zone_exclusions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM delivery_zones dz
            JOIN restaurants r ON r.id = dz.restaurant_id
            WHERE dz.id = delivery_zone_exclusions.delivery_zone_id
            AND r.owner_id = auth.uid()
        )
    );

-- Política para cache (público para leitura, restrito para escrita)
CREATE POLICY "Anyone can read address validation cache" ON address_validation_cache
    FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can write to cache" ON address_validation_cache
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================
-- DADOS EXEMPLO PARA TESTES
-- =====================================

-- Inserir zona de entrega circular de exemplo para o primeiro restaurante
DO $$
DECLARE
    first_restaurant_id UUID;
    first_org_id UUID;
BEGIN
    -- Buscar primeiro restaurante ativo
    SELECT id, organization_id INTO first_restaurant_id, first_org_id
    FROM restaurants 
    WHERE is_active = true 
    LIMIT 1;
    
    IF first_restaurant_id IS NOT NULL THEN
        -- Inserir zona circular (raio de 5km)
        INSERT INTO delivery_zones (
            organization_id,
            restaurant_id,
            name,
            description,
            zone_type,
            center_point,
            radius_meters,
            delivery_fee,
            minimum_order,
            estimated_delivery_time_minutes,
            priority
        ) VALUES (
            first_org_id,
            first_restaurant_id,
            'Zona Central - 5km',
            'Zona de entrega principal com raio de 5 quilómetros',
            'circle',
            ST_SetSRID(ST_MakePoint(-9.1393, 38.7223), 4326)::geography, -- Lisboa centro
            5000, -- 5km em metros
            2.50,
            15.00,
            30,
            1
        );
        
        -- Inserir zona polígonal de exemplo
        INSERT INTO delivery_zones (
            organization_id,
            restaurant_id,
            name,
            description,
            zone_type,
            polygon_coordinates,
            delivery_fee,
            minimum_order,
            estimated_delivery_time_minutes,
            priority
        ) VALUES (
            first_org_id,
            first_restaurant_id,
            'Zona Alfama/Mouraria',
            'Zona personalizada cobrindo Alfama e Mouraria',
            'polygon',
            ST_SetSRID(ST_GeomFromText('POLYGON((-9.1340 38.7150, -9.1280 38.7150, -9.1280 38.7200, -9.1340 38.7200, -9.1340 38.7150))'), 4326)::geography,
            3.00,
            20.00,
            25,
            2
        );
    END IF;
END $$;

-- =====================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================

COMMENT ON TABLE delivery_zones IS 'Zonas de entrega configuráveis para restaurantes - suporte a círculos e polígonos';
COMMENT ON TABLE delivery_zone_exclusions IS 'Áreas de exclusão dentro das zonas de entrega';
COMMENT ON TABLE address_validation_cache IS 'Cache de validações de endereços para melhorar performance';

COMMENT ON FUNCTION validate_delivery_address IS 'Função principal para validar se um endereço está dentro das zonas de entrega de um restaurante';
COMMENT ON FUNCTION point_in_circle IS 'Verifica se um ponto está dentro de um círculo geográfico';
COMMENT ON FUNCTION point_in_polygon IS 'Verifica se um ponto está dentro de um polígono geográfico'; 