-- ============================================================================
-- MIGRATION: 0036_security_rls_and_leads_unique.sql
-- DESCRIPTION:
--   1. Enable RLS on public.tenants (resolving policy_exists_rls_disabled &
--      rls_disabled_in_public) and ensure no permissive public insert policy exists.
--   2. Enable RLS & revoke anon/authenticated grants on 15 legacy unused tables
--      (including public.users with email/pin_hash) and staff_login_ip_rate_limits.
--   3. Remove overly permissive bhash_webhook_logs_all policy and revoke client grants.
--   4. Revoke anon table grants on public.restaurant_profiles.
--   5. Replace permissive USING (true) policies on 0035 inventory/recipe tables
--      with strict tenant-scoped policies (crm_user_has_tenant_access / crm_user_can_write).
--   6. Add unique_phone_per_tenant (tenant_id, phone) on public.leads (fixes 42P10).
--   7. Pin search_path = public, pg_temp on helper/trigger functions and revoke
--      anon EXECUTE on admin/internal SECURITY DEFINER RPCs.
-- ============================================================================

BEGIN;

-- 1. Enable RLS on public.tenants (policies tenants_select & tenants_update already exist)
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_insert_admin" ON public.tenants;
REVOKE ALL ON TABLE public.tenants FROM anon;

-- 2. Enable RLS & lock down 15 unused legacy tables + rate-limit table
DO $$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    'organizations',
    'branches',
    'users',
    'user_branches',
    'tables',
    'floors',
    'categories',
    'modifier_groups',
    'modifier_options',
    'ingredients',
    'recipe_boms',
    'orders',
    'order_items',
    'payments',
    'reservations',
    'staff_login_ip_rate_limits'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', v_tbl);
    END IF;
  END LOOP;
END $$;

-- 3. Lock down bhash_webhook_logs (service_role only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bhash_webhook_logs'
  ) THEN
    ALTER TABLE public.bhash_webhook_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "bhash_webhook_logs_all" ON public.bhash_webhook_logs;
    REVOKE ALL ON TABLE public.bhash_webhook_logs FROM anon, authenticated;
  END IF;
END $$;

-- 4. Revoke excessive anon & DDL grants on restaurant_profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_profiles'
  ) THEN
    REVOKE ALL ON TABLE public.restaurant_profiles FROM anon;
    REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.restaurant_profiles FROM authenticated;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipped restaurant_profiles grant tightening (owned by another role)';
END $$;

-- 5. Tighten 0035 inventory, recipe & stock movement RLS to strict tenant isolation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_inventory_items'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated read on inventory items" ON public.restaurant_inventory_items;
    DROP POLICY IF EXISTS "Allow authenticated manage on inventory items" ON public.restaurant_inventory_items;
    DROP POLICY IF EXISTS "inventory_items_tenant_select" ON public.restaurant_inventory_items;
    DROP POLICY IF EXISTS "inventory_items_tenant_insert" ON public.restaurant_inventory_items;
    DROP POLICY IF EXISTS "inventory_items_tenant_update" ON public.restaurant_inventory_items;
    DROP POLICY IF EXISTS "inventory_items_tenant_delete" ON public.restaurant_inventory_items;

    CREATE POLICY "inventory_items_tenant_select" ON public.restaurant_inventory_items
      FOR SELECT TO authenticated
      USING (public.crm_user_has_tenant_access(tenant_id));
    CREATE POLICY "inventory_items_tenant_insert" ON public.restaurant_inventory_items
      FOR INSERT TO authenticated
      WITH CHECK (public.crm_user_can_write(tenant_id));
    CREATE POLICY "inventory_items_tenant_update" ON public.restaurant_inventory_items
      FOR UPDATE TO authenticated
      USING (public.crm_user_can_write(tenant_id))
      WITH CHECK (public.crm_user_can_write(tenant_id));
    CREATE POLICY "inventory_items_tenant_delete" ON public.restaurant_inventory_items
      FOR DELETE TO authenticated
      USING (public.crm_user_can_write(tenant_id));

    REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.restaurant_inventory_items FROM authenticated;
    REVOKE ALL ON TABLE public.restaurant_inventory_items FROM anon;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_recipe_items'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated read on recipe items" ON public.restaurant_recipe_items;
    DROP POLICY IF EXISTS "Allow authenticated manage on recipe items" ON public.restaurant_recipe_items;
    DROP POLICY IF EXISTS "recipe_items_tenant_select" ON public.restaurant_recipe_items;
    DROP POLICY IF EXISTS "recipe_items_tenant_insert" ON public.restaurant_recipe_items;
    DROP POLICY IF EXISTS "recipe_items_tenant_update" ON public.restaurant_recipe_items;
    DROP POLICY IF EXISTS "recipe_items_tenant_delete" ON public.restaurant_recipe_items;

    CREATE POLICY "recipe_items_tenant_select" ON public.restaurant_recipe_items
      FOR SELECT TO authenticated
      USING (public.crm_user_has_tenant_access(tenant_id));
    CREATE POLICY "recipe_items_tenant_insert" ON public.restaurant_recipe_items
      FOR INSERT TO authenticated
      WITH CHECK (public.crm_user_can_write(tenant_id));
    CREATE POLICY "recipe_items_tenant_update" ON public.restaurant_recipe_items
      FOR UPDATE TO authenticated
      USING (public.crm_user_can_write(tenant_id))
      WITH CHECK (public.crm_user_can_write(tenant_id));
    CREATE POLICY "recipe_items_tenant_delete" ON public.restaurant_recipe_items
      FOR DELETE TO authenticated
      USING (public.crm_user_can_write(tenant_id));

    REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.restaurant_recipe_items FROM authenticated;
    REVOKE ALL ON TABLE public.restaurant_recipe_items FROM anon;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'restaurant_stock_movements'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated read on stock movements" ON public.restaurant_stock_movements;
    DROP POLICY IF EXISTS "Allow authenticated manage on stock movements" ON public.restaurant_stock_movements;
    DROP POLICY IF EXISTS "stock_movements_tenant_select" ON public.restaurant_stock_movements;
    DROP POLICY IF EXISTS "stock_movements_tenant_insert" ON public.restaurant_stock_movements;

    CREATE POLICY "stock_movements_tenant_select" ON public.restaurant_stock_movements
      FOR SELECT TO authenticated
      USING (public.crm_user_has_tenant_access(tenant_id));
    CREATE POLICY "stock_movements_tenant_insert" ON public.restaurant_stock_movements
      FOR INSERT TO authenticated
      WITH CHECK (public.crm_user_can_write(tenant_id));

    REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.restaurant_stock_movements FROM authenticated;
    REVOKE ALL ON TABLE public.restaurant_stock_movements FROM anon;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipped inventory/recipe RLS tightening (owned by another role)';
END $$;

-- 6. Ensure leads has composite unique constraint (tenant_id, phone) for ON CONFLICT (fixes 42P10)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'unique_phone_per_tenant'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT unique_phone_per_tenant UNIQUE (tenant_id, phone);
  END IF;
END $$;

-- 7. Pin search_path on functions flagged by Supabase Security Advisor
DO $$
DECLARE
  v_sig text;
  v_funcs text[] := ARRAY[
    'public.sync_restaurant_session_to_lead_v2()',
    'public.sync_restaurant_session_to_lead()',
    'public.debug_postgrest_gucs()',
    'public.calculate_deal_annual_value()',
    'public.update_modified_column()',
    'public.get_current_tenant_id()',
    'public.update_bhash_modified_column()'
  ];
BEGIN
  FOREACH v_sig IN ARRAY v_funcs LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp;', v_sig);
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipped search_path for % (owned by another role)', v_sig;
      END;
    END IF;
  END LOOP;
END $$;

-- 8. Revoke anon EXECUTE on admin/internal SECURITY DEFINER RPCs
DO $$
DECLARE
  v_sig text;
  v_rpcs text[] := ARRAY[
    'public.debug_postgrest_gucs()',
    'public.sync_restaurant_session_to_lead()',
    'public.sync_restaurant_session_to_lead_v2()',
    'public.pair_terminal_device_rpc(uuid, uuid, text, text, text, text, uuid)',
    'public.provision_restaurant_rpc(text, text, text, text, uuid, text, text)',
    'public.revoke_terminal_device_rpc(uuid, uuid)',
    'public.seed_demo_restaurant_rpc()',
    'public.set_staff_pin_rpc(uuid, uuid, text)',
    'public.validate_restaurant_readiness_rpc(uuid)',
    'public.verify_staff_pin_rpc(uuid, text, text, text)'
  ];
BEGIN
  FOREACH v_sig IN ARRAY v_rpcs LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      BEGIN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon;', v_sig);
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipped revoke anon for % (owned by another role)', v_sig;
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;
