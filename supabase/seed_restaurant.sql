-- =========================================================================
-- Seed Script for Restaurant OS Module
-- Scoped to Default Tenant (00000000-0000-0000-0000-000000000001)
-- Run this in your Supabase SQL Editor
-- =========================================================================

-- 1. Insert Default Restaurant for Tenant
INSERT INTO public.restaurants (id, tenant_id, name, address, currency, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  '00000000-0000-0000-0000-000000000001', 
  'The Trinetra Bistro', 
  'Gorakhpur, UP, India', 
  'INR', 
  true
)
ON CONFLICT (tenant_id) DO UPDATE 
SET name = EXCLUDED.name, address = EXCLUDED.address;

-- 2. Insert Default Restaurant Tables
INSERT INTO public.restaurant_tables (id, tenant_id, restaurant_id, table_number, table_token, is_active)
VALUES 
  ('22222222-2222-2222-2222-222222222201', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Table 1', '55555555-5555-5555-5555-555555555501', true),
  ('22222222-2222-2222-2222-222222222202', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Table 2', '55555555-5555-5555-5555-555555555502', true),
  ('22222222-2222-2222-2222-222222222203', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Table 3', '55555555-5555-5555-5555-555555555503', true)
ON CONFLICT (tenant_id, restaurant_id, table_number) DO NOTHING;

-- 3. Insert Menu Categories
INSERT INTO public.menu_categories (id, tenant_id, restaurant_id, name, display_order, is_active)
VALUES 
  ('33333333-3333-3333-3333-333333333301', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Starters', 1, true),
  ('33333333-3333-3333-3333-333333333302', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Main Course', 2, true),
  ('33333333-3333-3333-3333-333333333303', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Beverages', 3, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Menu Items
INSERT INTO public.menu_items (id, tenant_id, restaurant_id, category_id, name, description, price, is_available, is_veg, display_order)
VALUES 
  ('44444444-4444-4444-4444-444444444401', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301', 'Paneer Tikka', 'Tandoor grilled marinated cottage cheese cubes with bell peppers', 249.00, true, true, 1),
  ('44444444-4444-4444-4444-444444444402', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301', 'Crispy Corn', 'Sweet corn kernels tossed with spices, garlic and spring onion', 189.00, true, true, 2),
  ('44444444-4444-4444-4444-444444444403', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302', 'Paneer Butter Masala', 'Rich, creamy and sweetish onion-tomato gravy with soft paneer cubes', 299.00, true, true, 1),
  ('44444444-4444-4444-4444-444444444404', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302', 'Butter Naan', 'Leavened clay-oven baked flatbread topped with butter', 49.00, true, true, 2),
  ('44444444-4444-4444-4444-444444444405', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303', 'Virgin Mojito', 'Refreshing lime and mint fizzy beverage with brown sugar', 129.00, true, true, 1),
  ('44444444-4444-4444-4444-444444444406', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303', 'Cold Coffee', 'Thick creamy blended coffee with dark chocolate drizzle', 149.00, true, true, 2)
ON CONFLICT (id) DO NOTHING;
