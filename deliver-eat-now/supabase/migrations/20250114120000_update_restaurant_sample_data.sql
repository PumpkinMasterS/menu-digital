-- Migration: Update restaurant sample data with enhanced information
-- Created: 2025-01-14
-- Purpose: Add business hours, enhanced descriptions, and other modern UI data

-- Update existing restaurants with sample business hours and enhanced data
UPDATE restaurants 
SET 
  business_hours = jsonb_build_object(
    'monday', jsonb_build_object('isOpen', true, 'open', '10:00', 'close', '23:00'),
    'tuesday', jsonb_build_object('isOpen', true, 'open', '10:00', 'close', '23:00'),
    'wednesday', jsonb_build_object('isOpen', true, 'open', '10:00', 'close', '23:00'),
    'thursday', jsonb_build_object('isOpen', true, 'open', '10:00', 'close', '23:00'),
    'friday', jsonb_build_object('isOpen', true, 'open', '10:00', 'close', '00:00'),
    'saturday', jsonb_build_object('isOpen', true, 'open', '11:00', 'close', '00:30'),
    'sunday', jsonb_build_object('isOpen', true, 'open', '11:00', 'close', '22:30')
  ),
  delivery_time_min = CASE 
    WHEN name LIKE '%Cantinho%' THEN 25
    WHEN name LIKE '%Quinta%' THEN 30
    WHEN name LIKE '%Tasca%' THEN 20
    WHEN name LIKE '%Peixe%' THEN 35
    ELSE 25
  END,
  delivery_time_max = CASE 
    WHEN name LIKE '%Cantinho%' THEN 35
    WHEN name LIKE '%Quinta%' THEN 45
    WHEN name LIKE '%Tasca%' THEN 30
    WHEN name LIKE '%Peixe%' THEN 50
    ELSE 35
  END,
  rating = CASE 
    WHEN name LIKE '%Cantinho%' THEN 4.3
    WHEN name LIKE '%Quinta%' THEN 4.8
    WHEN name LIKE '%Tasca%' THEN 4.5
    WHEN name LIKE '%Peixe%' THEN 4.2
    ELSE 4.4
  END,
  delivery_fee = CASE 
    WHEN name LIKE '%Cantinho%' THEN 2.00
    WHEN name LIKE '%Quinta%' THEN 2.50
    WHEN name LIKE '%Tasca%' THEN 1.99
    WHEN name LIKE '%Peixe%' THEN 3.00
    ELSE 2.50
  END,
  minimum_order = CASE 
    WHEN name LIKE '%Cantinho%' THEN 12.00
    WHEN name LIKE '%Quinta%' THEN 25.00
    WHEN name LIKE '%Tasca%' THEN 10.00
    WHEN name LIKE '%Peixe%' THEN 20.00
    ELSE 15.00
  END,
  marketing_description = CASE 
    WHEN name LIKE '%Cantinho%' THEN 'Autêntica cozinha tradicional portuguesa com pratos caseiros e ambiente acolhedor. Especialidade em bacalhau à Brás e francesinha.'
    WHEN name LIKE '%Quinta%' THEN 'Experiência gastronómica premium com ingredientes frescos da quinta. Menu sazonal com vinhos selecionados e ambiente requintado.'
    WHEN name LIKE '%Tasca%' THEN 'Petiscos tradicionais e vinhos portugueses numa atmosfera descontraída. Perfeito para convívio entre amigos.'
    WHEN name LIKE '%Peixe%' THEN 'Frutos do mar frescos e peixes grelhados com vista para o mar. Especialidades da costa portuguesa.'
    ELSE 'Deliciosa comida portuguesa tradicional preparada com carinho e ingredientes frescos da região.'
  END
WHERE is_active = true;

-- Update specific restaurants with different weekend hours
UPDATE restaurants 
SET business_hours = jsonb_build_object(
  'monday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '01:00'),
  'tuesday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '01:00'),
  'wednesday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '01:00'),
  'thursday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '02:00'),
  'friday', jsonb_build_object('isOpen', true, 'open', '18:00', 'close', '03:00'),
  'saturday', jsonb_build_object('isOpen', true, 'open', '19:00', 'close', '03:00'),
  'sunday', jsonb_build_object('isOpen', false, 'open', '', 'close', '')
)
WHERE name LIKE '%Tasca%';

-- Update lunch restaurants with different hours
UPDATE restaurants 
SET business_hours = jsonb_build_object(
  'monday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '15:00'),
  'tuesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '15:00'),
  'wednesday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '15:00'),
  'thursday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '15:00'),
  'friday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '22:00'),
  'saturday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '22:00'),
  'sunday', jsonb_build_object('isOpen', true, 'open', '12:00', 'close', '20:00')
)
WHERE name LIKE '%Peixe%';

-- Add some sample banner URLs for restaurants that don't have them
UPDATE restaurants 
SET 
  banner_url = CASE 
    WHEN name LIKE '%Cantinho%' THEN 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop'
    WHEN name LIKE '%Quinta%' THEN 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=1920&h=1080&fit=crop'
    WHEN name LIKE '%Tasca%' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop'
    WHEN name LIKE '%Peixe%' THEN 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1920&h=1080&fit=crop'
    ELSE 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&h=1080&fit=crop'
  END
WHERE banner_url IS NULL OR banner_url = '';

-- Update restaurant logos if they don't exist
UPDATE restaurants 
SET 
  image_url = CASE 
    WHEN name LIKE '%Cantinho%' AND (image_url IS NULL OR image_url = '') THEN 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=200&h=200&fit=crop'
    WHEN name LIKE '%Quinta%' AND (image_url IS NULL OR image_url = '') THEN 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=200&h=200&fit=crop'
    WHEN name LIKE '%Tasca%' AND (image_url IS NULL OR image_url = '') THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop'
    WHEN name LIKE '%Peixe%' AND (image_url IS NULL OR image_url = '') THEN 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop'
    ELSE image_url
  END
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.business_hours IS 'JSONB object containing business hours for each day of the week';
COMMENT ON COLUMN restaurants.marketing_description IS 'Enhanced marketing description for customer-facing displays';
COMMENT ON COLUMN restaurants.delivery_time_min IS 'Minimum delivery time in minutes';
COMMENT ON COLUMN restaurants.delivery_time_max IS 'Maximum delivery time in minutes'; 