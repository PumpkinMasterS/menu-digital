-- Fix the previous migration and add missing modifiers
-- Delete existing items first to prevent duplicates

-- Delete existing data
DELETE FROM menu_item_modifiers;
DELETE FROM menu_modifier_options;
DELETE FROM menu_modifiers;
DELETE FROM menu_items WHERE restaurant_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- Add modifiers for the restaurants
INSERT INTO menu_modifiers (id, restaurant_id, name, description, type, is_required, min_selections, max_selections) VALUES
('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Acompanhamentos', 'Escolha o seu acompanhamento', 'single_choice', false, 0, 1),
('m2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Extras', 'Extras opcionais', 'multiple_choice', false, 0, 3),
('m3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Guarnições', 'Guarnições para bacalhau', 'single_choice', true, 1, 1);

-- Add modifier options
INSERT INTO menu_modifier_options (id, modifier_id, name, price, is_default) VALUES
-- Acompanhamentos Ramiro
('o1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 'Batatas Cozidas', 0.00, true),
('o1111111-1111-1111-1111-111111111112', 'm1111111-1111-1111-1111-111111111111', 'Batatas Fritas', 2.00, false),
('o1111111-1111-1111-1111-111111111113', 'm1111111-1111-1111-1111-111111111111', 'Legumes Grelhados', 3.50, false),
-- Extras Gambrinus
('o2222222-2222-2222-2222-222222222221', 'm2222222-2222-2222-2222-222222222222', 'Pão Extra', 2.00, false),
('o2222222-2222-2222-2222-222222222222', 'm2222222-2222-2222-2222-222222222222', 'Manteiga', 1.50, false),
('o2222222-2222-2222-2222-222222222223', 'm2222222-2222-2222-2222-222222222222', 'Azeite Especial', 2.50, false),
-- Guarnições Bacalhau
('o3333333-3333-3333-3333-333333333331', 'm3333333-3333-3333-3333-333333333333', 'Batata Palha', 0.00, true),
('o3333333-3333-3333-3333-333333333332', 'm3333333-3333-3333-3333-333333333333', 'Batatas Salteadas', 1.50, false),
('o3333333-3333-3333-3333-333333333333', 'm3333333-3333-3333-3333-333333333333', 'Grão-de-bico', 2.00, false);

-- Add menu items back with proper formatting
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, display_order, allergens) VALUES
-- Cervejaria Ramiro Items
('i1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Pão com Manteiga', 'Pão quente com manteiga', 3.50, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop', true, 1, '["glúten", "leite"]'),
('i1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Azeitonas Mistas', 'Azeitonas verdes e pretas temperadas', 4.50, 'https://images.unsplash.com/photo-1486588982564-9e9d1e89f4b1?w=400&h=300&fit=crop', true, 2, null),
('i1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Percebes', 'Percebes frescos do mar português', 28.00, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop', true, 1, '["crustáceos"]'),
('i1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Camarão Cozido', 'Camarão tigre cozido (kg)', 45.00, 'https://images.unsplash.com/photo-1633479389810-cc4bb4a82e6b?w=400&h=300&fit=crop', true, 2, '["crustáceos"]'),
('i1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Santola Cozida', 'Santola fresca cozida (unidade)', 35.00, 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop', true, 3, '["crustáceos"]'),
('i1111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113', 'Linguado Grelhado', 'Linguado fresco grelhado', 22.00, 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop', true, 1, '["peixe"]'),
('i1111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113', 'Polvo à Lagareiro', 'Polvo grelhado com azeite e alho', 18.50, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop', true, 2, '["moluscos"]'),

-- Gambrinus Items
('i2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222221', 'Ameijoas à Bulhão Pato', 'Ameijoas com coentros e alho', 14.50, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop', true, 1, '["moluscos"]'),
('i2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Sopa Rica de Peixe', 'Especialidade da casa com peixe fresco', 8.50, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', true, 1, '["peixe", "crustáceos"]'),
('i2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222223', 'Empadão de Perdiz', 'Receita tradicional da casa', 24.00, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop', true, 1, '["glúten", "ovos"]'),
('i2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222223', 'Eisbein com Choucrute', 'Joelho de porco com chucrute alemão', 19.50, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', true, 2, null),
('i2222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222224', 'Crepes Suzette', 'Crepes flambados com licor Grand Marnier', 12.00, 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop', true, 1, '["glúten", "ovos", "leite"]'),
('i2222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222224', 'Mousse de Avelã', 'Mousse cremosa de avelã', 8.50, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop', true, 2, '["frutos secos", "leite", "ovos"]'),

-- Casa do Bacalhau Items
('i3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333331', 'Pastéis de Bacalhau', 'Tradicionais pastéis de bacalhau (6 unidades)', 9.50, 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=300&fit=crop', true, 1, '["peixe", "glúten", "ovos"]'),
('i3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332', 'Bacalhau à Brás', 'Bacalhau desfiado com batata palha e ovos', 16.50, 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop', true, 1, '["peixe", "ovos"]'),
('i3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332', 'Bacalhau com Natas', 'Bacalhau lascado com natas e batatas', 18.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop', true, 2, '["peixe", "leite"]'),
('i3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332', 'Bacalhau à Gomes de Sá', 'Receita tradicional do Porto', 17.50, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop', true, 3, '["peixe", "ovos"]');

-- Link modifiers to menu items
INSERT INTO menu_item_modifiers (menu_item_id, modifier_id) VALUES
-- Ramiro modifiers
('i1111111-1111-1111-1111-111111111116', 'm1111111-1111-1111-1111-111111111111'), -- Linguado with acompanhamentos
('i1111111-1111-1111-1111-111111111117', 'm1111111-1111-1111-1111-111111111111'), -- Polvo with acompanhamentos
-- Gambrinus modifiers
('i2222222-2222-2222-2222-222222222223', 'm2222222-2222-2222-2222-222222222222'), -- Empadão with extras
('i2222222-2222-2222-2222-222222222224', 'm2222222-2222-2222-2222-222222222222'), -- Eisbein with extras
-- Bacalhau modifiers
('i3333333-3333-3333-3333-333333333332', 'm3333333-3333-3333-3333-333333333333'), -- Bacalhau à Brás with guarnições
('i3333333-3333-3333-3333-333333333333', 'm3333333-3333-3333-3333-333333333333'), -- Bacalhau com Natas with guarnições
('i3333333-3333-3333-3333-333333333334', 'm3333333-3333-3333-3333-333333333333'); -- Bacalhau à Gomes de Sá with guarnições

-- Update organization_id for all restaurants to ensure they belong to an existing organization
UPDATE restaurants 
SET organization_id = (SELECT id FROM organizations LIMIT 1) 
WHERE organization_id IS NULL AND name NOT LIKE '%Platform%'; 