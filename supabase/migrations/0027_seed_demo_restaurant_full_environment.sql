-- =========================================================================
-- Trinetra Restaurant OS — Migration 0027
-- Full Showcase / Demo Restaurant Seeding Engine (Spice Garden Fine Dining)
-- Atomically seeds:
--  1. Demo Tenant ('1ab21b6e-d5ea-4395-81e4-ba2d06907194')
--  2. Demo Restaurant ('a3c3e5f7-36e7-4409-8a25-76e4f7f47213')
--  3. Restaurant Profile (Operational, wizard completed, FineDining, MultiCuisine)
--  4. Feature Flags (POS, KDS, QR, Inventory, Billing, CRM)
--  5. Settings & Taxes (CGST 2.5%, SGST 2.5%)
--  6. 3 Floors (Main Dining, Private Dining, Terrace)
--  7. 8 Tables (T-1..T-4, PD-1..PD-2, TR-1..TR-2)
--  8. 4 Staff Roles & PINs (Owner, Manager, Waiter, Cashier)
--  9. 5 Showcase Menu Categories
-- 10. 16 Showcase Menu Items with authentic pricing, base_price_cents & veg/non-veg flags
-- =========================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_restaurant_rpc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_id     UUID := '1ab21b6e-d5ea-4395-81e4-ba2d06907194';
    v_restaurant_id UUID := 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';
    v_owner_id      UUID := 'd1e2f3a4-5678-9012-3456-789012345678';
    v_manager_id    UUID := 'eabf167a-6fea-4331-81a3-0bc87ee54f5e';
    v_waiter_id     UUID := 'a5b835e8-9cf8-4944-b0da-0d111f329a23';
    v_cashier_id    UUID := 'c4d5e6f7-8901-2345-6789-0123456789ab';

    -- Deterministic Floor IDs
    v_floor_main    UUID := 'd1f10000-0000-0000-0000-000000000001';
    v_floor_private UUID := 'd1f10000-0000-0000-0000-000000000002';
    v_floor_terrace UUID := 'd1f10000-0000-0000-0000-000000000003';

    -- Deterministic Category IDs
    v_cat_starters  UUID := 'd1ca0000-0000-0000-0000-000000000001';
    v_cat_mains     UUID := 'd1ca0000-0000-0000-0000-000000000002';
    v_cat_biryani   UUID := 'd1ca0000-0000-0000-0000-000000000003';
    v_cat_breads    UUID := 'd1ca0000-0000-0000-0000-000000000004';
    v_cat_desserts  UUID := 'd1ca0000-0000-0000-0000-000000000005';
BEGIN
    IF current_setting('role', true) != 'service_role' AND coalesce(public.get_jwt_claim('role'), '') != 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only service_role can execute demo seeder';
    END IF;

    -- 1. Seed Tenant
    INSERT INTO public.tenants (id, name, slug, plan, status)
    VALUES (v_tenant_id, 'Spice Garden Group', 'spice-garden', 'pro', 'active')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

    -- 2. Seed Organization if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        EXECUTE 'INSERT INTO public.organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING v_tenant_id, 'Spice Garden Group';
    END IF;

    -- 3. Seed Restaurant
    INSERT INTO public.restaurants (
        id, tenant_id, organization_id, name, is_active
    ) VALUES (
        v_restaurant_id, v_tenant_id, v_tenant_id, 'Spice Garden Fine Dining', true
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;

    -- 4. Seed Restaurant Profile (Upsert to Operational & Wizard Completed)
    INSERT INTO public.restaurant_profiles (
        restaurant_id, tenant_id, status, wizard_step, wizard_completed, wizard_completed_at,
        restaurant_type, cuisine_type, email, phone, timezone, brand_theme, opening_time, closing_time, order_prefix, bill_prefix
    ) VALUES (
        v_restaurant_id, v_tenant_id, 'Operational', 8, true, now(),
        'FineDining', 'MultiCuisine', 'owner@spicegarden.com', '+91 98765 43210', 'Asia/Kolkata', 'amber', '11:00', '23:30', 'ORD', 'INV'
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET
        status = 'Operational',
        wizard_step = 8,
        wizard_completed = true,
        wizard_completed_at = now(),
        restaurant_type = 'FineDining',
        cuisine_type = 'MultiCuisine',
        brand_theme = 'amber',
        updated_at = now();

    -- 5. Seed Feature Flags
    INSERT INTO public.restaurant_feature_flags (
        restaurant_id, tenant_id, pos, kds, inventory, billing, crm, qr_ordering
    ) VALUES (
        v_restaurant_id, v_tenant_id, true, true, true, true, true, true
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET 
        pos = true, kds = true, inventory = true, billing = true, crm = true, qr_ordering = true;

    -- 6. Seed Settings & Taxes
    INSERT INTO public.restaurant_settings (
        restaurant_id, tenant_id, cgst_pct, sgst_pct, service_charge_pct, is_tax_inclusive
    ) VALUES (
        v_restaurant_id, v_tenant_id, 2.50, 2.50, 0.00, false
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET cgst_pct = 2.50, sgst_pct = 2.50, service_charge_pct = 0.00;

    -- 7. Seed Floors (3 Floors)
    INSERT INTO public.restaurant_floors (id, tenant_id, restaurant_id, name, display_order, is_active) VALUES
        (v_floor_main,    v_tenant_id, v_restaurant_id, 'Main Dining',    1, true),
        (v_floor_private, v_tenant_id, v_restaurant_id, 'Private Dining', 2, true),
        (v_floor_terrace, v_tenant_id, v_restaurant_id, 'Terrace',        3, true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order, is_active = true;

    -- 8. Seed Tables (8 Dining Tables - Schema Resilient)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_tables' AND column_name = 'floor_id') THEN
        EXECUTE '
            INSERT INTO public.restaurant_tables (id, tenant_id, restaurant_id, floor_id, table_number, is_active) VALUES
                (''d1b10000-0000-0000-0000-000000000001'', $1, $2, $3, ''T-1'',  true),
                (''d1b10000-0000-0000-0000-000000000002'', $1, $2, $3, ''T-2'',  true),
                (''d1b10000-0000-0000-0000-000000000003'', $1, $2, $3, ''T-3'',  true),
                (''d1b10000-0000-0000-0000-000000000004'', $1, $2, $3, ''T-4'',  true),
                (''d1b10000-0000-0000-0000-000000000005'', $1, $2, $4, ''PD-1'', true),
                (''d1b10000-0000-0000-0000-000000000006'', $1, $2, $4, ''PD-2'', true),
                (''d1b10000-0000-0000-0000-000000000007'', $1, $2, $5, ''TR-1'', true),
                (''d1b10000-0000-0000-0000-000000000008'', $1, $2, $5, ''TR-2'', true)
            ON CONFLICT (id) DO UPDATE SET 
                floor_id = EXCLUDED.floor_id, 
                table_number = EXCLUDED.table_number, 
                is_active = true;
        ' USING v_tenant_id, v_restaurant_id, v_floor_main, v_floor_private, v_floor_terrace;
    ELSE
        INSERT INTO public.restaurant_tables (id, tenant_id, restaurant_id, table_number, is_active) VALUES
            ('d1b10000-0000-0000-0000-000000000001', v_tenant_id, v_restaurant_id, 'T-1',  true),
            ('d1b10000-0000-0000-0000-000000000002', v_tenant_id, v_restaurant_id, 'T-2',  true),
            ('d1b10000-0000-0000-0000-000000000003', v_tenant_id, v_restaurant_id, 'T-3',  true),
            ('d1b10000-0000-0000-0000-000000000004', v_tenant_id, v_restaurant_id, 'T-4',  true),
            ('d1b10000-0000-0000-0000-000000000005', v_tenant_id, v_restaurant_id, 'PD-1', true),
            ('d1b10000-0000-0000-0000-000000000006', v_tenant_id, v_restaurant_id, 'PD-2', true),
            ('d1b10000-0000-0000-0000-000000000007', v_tenant_id, v_restaurant_id, 'TR-1', true),
            ('d1b10000-0000-0000-0000-000000000008', v_tenant_id, v_restaurant_id, 'TR-2', true)
        ON CONFLICT (id) DO UPDATE SET 
            table_number = EXCLUDED.table_number, 
            is_active = true;
    END IF;

    -- 9. Seed Staff Members
    BEGIN
        INSERT INTO public.restaurant_staff (id, tenant_id, restaurant_id, name, role, is_active) VALUES
            (v_owner_id,   v_tenant_id, v_restaurant_id, 'Vikram Sharma', 'owner',   true),
            (v_manager_id, v_tenant_id, v_restaurant_id, 'Suresh Mehta',  'manager', true),
            (v_waiter_id,  v_tenant_id, v_restaurant_id, 'Rajesh Kumar',  'waiter',  true),
            (v_cashier_id, v_tenant_id, v_restaurant_id, 'Anita Roy',     'cashier', true)
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name, is_active = true;
    EXCEPTION WHEN check_violation THEN
        INSERT INTO public.restaurant_staff (id, tenant_id, restaurant_id, name, role, is_active) VALUES
            (v_owner_id,   v_tenant_id, v_restaurant_id, 'Vikram Sharma', 'waiter',  true),
            (v_manager_id, v_tenant_id, v_restaurant_id, 'Suresh Mehta',  'waiter',  true),
            (v_waiter_id,  v_tenant_id, v_restaurant_id, 'Rajesh Kumar',  'waiter',  true),
            (v_cashier_id, v_tenant_id, v_restaurant_id, 'Anita Roy',     'kitchen', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;
    END;

    -- 10. Seed Staff PINs (Owner=9876, Manager=1234, Waiter=4321, Cashier=1122)
    INSERT INTO public.restaurant_staff_pins (staff_id, restaurant_id, pin_hash) VALUES
        (v_owner_id,   v_restaurant_id, '9876'),
        (v_manager_id, v_restaurant_id, '1234'),
        (v_waiter_id,  v_restaurant_id, '4321'),
        (v_cashier_id, v_restaurant_id, '1122')
    ON CONFLICT (staff_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, restaurant_id = EXCLUDED.restaurant_id;

    -- 11. Seed Menu Categories (5 Categories)
    INSERT INTO public.menu_categories (id, tenant_id, restaurant_id, name, display_order, is_active) VALUES
        (v_cat_starters, v_tenant_id, v_restaurant_id, 'Starters & Appetizers',     1, true),
        (v_cat_mains,    v_tenant_id, v_restaurant_id, 'Chef''s Signature Mains',   2, true),
        (v_cat_biryani,  v_tenant_id, v_restaurant_id, 'Biryani & Rice Delicacies', 3, true),
        (v_cat_breads,   v_tenant_id, v_restaurant_id, 'Tandoori Breads',          4, true),
        (v_cat_desserts, v_tenant_id, v_restaurant_id, 'Desserts & Beverages',      5, true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order, is_active = true;

    -- 12. Seed Menu Items (16 Items)
    INSERT INTO public.menu_items (
        id, tenant_id, restaurant_id, category_id, name, description, price, base_price_cents, is_veg, is_available, display_order
    ) VALUES
        -- Starters (3)
        ('d1170000-0000-0000-0000-000000000001', v_tenant_id, v_restaurant_id, v_cat_starters,
         'Murgh Malai Tikka', 'Tender chicken marinated with cream, cheese, and green cardamom', 340.00, 34000, false, true, 1),
        ('d1170000-0000-0000-0000-000000000002', v_tenant_id, v_restaurant_id, v_cat_starters,
         'Tandoori Paneer Angare', 'Spiced cottage cheese cubes charred to perfection in traditional tandoor', 290.00, 29000, true, true, 2),
        ('d1170000-0000-0000-0000-000000000003', v_tenant_id, v_restaurant_id, v_cat_starters,
         'Dahi Ke Kebab', 'Crispy melt-in-mouth hung yogurt patties with fresh mint and mild spices', 250.00, 25000, true, true, 3),

        -- Chef''s Signature Mains (4)
        ('d1170000-0000-0000-0000-000000000004', v_tenant_id, v_restaurant_id, v_cat_mains,
         'Butter Chicken Royale', 'Slow-simmered tandoori chicken cooked in a velvety tomato-butter gravy', 420.00, 42000, false, true, 1),
        ('d1170000-0000-0000-0000-000000000005', v_tenant_id, v_restaurant_id, v_cat_mains,
         'Paneer Lababdar', 'Cottage cheese simmered with onions, bell peppers, and royal cashew cream', 360.00, 36000, true, true, 2),
        ('d1170000-0000-0000-0000-000000000006', v_tenant_id, v_restaurant_id, v_cat_mains,
         'Dal Bukhara', 'Overnight slow-cooked black lentils simmered with white butter and cream', 290.00, 29000, true, true, 3),
        ('d1170000-0000-0000-0000-000000000007', v_tenant_id, v_restaurant_id, v_cat_mains,
         'Nalli Nihari', 'Slow-braised lamb shanks cooked in a deeply aromatic spiced meat broth', 480.00, 48000, false, true, 4),

        -- Biryani & Rice Delicacies (3)
        ('d1170000-0000-0000-0000-000000000008', v_tenant_id, v_restaurant_id, v_cat_biryani,
         'Hyderabadi Dum Gosht Biryani', 'Aged long-grain basmati layered with tender spiced mutton and saffron', 460.00, 46000, false, true, 1),
        ('d1170000-0000-0000-0000-000000000009', v_tenant_id, v_restaurant_id, v_cat_biryani,
         'Awadhi Subz Biryani', 'Fragrant basmati rice cooked with garden vegetables and aromatic spices', 320.00, 32000, true, true, 2),
        ('d1170000-0000-0000-0000-000000000010', v_tenant_id, v_restaurant_id, v_cat_biryani,
         'Jeera Ghee Rice', 'Fluffy steamed basmati rice tempered with roasted royal cumin and ghee', 190.00, 19000, true, true, 3),

        -- Tandoori Breads (3)
        ('d1170000-0000-0000-0000-000000000011', v_tenant_id, v_restaurant_id, v_cat_breads,
         'Garlic Butter Naan', 'Clay-oven baked refined flour bread brushed with garlic butter & herbs', 80.00, 8000, true, true, 1),
        ('d1170000-0000-0000-0000-000000000012', v_tenant_id, v_restaurant_id, v_cat_breads,
         'Laccha Paratha', 'Multi-layered crisp whole wheat flatbread layered with pure butter', 70.00, 7000, true, true, 2),
        ('d1170000-0000-0000-0000-000000000013', v_tenant_id, v_restaurant_id, v_cat_breads,
         'Roomali Roti', 'Hand-stretched paper-thin soft flatbread cooked over an inverted dome', 50.00, 5000, true, true, 3),

        -- Desserts & Beverages (3)
        ('d1170000-0000-0000-0000-000000000014', v_tenant_id, v_restaurant_id, v_cat_desserts,
         'Royal Kesar Phirni', 'Chilled slow-cooked ground rice pudding flavored with saffron and pistachios', 140.00, 14000, true, true, 1),
        ('d1170000-0000-0000-0000-000000000015', v_tenant_id, v_restaurant_id, v_cat_desserts,
         'Gulab Jamun with Rabdi', 'Warm golden milk dumplings soaked in rose syrup over chilled rabdi', 160.00, 16000, true, true, 2),
        ('d1170000-0000-0000-0000-000000000016', v_tenant_id, v_restaurant_id, v_cat_desserts,
         'Classic Mango Lassi', 'Rich and creamy churned yogurt smoothie blended with Alphonso mango pulp', 130.00, 13000, true, true, 3)
    ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        base_price_cents = EXCLUDED.base_price_cents,
        is_veg = EXCLUDED.is_veg,
        is_available = true,
        display_order = EXCLUDED.display_order;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'restaurant_id', v_restaurant_id,
        'status', 'Operational',
        'floors_count', 3,
        'tables_count', 8,
        'categories_count', 5,
        'items_count', 16,
        'staff_count', 4
    );
END;
$$;
