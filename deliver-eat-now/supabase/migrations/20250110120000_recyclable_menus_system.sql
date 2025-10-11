-- Migration: Sistema de Menus Recicláveis
-- Permite criar templates globais e clonar menus entre restaurantes

-- 1. Adicionar campos para sistema de templates
ALTER TABLE menus 
ADD COLUMN is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN template_category VARCHAR(50),
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN cloned_from_menu_id UUID REFERENCES menus(id),
ADD COLUMN clone_count INTEGER DEFAULT 0;

-- 2. Criar tabela de menu templates globais
CREATE TABLE menu_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- ex: 'portuguese', 'italian', 'fast_food', 'vegetarian'
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Criar tabela de template items (pratos do template)
CREATE TABLE menu_template_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES menu_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100), -- ex: 'starters', 'mains', 'desserts', 'drinks'
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  allergens TEXT[], -- array de alérgenos
  nutritional_info JSONB, -- informações nutricionais
  preparation_time INTEGER, -- tempo de preparação em minutos
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Criar função para clonar menu template
CREATE OR REPLACE FUNCTION clone_menu_template(
  template_id UUID,
  target_restaurant_id UUID,
  menu_name VARCHAR(255) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_menu_id UUID;
  template_item RECORD;
  menu_title VARCHAR(255);
BEGIN
  -- Verificar se o template existe
  SELECT name INTO menu_title FROM menu_templates WHERE id = template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template não encontrado: %', template_id;
  END IF;

  -- Usar nome fornecido ou nome do template
  IF menu_name IS NULL THEN
    menu_title := menu_title || ' (Clonado)';
  ELSE
    menu_title := menu_name;
  END IF;

  -- Criar novo menu no restaurante
  INSERT INTO menus (
    restaurant_id,
    name,
    description,
    is_active,
    is_template,
    cloned_from_menu_id
  )
  SELECT 
    target_restaurant_id,
    menu_title,
    mt.description || ' (Baseado em template)',
    TRUE,
    FALSE,
    template_id
  FROM menu_templates mt 
  WHERE mt.id = template_id
  RETURNING id INTO new_menu_id;

  -- Clonar todos os items do template
  FOR template_item IN 
    SELECT * FROM menu_template_items WHERE template_id = template_id
  LOOP
    INSERT INTO menu_items (
      menu_id,
      name,
      description,
      price,
      category,
      image_url,
      is_available,
      allergens,
      nutritional_info,
      preparation_time,
      sort_order
    ) VALUES (
      new_menu_id,
      template_item.name,
      template_item.description,
      template_item.price,
      template_item.category,
      template_item.image_url,
      template_item.is_available,
      template_item.allergens,
      template_item.nutritional_info,
      template_item.preparation_time,
      template_item.sort_order
    );
  END LOOP;

  -- Incrementar contador de uso do template
  UPDATE menu_templates 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;

  -- Incrementar contador de clone do menu original (se existir)
  UPDATE menus 
  SET clone_count = clone_count + 1 
  WHERE id = template_id;

  RETURN new_menu_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar função para criar template a partir de menu existente
CREATE OR REPLACE FUNCTION create_template_from_menu(
  source_menu_id UUID,
  template_name VARCHAR(255),
  template_description TEXT DEFAULT NULL,
  template_category VARCHAR(100) DEFAULT 'custom',
  creator_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
  menu_item RECORD;
  source_menu RECORD;
BEGIN
  -- Buscar informações do menu original
  SELECT * INTO source_menu FROM menus WHERE id = source_menu_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu não encontrado: %', source_menu_id;
  END IF;

  -- Criar template
  INSERT INTO menu_templates (
    name,
    description,
    category,
    created_by,
    is_public
  ) VALUES (
    template_name,
    COALESCE(template_description, source_menu.description),
    template_category,
    creator_id,
    FALSE -- Templates criados por usuários são privados por padrão
  ) RETURNING id INTO new_template_id;

  -- Copiar todos os items do menu para o template
  FOR menu_item IN 
    SELECT * FROM menu_items WHERE menu_id = source_menu_id AND is_available = TRUE
  LOOP
    INSERT INTO menu_template_items (
      template_id,
      name,
      description,
      price,
      category,
      image_url,
      is_available,
      allergens,
      nutritional_info,
      preparation_time,
      sort_order
    ) VALUES (
      new_template_id,
      menu_item.name,
      menu_item.description,
      menu_item.price,
      menu_item.category,
      menu_item.image_url,
      menu_item.is_available,
      menu_item.allergens,
      menu_item.nutritional_info,
      menu_item.preparation_time,
      menu_item.sort_order
    );
  END LOOP;

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar índices para performance
CREATE INDEX idx_menu_templates_category ON menu_templates(category);
CREATE INDEX idx_menu_templates_public ON menu_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_menu_templates_created_by ON menu_templates(created_by);
CREATE INDEX idx_menu_template_items_template_id ON menu_template_items(template_id);
CREATE INDEX idx_menus_is_template ON menus(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_menus_cloned_from ON menus(cloned_from_menu_id) WHERE cloned_from_menu_id IS NOT NULL;

-- 7. Inserir templates globais padrão
INSERT INTO menu_templates (name, description, category, is_public, created_by) VALUES
('Menu Português Tradicional', 'Pratos típicos da culinária portuguesa', 'portuguese', TRUE, NULL),
('Menu Italiano Clássico', 'Massas e pratos italianos tradicionais', 'italian', TRUE, NULL),
('Menu Fast Food', 'Hambúrgueres, batatas fritas e bebidas', 'fast_food', TRUE, NULL),
('Menu Vegetariano', 'Opções 100% vegetarianas e saudáveis', 'vegetarian', TRUE, NULL),
('Menu de Petiscos', 'Tapas e petiscos para partilhar', 'tapas', TRUE, NULL);

-- Template: Menu Português Tradicional
WITH portuguese_template AS (
  SELECT id FROM menu_templates WHERE name = 'Menu Português Tradicional' LIMIT 1
)
INSERT INTO menu_template_items (template_id, name, description, price, category, preparation_time) 
SELECT 
  pt.id,
  item.name,
  item.description,
  item.price,
  item.category,
  item.preparation_time
FROM portuguese_template pt, (VALUES
  ('Francesinha', 'Tradicional sanduíche do Porto com molho especial', 12.50, 'mains', 20),
  ('Bacalhau à Brás', 'Bacalhau desfiado com batata palha e ovos', 14.00, 'mains', 25),
  ('Caldo Verde', 'Sopa tradicional portuguesa com couve e chouriço', 4.50, 'starters', 15),
  ('Pastel de Nata', 'Doce conventual português', 1.20, 'desserts', 5),
  ('Bifana', 'Sanduíche de porco em pão', 3.50, 'snacks', 10),
  ('Vinho Verde', 'Vinho português leve e refrescante', 3.00, 'drinks', 0)
) AS item(name, description, price, category, preparation_time);

-- Template: Menu Italiano Clássico
WITH italian_template AS (
  SELECT id FROM menu_templates WHERE name = 'Menu Italiano Clássico' LIMIT 1
)
INSERT INTO menu_template_items (template_id, name, description, price, category, preparation_time)
SELECT 
  it.id,
  item.name,
  item.description,
  item.price,
  item.category,
  item.preparation_time
FROM italian_template it, (VALUES
  ('Pizza Margherita', 'Molho de tomate, mozzarella e manjericão', 8.50, 'mains', 15),
  ('Spaghetti Carbonara', 'Massa com ovos, queijo pecorino e guanciale', 11.00, 'mains', 20),
  ('Risotto ai Funghi', 'Risotto cremoso com cogumelos porcini', 13.50, 'mains', 25),
  ('Bruschetta', 'Pão torrado com tomate, alho e manjericão', 5.50, 'starters', 8),
  ('Tiramisu', 'Sobremesa italiana com café e mascarpone', 4.50, 'desserts', 10),
  ('Chianti Classico', 'Vinho tinto italiano', 4.00, 'drinks', 0)
) AS item(name, description, price, category, preparation_time);

-- Template: Menu Fast Food
WITH fastfood_template AS (
  SELECT id FROM menu_templates WHERE name = 'Menu Fast Food' LIMIT 1
)
INSERT INTO menu_template_items (template_id, name, description, price, category, preparation_time)
SELECT 
  ft.id,
  item.name,
  item.description,
  item.price,
  item.category,
  item.preparation_time
FROM fastfood_template ft, (VALUES
  ('Cheeseburger Clássico', 'Hambúrguer com queijo, alface e tomate', 6.50, 'mains', 12),
  ('Batatas Fritas', 'Batatas crocantes cortadas na perfeição', 2.50, 'sides', 8),
  ('Nuggets de Frango', '6 unidades de nuggets crocantes', 4.50, 'mains', 10),
  ('Milkshake de Chocolate', 'Batido cremoso de chocolate', 3.50, 'drinks', 5),
  ('Coca-Cola', 'Refrigerante clássico', 1.50, 'drinks', 0),
  ('Sundae de Morango', 'Gelado com calda de morango', 2.50, 'desserts', 3)
) AS item(name, description, price, category, preparation_time);

-- 8. RLS Policies para menu_templates
ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_template_items ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer um pode ver templates públicos
CREATE POLICY "Public templates are viewable by everyone" ON menu_templates
  FOR SELECT USING (is_public = TRUE);

-- Policy: Platform owners podem ver todos os templates
CREATE POLICY "Platform owners can view all templates" ON menu_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

-- Policy: Usuários podem ver seus próprios templates
CREATE POLICY "Users can view own templates" ON menu_templates
  FOR ALL USING (created_by = auth.uid());

-- Policy: Super admins podem ver templates da sua região
CREATE POLICY "Super admins can view regional templates" ON menu_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    ) AND (is_public = TRUE OR created_by = auth.uid())
  );

-- Policy: Items de templates seguem a visibilidade do template
CREATE POLICY "Template items follow template visibility" ON menu_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menu_templates mt
      WHERE mt.id = template_id
      AND (
        mt.is_public = TRUE 
        OR mt.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('platform_owner', 'super_admin')
        )
      )
    )
  );

-- Policy: Platform owners podem criar/editar qualquer template
CREATE POLICY "Platform owners can manage all templates" ON menu_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

-- Policy: Platform owners podem gerir items de templates
CREATE POLICY "Platform owners can manage template items" ON menu_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'platform_owner'
    )
  );

-- 9. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_menu_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_templates_updated_at
  BEFORE UPDATE ON menu_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_templates_updated_at();

COMMENT ON TABLE menu_templates IS 'Templates globais de menus que podem ser clonados para restaurantes';
COMMENT ON TABLE menu_template_items IS 'Items/pratos que fazem parte dos templates de menu';
COMMENT ON FUNCTION clone_menu_template IS 'Clona um template de menu para um restaurante específico';
COMMENT ON FUNCTION create_template_from_menu IS 'Cria um template a partir de um menu existente'; 