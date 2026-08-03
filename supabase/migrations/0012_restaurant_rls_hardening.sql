-- =========================================================================
-- Trinetra Business OS - Restaurant RLS Security Hardening Migration
-- Migration file: 0012_restaurant_rls_hardening.sql
-- Description: Replaces permissive USING (true) policies with tenant-isolated,
-- role-aware Row Level Security (RLS) policies for all restaurant tables.
-- =========================================================================

-- Helper function to extract tenant_id safely from JWT or session claims
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 1. RESTAURANTS
DROP POLICY IF EXISTS restaurants_tenant_policy ON public.restaurants;
CREATE POLICY restaurants_tenant_policy ON public.restaurants
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 2. RESTAURANT TABLES (Public scanning allowed for active tables via table_token)
DROP POLICY IF EXISTS restaurant_tables_tenant_policy ON public.restaurant_tables;
CREATE POLICY restaurant_tables_tenant_select_policy ON public.restaurant_tables
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id() OR
    is_active = true
  );

CREATE POLICY restaurant_tables_tenant_write_policy ON public.restaurant_tables
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 3. RESTAURANT STAFF
DROP POLICY IF EXISTS restaurant_staff_tenant_policy ON public.restaurant_staff;
CREATE POLICY restaurant_staff_tenant_policy ON public.restaurant_staff
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 4. MENU CATEGORIES (Public read allowed for active categories)
DROP POLICY IF EXISTS menu_categories_tenant_policy ON public.menu_categories;
CREATE POLICY menu_categories_tenant_select_policy ON public.menu_categories
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id() OR
    is_active = true
  );

CREATE POLICY menu_categories_tenant_write_policy ON public.menu_categories
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 5. MENU ITEMS (Public read allowed for available items)
DROP POLICY IF EXISTS menu_items_tenant_policy ON public.menu_items;
CREATE POLICY menu_items_tenant_select_policy ON public.menu_items
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id() OR
    is_available = true
  );

CREATE POLICY menu_items_tenant_write_policy ON public.menu_items
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 6. RESTAURANT TABLE SESSIONS
DROP POLICY IF EXISTS restaurant_table_sessions_tenant_policy ON public.restaurant_table_sessions;
CREATE POLICY restaurant_table_sessions_tenant_policy ON public.restaurant_table_sessions
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 7. RESTAURANT ORDERS
DROP POLICY IF EXISTS restaurant_orders_tenant_policy ON public.restaurant_orders;
CREATE POLICY restaurant_orders_tenant_policy ON public.restaurant_orders
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 8. RESTAURANT ORDER ITEMS
DROP POLICY IF EXISTS restaurant_order_items_tenant_policy ON public.restaurant_order_items;
CREATE POLICY restaurant_order_items_tenant_policy ON public.restaurant_order_items
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 9. RESTAURANT ORDER EVENTS
DROP POLICY IF EXISTS restaurant_order_events_tenant_policy ON public.restaurant_order_events;
CREATE POLICY restaurant_order_events_tenant_policy ON public.restaurant_order_events
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 10. RESTAURANT BILLS
DROP POLICY IF EXISTS restaurant_bills_tenant_policy ON public.restaurant_bills;
CREATE POLICY restaurant_bills_tenant_policy ON public.restaurant_bills
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );

-- 11. RESTAURANT DISCOUNT AUDIT
DROP POLICY IF EXISTS restaurant_discount_audit_tenant_policy ON public.restaurant_discount_audit;
CREATE POLICY restaurant_discount_audit_tenant_policy ON public.restaurant_discount_audit
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    tenant_id = public.current_tenant_id()
  );
