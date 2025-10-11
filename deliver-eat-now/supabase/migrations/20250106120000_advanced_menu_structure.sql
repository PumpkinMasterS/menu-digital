-- ============================================================================
-- ADVANCED MENU STRUCTURE MIGRATION
-- Migração para sistema avançado de menus com seções e opções
-- ============================================================================

-- ============================================================================
-- MENU SECTIONS TABLE
-- ============================================================================

-- Criar tabela de seções do menu (ex: Pratos Principais, Sobremesas, Bebidas)
CREATE TABLE menu_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_menu_sections_restaurant_id ON menu_sections(restaurant_id);
CREATE INDEX idx_menu_sections_sort_order ON menu_sections(restaurant_id, sort_order);

-- ============================================================================
-- MEAL OPTIONS TABLE  
-- ============================================================================

-- Criar tabela de opções de pratos (extras, bebidas, acompanhamentos)
CREATE TABLE meal_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('extra', 'drink', 'side', 'sauce', 'size')),
    label TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    max_selections INTEGER DEFAULT 1, -- Para opções múltiplas
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_meal_options_meal_id ON meal_options(meal_id);
CREATE INDEX idx_meal_options_type ON meal_options(type);

-- ============================================================================
-- ENHANCE EXISTING TABLES
-- ============================================================================

-- Adicionar seção às refeições existentes
ALTER TABLE meals 
ADD COLUMN section_id UUID REFERENCES menu_sections(id) ON DELETE SET NULL,
ADD COLUMN sort_order INTEGER DEFAULT 0,
ADD COLUMN preparation_time_minutes INTEGER DEFAULT 15,
ADD COLUMN allergens TEXT[], -- Array de alergénios
ADD COLUMN nutritional_info JSONB DEFAULT '{}', -- Informações nutricionais
ADD COLUMN tags TEXT[], -- Tags como "vegetariano", "picante", etc.
ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;

-- Índices para performance nas refeições
CREATE INDEX idx_meals_section_id ON meals(section_id);
CREATE INDEX idx_meals_sort_order ON meals(section_id, sort_order);
CREATE INDEX idx_meals_tags ON meals USING GIN(tags);

-- Melhorar tabela de restaurantes para suportar mais campos administrativos
ALTER TABLE restaurants
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN business_hours JSONB DEFAULT '{}',
ADD COLUMN delivery_zones JSONB DEFAULT '[]',
ADD COLUMN payment_methods TEXT[] DEFAULT ARRAY['cash', 'card', 'mbway'],
ADD COLUMN features TEXT[] DEFAULT ARRAY[], -- ex: 'organic', 'vegan_options', 'fast_delivery'
ADD COLUMN social_media JSONB DEFAULT '{}',
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
ADD COLUMN verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_options ENABLE ROW LEVEL SECURITY;

-- Políticas para menu_sections
CREATE POLICY "Anyone can view active menu sections"
    ON menu_sections FOR SELECT
    USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their menu sections"
    ON menu_sections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = restaurant_id 
            AND r.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all menu sections"
    ON menu_sections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'platform_owner')
        )
    );

-- Políticas para meal_options
CREATE POLICY "Anyone can view active meal options"
    ON meal_options FOR SELECT
    USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM meals m 
            JOIN restaurants r ON m.restaurant_id = r.id 
            WHERE m.id = meal_id 
            AND r.is_active = true 
            AND m.is_available = true
        )
    );

CREATE POLICY "Restaurant owners can manage their meal options"
    ON meal_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM meals m 
            JOIN restaurants r ON m.restaurant_id = r.id 
            WHERE m.id = meal_id 
            AND r.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all meal options"
    ON meal_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'platform_owner')
        )
    );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_menu_sections_updated_at
    BEFORE UPDATE ON menu_sections
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_meal_options_updated_at
    BEFORE UPDATE ON meal_options
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Função para obter menu completo de um restaurante
CREATE OR REPLACE FUNCTION get_restaurant_full_menu(restaurant_uuid UUID)
RETURNS TABLE (
    section_id UUID,
    section_name TEXT,
    section_sort_order INTEGER,
    meal_id UUID,
    meal_name TEXT,
    meal_description TEXT,
    meal_price DECIMAL,
    meal_image_url TEXT,
    meal_sort_order INTEGER,
    meal_tags TEXT[],
    meal_allergens TEXT[],
    option_id UUID,
    option_type TEXT,
    option_label TEXT,
    option_price DECIMAL,
    option_is_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.id as section_id,
        ms.name as section_name,
        ms.sort_order as section_sort_order,
        m.id as meal_id,
        m.name as meal_name,
        m.description as meal_description,
        m.price as meal_price,
        m.image_url as meal_image_url,
        m.sort_order as meal_sort_order,
        m.tags as meal_tags,
        m.allergens as meal_allergens,
        mo.id as option_id,
        mo.type as option_type,
        mo.label as option_label,
        mo.price as option_price,
        mo.is_required as option_is_required
    FROM menu_sections ms
    LEFT JOIN meals m ON ms.id = m.section_id AND m.is_available = true
    LEFT JOIN meal_options mo ON m.id = mo.meal_id AND mo.is_active = true
    WHERE ms.restaurant_id = restaurant_uuid 
    AND ms.is_active = true
    ORDER BY ms.sort_order, m.sort_order, mo.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar seções padrão de menu
CREATE OR REPLACE FUNCTION create_default_menu_sections(restaurant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO menu_sections (restaurant_id, name, description, sort_order) VALUES
    (restaurant_uuid, 'Entradas', 'Para começar a refeição', 1),
    (restaurant_uuid, 'Pratos Principais', 'Especialidades da casa', 2),
    (restaurant_uuid, 'Sobremesas', 'Doces tradicionais', 3),
    (restaurant_uuid, 'Bebidas', 'Refrigerantes, sumos e águas', 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================================================

-- Inserir dados de exemplo apenas se não existirem
DO $$
BEGIN
    -- Verificar se já existem dados
    IF NOT EXISTS (SELECT 1 FROM menu_sections LIMIT 1) THEN
        -- Criar seções de exemplo para restaurantes existentes
        INSERT INTO menu_sections (restaurant_id, name, description, sort_order)
        SELECT 
            r.id,
            section_name,
            section_desc,
            sort_ord
        FROM restaurants r,
        (VALUES 
            ('Entradas', 'Petiscos e aperitivos', 1),
            ('Pratos Principais', 'Especialidades da casa', 2),
            ('Sobremesas', 'Doces tradicionais', 3),
            ('Bebidas', 'Refrigerantes e sumos', 4)
        ) AS sections(section_name, section_desc, sort_ord)
        WHERE r.is_active = true
        LIMIT 20; -- Limitar para não sobrecarregar
    END IF;
END $$;

-- ============================================================================
-- VIEWS FOR EASY ACCESS
-- ============================================================================

-- View para menu completo estruturado
CREATE OR REPLACE VIEW v_restaurant_menus AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    ms.id as section_id,
    ms.name as section_name,
    ms.sort_order as section_order,
    m.id as meal_id,
    m.name as meal_name,
    m.description as meal_description,
    m.price as meal_price,
    m.image_url as meal_image,
    m.sort_order as meal_order,
    m.tags as meal_tags,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', mo.id,
                'type', mo.type,
                'label', mo.label,
                'price', mo.price,
                'required', mo.is_required
            ) ORDER BY mo.sort_order
        ) FILTER (WHERE mo.id IS NOT NULL),
        '[]'::json
    ) as meal_options
FROM restaurants r
LEFT JOIN menu_sections ms ON r.id = ms.restaurant_id AND ms.is_active = true
LEFT JOIN meals m ON ms.id = m.section_id AND m.is_available = true
LEFT JOIN meal_options mo ON m.id = mo.meal_id AND mo.is_active = true
WHERE r.is_active = true
GROUP BY r.id, r.name, ms.id, ms.name, ms.sort_order, m.id, m.name, m.description, m.price, m.image_url, m.sort_order, m.tags
ORDER BY r.name, ms.sort_order, m.sort_order;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Permitir acesso às novas tabelas para usuários autenticados
GRANT SELECT ON menu_sections TO authenticated;
GRANT SELECT ON meal_options TO authenticated;
GRANT SELECT ON v_restaurant_menus TO authenticated;

-- Permitir operações completas para service role
GRANT ALL ON menu_sections TO service_role;
GRANT ALL ON meal_options TO service_role;
GRANT ALL ON v_restaurant_menus TO service_role; 