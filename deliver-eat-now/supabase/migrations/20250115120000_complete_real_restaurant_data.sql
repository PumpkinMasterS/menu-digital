-- Migration: Complete real restaurant data with menus and modifiers
-- Created: 2025-01-15
-- Purpose: Replace sample data with real Portuguese restaurants and complete menus

-- First, clear existing data
DELETE FROM menu_item_modifiers;
DELETE FROM menu_modifier_options;
DELETE FROM menu_modifiers;
DELETE FROM menu_items;
DELETE FROM menu_categories;
DELETE FROM restaurants WHERE name NOT LIKE '%Platform%' AND name NOT LIKE '%Test%';

-- Insert real Portuguese restaurants
INSERT INTO restaurants (
  id, name, display_name, description, marketing_description, 
  image_url, banner_url, address, phone, email,
  is_active, delivery_fee, minimum_order, delivery_time_min, delivery_time_max,
  rating, business_hours
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'Cervejaria Ramiro',
  'Cervejaria Ramiro',
  'Especialistas em marisco desde 1956',
  'A mais famosa cervejaria de Lisboa, conhecida mundialmente pelos seus percebes, camarão e santola. Uma experiência gastronómica única no coração da cidade.',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&h=1080&fit=crop',
  'Av. Almirante Reis, 1-H, 1150-007 Lisboa',
  '+351 218 851 024',
  'ramiro@cervejariaramiro.pt',
  true, 3.50, 25.00, 30, 45, 4.7,
  jsonb_build_object(
    'tuesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '00:00'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '00:00'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '00:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '00:00'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '00:00'),
    'sunday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '23:00'),
    'monday', jsonb_build_object('isOpen', false, 'open', '', 'close', '')
  )
),
(
  '22222222-2222-2222-2222-222222222222',
  'Gambrinus Lisboa',
  'Gambrinus',
  'Tradição gastronómica desde 1936',
  'Restaurante de luxo no coração da Baixa Lisboeta. Famoso pela sua cozinha tradicional portuguesa, ambiente elegante e pelos pratos como Empadão de Perdiz e Crepes Suzette.',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop',
  'Rua das Portas de Santo Antão, 23, 1150-264 Lisboa',
  '+351 213 421 466',
  'info@gambrinuslisboa.com',
  true, 2.50, 30.00, 25, 35, 4.8,
  jsonb_build_object(
    'monday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00'),
    'tuesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00'),
    'sunday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '24:00')
  )
),
(
  '33333333-3333-3333-3333-333333333333',
  'A Casa do Bacalhau',
  'Casa do Bacalhau',
  'O verdadeiro sabor do bacalhau português',
  'Especializada nos 365 modos de confecionar bacalhau. Um restaurante que celebra o ingrediente mais icónico da gastronomia portuguesa com criatividade e tradição.',
  'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1920&h=1080&fit=crop',
  'Rua do Alecrim, 45, 1200-014 Lisboa',
  '+351 213 247 830',
  'geral@acasadobacalhau.com',
  true, 2.00, 20.00, 20, 30, 4.5,
  jsonb_build_object(
    'monday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '22:30'),
    'tuesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '22:30'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '22:30'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '23:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '23:30'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '23:30'),
    'sunday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '22:00')
  )
),
(
  '44444444-4444-4444-4444-444444444444',
  'Taberna do Real Fado',
  'Taberna do Real Fado',
  'Cozinha tradicional com fado ao vivo',
  'Autêntica taberna portuguesa com espetáculos de fado todas as noites. Pratos tradicionais, ambiente familiar e a alma de Lisboa numa experiência gastronómica única.',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop',
  'Rua da Barroca, 56, 1200-047 Lisboa',
  '+351 213 467 293',
  'reservas@tabernadorealfado.pt',
  true, 2.00, 15.00, 25, 40, 4.4,
  jsonb_build_object(
    'monday', jsonb_build_object('isOpen', false, 'open', '', 'close', ''),
    'tuesday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '02:00'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '02:00'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '02:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '03:00'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '03:00'),
    'sunday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '01:00')
  )
),
(
  '55555555-5555-5555-5555-555555555555',
  'Pastéis de Belém',
  'Pastéis de Belém',
  'Os originais pastéis de nata desde 1837',
  'A casa original dos famosos Pastéis de Belém. Receita secreta guardada há mais de 180 anos. Uma paragem obrigatória para quem visita Lisboa.',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&h=1080&fit=crop',
  'Rua de Belém, 84-92, 1300-085 Lisboa',
  '+351 213 637 423',
  'geral@pasteisdebelem.pt',
  true, 1.50, 8.00, 15, 25, 4.6,
  jsonb_build_object(
    'monday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00'),
    'tuesday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00'),
    'sunday', jsonb_build_object('isOpen', true, 'open', '08:00', 'close', '24:00')
  )
),
(
  '66666666-6666-6666-6666-666666666666',
  'Tasquinha do Lagarto',
  'Tasquinha do Lagarto',
  'Petiscos e vinhos no Chiado',
  'Pequena tasca no coração do Chiado com os melhores petiscos portugueses. Ambiente descontraído, vinhos selecionados e iguarias tradicionais numa atmosfera autêntica.',
  'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=1920&h=1080&fit=crop',
  'Calçada Nova de São Francisco, 8, 1200-300 Lisboa',
  '+351 213 421 112',
  'lagarto@tasquinha.pt',
  true, 1.99, 12.00, 20, 35, 4.3,
  jsonb_build_object(
    'monday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '01:00'),
    'tuesday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '01:00'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '01:00'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '02:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '03:00'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '03:00'),
    'sunday', jsonb_build_object('isOpen', false, 'open', '', 'close', '')
  )
);

-- Insert menu categories for Cervejaria Ramiro
INSERT INTO menu_categories (id, restaurant_id, name, description, display_order, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Entradas', 'Entradas e aperitivos', 1, true),
('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Marisco', 'Especialidades em marisco fresco', 2, true),
('c1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Grelhados', 'Peixes e carnes grelhadas', 3, true),
('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Bebidas', 'Vinhos e cervejas', 4, true);

-- Insert menu categories for Gambrinus
INSERT INTO menu_categories (id, restaurant_id, name, description, display_order, is_active) VALUES
('c2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Entradas', 'Entradas tradicionais', 1, true),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Sopas', 'Sopas tradicionais portuguesas', 2, true),
('c2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Especialidades', 'Pratos de assinatura', 3, true),
('c2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'Sobremesas', 'Doces tradicionais', 4, true);

-- Insert menu categories for Casa do Bacalhau
INSERT INTO menu_categories (id, restaurant_id, name, description, display_order, is_active) VALUES
('c3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Entradas', 'Aperitivos e entradas', 1, true),
('c3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Bacalhau', 'Especialidades de bacalhau', 2, true),
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Outros Peixes', 'Pratos de peixe variados', 3, true),
('c3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Sobremesas', 'Doces caseiros', 4, true);

-- Insert menu categories for Taberna do Real Fado
INSERT INTO menu_categories (id, restaurant_id, name, description, display_order, is_active) VALUES
('c4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'Petiscos', 'Petiscos tradicionais', 1, true),
('c4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'Pratos Principais', 'Pratos de carne e peixe', 2, true),
('c4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'Vinhos', 'Carta de vinhos', 3, true),
('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Sobremesas', 'Doces da casa', 4, true);

-- Insert menu categories for Pastéis de Belém
INSERT INTO menu_categories (id, restaurant_id, name, description, display_order, is_active) VALUES
('c5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'Pastéis', 'Pastéis de nata originais', 1, true),
('c5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'Doçaria', 'Outras especialidades doces', 2, true),
('c5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', 'Salgados', 'Salgados tradicionais', 3, true),
('c5555555-5555-5555-5555-555555555554', '55555555-5555-5555-5555-555555555555', 'Bebidas', 'Cafés e bebidas', 4, true);

-- Insert menu categories for Tasquinha do Lagarto
INSERT INTO menu_categories (id, restaurant_id, name, description, display_order, is_active) VALUES
('c6666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666666', 'Petiscos', 'Petiscos variados', 1, true),
('c6666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666666', 'Conservas', 'Conservas portuguesas', 2, true),
('c6666666-6666-6666-6666-666666666663', '66666666-6666-6666-6666-666666666666', 'Queijos e Enchidos', 'Queijos e enchidos nacionais', 3, true),
('c6666666-6666-6666-6666-666666666664', '66666666-6666-6666-6666-666666666666', 'Vinhos', 'Vinhos portugueses', 4, true);

-- Insert menu items for Cervejaria Ramiro
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, display_order, allergens) VALUES
-- Entradas
('i1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Pão com Manteiga', 'Pão quente com manteiga', 3.50, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop', true, 1, '["glúten", "leite"]'),
('i1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Azeitonas Mistas', 'Azeitonas verdes e pretas temperadas', 4.50, 'https://images.unsplash.com/photo-1486588982564-9e9d1e89f4b1?w=400&h=300&fit=crop', true, 2, null),
-- Marisco
('i1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Percebes', 'Percebes frescos do mar português', 28.00, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop', true, 1, '["crustáceos"]'),
('i1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Camarão Cozido', 'Camarão tigre cozido (kg)', 45.00, 'https://images.unsplash.com/photo-1633479389810-cc4bb4a82e6b?w=400&h=300&fit=crop', true, 2, '["crustáceos"]'),
('i1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Santola Cozida', 'Santola fresca cozida (unidade)', 35.00, 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop', true, 3, '["crustáceos"]'),
-- Grelhados
('i1111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113', 'Linguado Grelhado', 'Linguado fresco grelhado', 22.00, 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop', true, 1, '["peixe"]'),
('i1111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113', 'Polvo à Lagareiro', 'Polvo grelhado com azeite e alho', 18.50, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop', true, 2, '["moluscos"]');

-- Insert menu items for Gambrinus
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, display_order, allergens) VALUES
-- Entradas
('i2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222221', 'Ameijoas à Bulhão Pato', 'Ameijoas com coentros e alho', 14.50, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop', true, 1, '["moluscos"]'),
-- Sopas
('i2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Sopa Rica de Peixe', 'Especialidade da casa com peixe fresco', 8.50, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', true, 1, '["peixe", "crustáceos"]'),
-- Especialidades
('i2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222223', 'Empadão de Perdiz', 'Receita tradicional da casa', 24.00, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop', true, 1, '["glúten", "ovos"]'),
('i2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222223', 'Eisbein com Choucrute', 'Joelho de porco com chucrute alemão', 19.50, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', true, 2, null),
-- Sobremesas
('i2222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222224', 'Crepes Suzette', 'Crepes flambados com licor Grand Marnier', 12.00, 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop', true, 1, '["glúten", "ovos", "leite"]'),
('i2222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222224', 'Mousse de Avelã', 'Mousse cremosa de avelã', 8.50, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop', true, 2, '["frutos secos", "leite", "ovos"]');

-- Insert menu items for Casa do Bacalhau
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, display_order, allergens) VALUES
-- Entradas
('i3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333331', 'Pastéis de Bacalhau', 'Tradicionais pastéis de bacalhau (6 unidades)', 9.50, 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=300&fit=crop', true, 1, '["peixe", "glúten", "ovos"]'),
-- Bacalhau
('i3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332', 'Bacalhau à Brás', 'Bacalhau desfiado com batata palha e ovos', 16.50, 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop', true, 1, '["peixe", "ovos"]'),
('i3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332', 'Bacalhau com Natas', 'Bacalhau lascado com natas e batatas', 18.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop', true, 2, '["peixe", "leite"]'),
('i3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332', 'Bacalhau à Gomes de Sá', 'Receita tradicional do Porto', 17.50, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop', true, 3, '["peixe", "ovos"]); 